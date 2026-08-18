import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import type { Providers } from '../providers/types.js';
import type { AppointmentDetails, TelegramUser } from '../types.js';
import { assertSlotBookable, pickAnyDoctorSlot } from './availability.js';

function validateDateTime(date: string, startTime: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError('Invalid date format', 400, 'VALIDATION_ERROR');
  }
  if (!/^\d{2}:\d{2}$/.test(startTime)) {
    throw new AppError('Invalid time format', 400, 'VALIDATION_ERROR');
  }
}

function notify(
  providers: Providers,
  kind: 'appointment_created' | 'appointment_cancelled' | 'appointment_rescheduled' | 'appointment_confirmed',
  appointment: AppointmentDetails,
  title: string,
  body: string,
): void {
  providers.notifications.enqueue({
    patientId: appointment.patient_id,
    kind,
    title,
    body,
  });
}

export function createAppointment(
  providers: Providers,
  params: {
    user: TelegramUser;
    patientId?: number;
    serviceId: number;
    doctorId?: number | null;
    date: string;
    startTime: string;
    treatmentPlanItemId?: number | null;
    recallId?: number | null;
    now?: Date;
    asAdmin?: boolean;
  },
): AppointmentDetails {
  validateDateTime(params.date, params.startTime);

  return providers.transaction(() => {
    const owner = params.asAdmin ? undefined : providers.patients.upsertTelegramOwner(params.user);
    const patient = params.asAdmin
      ? providers.patients.getById(params.patientId ?? 0)
      : params.patientId
        ? providers.patients.assertFamilyAccess(params.user.id, params.patientId)
        : owner!.patient;
    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    const item = params.treatmentPlanItemId ? providers.treatmentPlans.getItem(params.treatmentPlanItemId) : undefined;
    if (params.treatmentPlanItemId && !item) {
      throw new AppError('Treatment plan item not found', 404, 'TREATMENT_ITEM_NOT_FOUND');
    }
    if (item) {
      const plan = providers.treatmentPlans.getById(item.treatment_plan_id);
      if (!plan || plan.patient_id !== patient.id) {
        throw new AppError('Treatment plan item does not belong to this patient', 403, 'TREATMENT_ITEM_FORBIDDEN');
      }
      if (item.status !== 'planned') {
        throw new AppError('Treatment item is not available for booking', 409, 'TREATMENT_ITEM_NOT_PLANNED');
      }
      if (item.prerequisite_item_id) {
        const prerequisite = providers.treatmentPlans.getItem(item.prerequisite_item_id);
        if (prerequisite && prerequisite.status !== 'completed') {
          throw new AppError('Previous treatment step must be completed first', 409, 'PREREQUISITE_NOT_COMPLETED');
        }
      }
    }

    const booked = params.doctorId
      ? assertSlotBookable(providers, {
          serviceId: params.serviceId,
          doctorId: params.doctorId,
          date: params.date,
          startTime: params.startTime,
          now: params.now,
        })
      : pickAnyDoctorSlot(providers, {
          serviceId: params.serviceId,
          date: params.date,
          startTime: params.startTime,
          now: params.now,
        });

    const appointment = providers.appointments.insert({
      patient_id: patient.id,
      doctor_id: booked.doctor.id,
      service_id: booked.service.id,
      room_id: booked.room.id,
      location_id: booked.doctor.location_id,
      treatment_plan_item_id: item?.id ?? null,
      recall_id: params.recallId ?? null,
      appointment_date: params.date,
      start_time: params.startTime,
      end_time: booked.endTime,
      duration_minutes: booked.durationMinutes,
      status: 'scheduled',
      price: item?.estimated_price ?? booked.service.price,
      notes: item ? `Этап плана: ${item.title}` : '',
    });
    providers.appointments.addHistory({
      appointment_id: appointment.id,
      from_status: null,
      to_status: 'scheduled',
      note: item ? 'Запись на этап лечения' : 'Новая запись',
    });

    if (item) {
      providers.treatmentPlans.updateItem(item.id, {
        status: 'scheduled',
        appointment_id: appointment.id,
      });
      providers.events.publish('treatment_item.scheduled', {
        treatmentPlanItemId: item.id,
        appointmentId: appointment.id,
      });
    }

    if (params.recallId) {
      const recall = providers.recalls.getById(params.recallId);
      if (recall && recall.patient_id === patient.id) {
        providers.recalls.update(recall.id, { status: 'booked' });
      }
    }

    providers.events.publish('appointment.created', { appointmentId: appointment.id, patientId: patient.id });
    notify(
      providers,
      'appointment_created',
      appointment,
      'Запись создана',
      `${appointment.service_name} — ${appointment.appointment_date} ${appointment.start_time}`,
    );
    logger.info('Appointment created', { appointmentId: appointment.id, patientId: patient.id });
    return providers.appointments.getById(appointment.id)!;
  });
}

export function bookTreatmentItem(
  providers: Providers,
  params: {
    user: TelegramUser;
    itemId: number;
    doctorId?: number | null;
    date: string;
    startTime: string;
    now?: Date;
  },
): AppointmentDetails {
  const item = providers.treatmentPlans.getItem(params.itemId);
  if (!item) {
    throw new AppError('Treatment plan item not found', 404, 'TREATMENT_ITEM_NOT_FOUND');
  }
  const plan = providers.treatmentPlans.getById(item.treatment_plan_id);
  if (!plan) {
    throw new AppError('Treatment plan not found', 404, 'TREATMENT_PLAN_NOT_FOUND');
  }
  providers.patients.assertFamilyAccess(params.user.id, plan.patient_id);
  return createAppointment(providers, {
    user: params.user,
    patientId: plan.patient_id,
    serviceId: item.service_id,
    doctorId: params.doctorId,
    date: params.date,
    startTime: params.startTime,
    treatmentPlanItemId: item.id,
    now: params.now,
  });
}

