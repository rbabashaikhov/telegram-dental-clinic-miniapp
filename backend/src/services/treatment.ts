import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import type { Providers } from '../providers/types.js';
import type { AppointmentDetails, TreatmentPlanDetails, TreatmentRecordDetails } from '../types.js';
import { addDaysIso, todayDateString } from './time.js';

export function recalculatePlanProgress(providers: Providers, planId: number): TreatmentPlanDetails {
  const plan = providers.treatmentPlans.getById(planId);
  if (!plan) {
    throw new AppError('Treatment plan not found', 404, 'TREATMENT_PLAN_NOT_FOUND');
  }
  const items = plan.items.filter((item) => item.status !== 'cancelled');
  const allCompleted = items.length > 0 && items.every((item) => item.status === 'completed');
  const anyCompleted = items.some((item) => item.status === 'completed' || item.status === 'scheduled' || item.status === 'in_progress');
  let status = plan.status;
  if (plan.status !== 'cancelled') {
    if (allCompleted) status = 'completed';
    else if (anyCompleted && (plan.status === 'accepted' || plan.status === 'proposed' || plan.status === 'in_progress')) {
      status = 'in_progress';
    }
  }
  return providers.treatmentPlans.update(plan.id, { status });
}

export function completeAppointment(
  providers: Providers,
  params: {
    appointmentId: number;
    summary?: string;
    recommendations?: string;
    now?: Date;
    failAfterAppointment?: boolean;
  },
): { appointment: AppointmentDetails; record: TreatmentRecordDetails; plan?: TreatmentPlanDetails } {
  return providers.transaction(() => {
    const appointment = providers.appointments.getById(params.appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (appointment.status === 'completed') {
      const existing = providers.treatmentRecords.list({ appointmentId: appointment.id })[0];
      if (existing) {
        return {
          appointment,
          record: existing,
          plan: appointment.treatment_plan_item_id
            ? providers.treatmentPlans.getById(
                providers.treatmentPlans.getItem(appointment.treatment_plan_item_id)!.treatment_plan_id,
              )
            : undefined,
        };
      }
    }
    if (appointment.status === 'cancelled') {
      throw new AppError('Cancelled appointment cannot be completed', 409, 'APPOINTMENT_LOCKED');
    }

    const updated = providers.appointments.update(appointment.id, { status: 'completed' });
    providers.appointments.addHistory({
      appointment_id: appointment.id,
      from_status: appointment.status,
      to_status: 'completed',
      note: 'Визит завершён',
    });

    if (params.failAfterAppointment) {
      throw new AppError('Forced completion failure', 500, 'FORCED_FAILURE');
    }

    let item = appointment.treatment_plan_item_id
      ? providers.treatmentPlans.getItem(appointment.treatment_plan_item_id)
      : undefined;

    if (item) {
      item = providers.treatmentPlans.updateItem(item.id, { status: 'completed' });
      providers.events.publish('treatment_item.completed', {
        treatmentPlanItemId: item.id,
        appointmentId: appointment.id,
      });
      if (item.tooth_id) {
        providers.dentalChart.upsertTooth({
          patient_id: appointment.patient_id,
          tooth_id: item.tooth_id,
          state: 'treated',
          problem: '',
          recommended_service_id: null,
          notes: `Лечение завершено ${appointment.appointment_date}`,
        });
      }
    }

    const record = providers.treatmentRecords.insert({
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      tooth_id: item?.tooth_id ?? appointment.tooth_id,
      service_id: appointment.service_id,
      doctor_id: appointment.doctor_id,
      performed_at: appointment.appointment_date,
      summary: params.summary || `${appointment.service_name} выполнено.`,
      recommendations: params.recommendations || '',
      price: appointment.price,
      treatment_plan_item_id: item?.id ?? null,
    });

    let plan: TreatmentPlanDetails | undefined;
    if (item) {
      plan = recalculatePlanProgress(providers, item.treatment_plan_id);
      if (plan.status === 'completed') {
        providers.events.publish('treatment_plan.completed', { treatmentPlanId: plan.id });
      }
      const next = plan.items.find((row) => row.status === 'planned');
      if (next) {
        providers.notifications.enqueue({
          patientId: appointment.patient_id,
          kind: 'treatment_step_available',
          title: 'Следующий этап лечения',
          body: next.title,
        });
      }
    }

    const service = providers.services.getById(appointment.service_id);
    if (service?.repeatable && service.specialty === 'hygienist') {
      const due = addDaysIso(appointment.appointment_date, 180);
      providers.recalls.insert({
        patient_id: appointment.patient_id,
        type: 'hygiene',
        due_at: due,
        status: 'scheduled',
        related_service_id: service.id,
        related_treatment_plan_id: item?.treatment_plan_id ?? null,
        title: service.name,
        notes: 'Рекомендуется через 6 месяцев',
      });
      providers.events.publish('recall.created', { patientId: appointment.patient_id, dueAt: due });
    }

    if (appointment.recall_id) {
      providers.recalls.update(appointment.recall_id, { status: 'completed' });
    }

    providers.events.publish('appointment.completed', { appointmentId: appointment.id, recordId: record.id });
    logger.info('Appointment completed', { appointmentId: appointment.id, recordId: record.id });
    return { appointment: updated, record, plan };
  });
}

export function createTreatmentPlan(
  providers: Providers,
  params: {
    patientId: number;
    title: string;
    notes?: string;
    items: Array<{
      serviceId: number;
      title: string;
      description?: string;
      toothId?: string | null;
      estimatedPrice: number;
      recommendedBefore?: string | null;
    }>;
  },
): TreatmentPlanDetails {
  return providers.transaction(() => {
    const patient = providers.patients.getById(params.patientId);
    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }
    const estimated = params.items.reduce((sum, item) => sum + item.estimatedPrice, 0);
    const plan = providers.treatmentPlans.create({
      patient_id: patient.id,
      title: params.title,
      status: 'proposed',
      accepted_at: null,
      estimated_total: estimated,
      paid_total: 0,
      notes: params.notes || '',
    });
    params.items.forEach((item, index) => {
      const service = providers.services.getById(item.serviceId);
      if (!service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }
      providers.treatmentPlans.createItem({
        treatment_plan_id: plan.id,
        tooth_id: item.toothId ?? null,
        service_id: service.id,
        title: item.title,
        description: item.description || '',
        doctor_specialty: service.specialty,
        estimated_price: item.estimatedPrice,
        status: 'planned',
        sort_order: index + 1,
        recommended_before: item.recommendedBefore ?? null,
        prerequisite_item_id: null,
        appointment_id: null,
      });
    });
    providers.events.publish('treatment_plan.created', { treatmentPlanId: plan.id });
    providers.payments.upsertInvoice({
      patient_id: patient.id,
      treatment_plan_id: plan.id,
      total: estimated,
      paid_total: 0,
      status: 'open',
    });
    return providers.treatmentPlans.getById(plan.id)!;
  });
}

