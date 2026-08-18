import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import type {
  AppointmentDetails,
  Clinic,
  DentalChart,
  Doctor,
  FamilyMember,
  Patient,
  PatientForm,
  RecallDetails,
  Service,
  TreatmentPlanDetails,
  TreatmentPlanItemDetails,
  TreatmentRecordDetails,
} from '../types.js';
import { todayDateString } from './time.js';

export interface PatientPortal {
  clinic: Clinic;
  patient: Patient;
  family: FamilyMember[];
  nextAppointment: AppointmentDetails | null;
  treatmentPlan: TreatmentPlanDetails | null;
  nextRecommendedItem: TreatmentPlanItemDetails | null;
  recalls: RecallDetails[];
  chart: DentalChart;
  history: TreatmentRecordDetails[];
}

export function resolvePatient(providers: Providers, telegramUserId: number, patientId?: number): Patient {
  const owner = providers.patients.getByTelegramUserId(telegramUserId);
  if (!owner && !patientId) {
    throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
  }
  if (patientId) {
    return providers.patients.assertFamilyAccess(telegramUserId, patientId);
  }
  const family = providers.patients.listFamily(telegramUserId);
  const primary = family.find((member) => member.is_primary)?.patient;
  return primary ?? owner!;
}

export function getPortal(
  providers: Providers,
  telegramUserId: number,
  patientId?: number,
  now = new Date(),
): PatientPortal {
  const patient = resolvePatient(providers, telegramUserId, patientId);
  const today = todayDateString(now);
  const appointments = providers.appointments
    .list({ patientId: patient.id })
    .filter((row) => row.status === 'scheduled' || row.status === 'confirmed')
    .sort((a, b) => `${a.appointment_date}${a.start_time}`.localeCompare(`${b.appointment_date}${b.start_time}`));
  const nextAppointment =
    appointments.find((row) => row.appointment_date > today || row.appointment_date === today) ?? appointments[0] ?? null;
  const plans = providers.treatmentPlans.list({ patientId: patient.id });
  const treatmentPlan =
    plans.find((plan) => plan.status === 'in_progress') ??
    plans.find((plan) => plan.status === 'accepted') ??
    plans.find((plan) => plan.status === 'proposed') ??
    plans[0] ??
    null;
  const nextRecommendedItem =
    treatmentPlan?.items.find((item) => item.status === 'planned' && !item.appointment_id) ?? null;
  const recalls = providers.recalls
    .list({ patientId: patient.id })
    .filter((row) => row.status === 'scheduled' || row.status === 'due')
    .map((row) =>
      row.status === 'scheduled' && row.due_at <= today ? providers.recalls.update(row.id, { status: 'due' }) : row,
    );

  return {
    clinic: providers.clinic.getClinic(),
    patient,
    family: providers.patients.listFamily(telegramUserId),
    nextAppointment,
    treatmentPlan,
    nextRecommendedItem,
    recalls,
    chart: providers.dentalChart.getChart(patient.id),
    history: providers.treatmentRecords.list({ patientId: patient.id }),
  };
}

export function listCatalog(providers: Providers): { doctors: Doctor[]; services: Service[] } {
  return {
    doctors: providers.doctors.list(true),
    services: providers.services.list(true),
  };
}

export function getPatientForm(providers: Providers, patientId: number): PatientForm {
  return (
    providers.patients.getForm(patientId) ?? {
      id: 0,
      patient_id: patientId,
      allergies: '',
      medications: '',
      chronic_conditions: '',
      pregnancy: false,
      previous_surgery: '',
      notes: '',
      updated_at: '',
    }
  );
}