export function cancelAppointment(
  providers: Providers,
  params: { user?: TelegramUser; appointmentId: number; asAdmin?: boolean; note?: string },
): AppointmentDetails {
  return providers.transaction(() => {
    const appointment = providers.appointments.getById(params.appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (!params.asAdmin && params.user) {
      providers.patients.assertFamilyAccess(params.user.id, appointment.patient_id);
    }
    if (appointment.status === 'cancelled') {
      return appointment;
    }
    if (appointment.status === 'completed') {
      throw new AppError('Completed appointment cannot be cancelled', 409, 'APPOINTMENT_LOCKED');
    }

    const updated = providers.appointments.update(appointment.id, { status: 'cancelled' });
    providers.appointments.addHistory({
      appointment_id: appointment.id,
      from_status: appointment.status,
      to_status: 'cancelled',
      note: params.note || 'Отмена записи',
    });

    if (appointment.treatment_plan_item_id) {
      const item = providers.treatmentPlans.getItem(appointment.treatment_plan_item_id);
      if (item && item.status === 'scheduled') {
        providers.treatmentPlans.updateItem(item.id, { status: 'planned', appointment_id: null });
      }
    }
    if (appointment.recall_id) {
      const recall = providers.recalls.getById(appointment.recall_id);
      if (recall && recall.status === 'booked') {
        providers.recalls.update(recall.id, { status: 'due' });
      }
    }

    providers.events.publish('appointment.cancelled', { appointmentId: appointment.id });
    notify(providers, 'appointment_cancelled', updated, 'Запись отменена', updated.service_name);
    return updated;
  });
}

export function rescheduleAppointment(
  providers: Providers,
  params: {
    user?: TelegramUser;
    appointmentId: number;
    date: string;
    startTime: string;
    doctorId?: number | null;
    asAdmin?: boolean;
    now?: Date;
  },
): AppointmentDetails {
  validateDateTime(params.date, params.startTime);
  return providers.transaction(() => {
    const appointment = providers.appointments.getById(params.appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (!params.asAdmin && params.user) {
      providers.patients.assertFamilyAccess(params.user.id, appointment.patient_id);
    }
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      throw new AppError('Appointment cannot be rescheduled', 409, 'APPOINTMENT_LOCKED');
    }

    const booked = params.doctorId
      ? assertSlotBookable(providers, {
          serviceId: appointment.service_id,
          doctorId: params.doctorId,
          date: params.date,
          startTime: params.startTime,
          now: params.now,
          ignoreAppointmentId: appointment.id,
        })
      : pickAnyDoctorSlot(providers, {
          serviceId: appointment.service_id,
          date: params.date,
          startTime: params.startTime,
          now: params.now,
          ignoreAppointmentId: appointment.id,
        });

    const updated = providers.appointments.update(appointment.id, {
      doctor_id: booked.doctor.id,
      room_id: booked.room.id,
      appointment_date: params.date,
      start_time: params.startTime,
      end_time: booked.endTime,
      duration_minutes: booked.durationMinutes,
      status: 'scheduled',
    });
    providers.appointments.addHistory({
      appointment_id: appointment.id,
      from_status: appointment.status,
      to_status: 'scheduled',
      note: `Перенос на ${params.date} ${params.startTime}`,
    });
    providers.events.publish('appointment.rescheduled', { appointmentId: appointment.id });
    notify(
      providers,
      'appointment_rescheduled',
      updated,
      'Запись перенесена',
      `${updated.appointment_date} ${updated.start_time}`,
    );
    return updated;
  });
}

export function confirmAppointment(providers: Providers, appointmentId: number): AppointmentDetails {
  return providers.transaction(() => {
    const appointment = providers.appointments.getById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (appointment.status !== 'scheduled') {
      throw new AppError('Only scheduled appointments can be confirmed', 409, 'INVALID_STATUS');
    }
    const updated = providers.appointments.update(appointmentId, { status: 'confirmed' });
    providers.appointments.addHistory({
      appointment_id: appointmentId,
      from_status: 'scheduled',
      to_status: 'confirmed',
      note: 'Подтверждено',
    });
    notify(providers, 'appointment_confirmed', updated, 'Визит подтверждён', updated.service_name);
    return updated;
  });
}

export function markNoShow(providers: Providers, appointmentId: number): AppointmentDetails {
  return providers.transaction(() => {
    const appointment = providers.appointments.getById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      throw new AppError('Appointment cannot be marked as no-show', 409, 'APPOINTMENT_LOCKED');
    }
    const updated = providers.appointments.update(appointmentId, { status: 'no_show' });
    providers.appointments.addHistory({
      appointment_id: appointmentId,
      from_status: appointment.status,
      to_status: 'no_show',
      note: 'Пациент не пришёл',
    });
    if (appointment.treatment_plan_item_id) {
      const item = providers.treatmentPlans.getItem(appointment.treatment_plan_item_id);
      if (item && item.status === 'scheduled') {
        providers.treatmentPlans.updateItem(item.id, { status: 'planned', appointment_id: null });
      }
    }
    return updated;
  });
}

export { SlotUnavailableError } from './availability.js';