export function acceptTreatmentPlan(providers: Providers, planId: number, now = new Date()): TreatmentPlanDetails {
  const plan = providers.treatmentPlans.getById(planId);
  if (!plan) {
    throw new AppError('Treatment plan not found', 404, 'TREATMENT_PLAN_NOT_FOUND');
  }
  const updated = providers.treatmentPlans.update(planId, {
    status: plan.status === 'in_progress' ? 'in_progress' : 'accepted',
    accepted_at: todayDateString(now),
  });
  providers.events.publish('treatment_plan.accepted', { treatmentPlanId: planId });
  return updated;
}

export function markPlanPaid(
  providers: Providers,
  params: { planId: number; amount: number },
): TreatmentPlanDetails {
  return providers.transaction(() => {
    const plan = providers.treatmentPlans.getById(params.planId);
    if (!plan) {
      throw new AppError('Treatment plan not found', 404, 'TREATMENT_PLAN_NOT_FOUND');
    }
    const paidTotal = plan.paid_total + params.amount;
    providers.payments.insert({
      patient_id: plan.patient_id,
      treatment_plan_id: plan.id,
      appointment_id: null,
      amount: params.amount,
      status: 'paid',
      method: 'mock',
    });
    const invoiceStatus = paidTotal >= plan.estimated_total ? 'paid' : 'open';
    providers.payments.upsertInvoice({
      patient_id: plan.patient_id,
      treatment_plan_id: plan.id,
      total: plan.estimated_total,
      paid_total: paidTotal,
      status: invoiceStatus,
    });
    return providers.treatmentPlans.update(plan.id, { paid_total: paidTotal });
  });
}
