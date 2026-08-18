export interface AppConfig {
  businessName: string;
  appTitle: string;
  appDescription: string;
  timezone: string;
  demoMode: boolean;
  adminProtected: boolean;
  branding: { accent: string; logoUrl: string | null };
  features: { demoTour: boolean; demoAdminPreview: boolean };
}

export type SpecialtyCode =
  | 'therapist'
  | 'hygienist'
  | 'orthodontist'
  | 'implantologist'
  | 'pediatric';

export type TreatmentPlanStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TreatmentPlanItemStatus =
  | 'planned'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type ToothState =
  | 'healthy'
  | 'treatment_required'
  | 'treatment_planned'
  | 'treated'
  | 'crown'
  | 'implant'
  | 'missing';

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  relation: string;
}

export interface FamilyMember {
  id: number;
  patient_id: number;
  relation: string;
  is_primary: boolean;
  patient: Patient;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: SpecialtyCode;
  bio: string;
  active: boolean;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  specialty: SpecialtyCode;
  visit_reason: string | null;
  repeatable: boolean;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  service_id: number;
  room_id: number | null;
  location_id: number;
  treatment_plan_item_id: number | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  price: number;
  patient_name: string;
  doctor_name: string;
  doctor_specialty: SpecialtyCode;
  service_name: string;
  location_name: string;
  room_name: string | null;
  treatment_item_title: string | null;
  tooth_id: string | null;
}

export interface TreatmentPlanItem {
  id: number;
  treatment_plan_id: number;
  tooth_id: string | null;
  service_id: number;
  title: string;
  description: string;
  doctor_specialty: SpecialtyCode;
  estimated_price: number;
  status: TreatmentPlanItemStatus;
  sort_order: number;
  recommended_before: string | null;
  prerequisite_item_id: number | null;
  appointment_id: number | null;
  service_name: string;
  appointment?: Appointment | null;
}

export interface TreatmentPlan {
  id: number;
  patient_id: number;
  title: string;
  status: TreatmentPlanStatus;
  created_at: string;
  accepted_at: string | null;
  estimated_total: number;
  paid_total: number;
  notes: string;
  items: TreatmentPlanItem[];
  completed_items: number;
  total_items: number;
  progress_percent: number;
  outstanding_total: number;
}

export interface Tooth {
  id: number;
  patient_id: number;
  tooth_id: string;
  state: ToothState;
  problem: string;
  recommended_service_id: number | null;
  notes: string;
  recommended_service_name: string | null;
  recommended_price: number | null;
  latest_record?: TreatmentRecord | null;
}

export interface DentalChart {
  patient_id: number;
  teeth: Tooth[];
}

export interface TreatmentRecord {
  id: number;
  patient_id: number;
  appointment_id: number | null;
  tooth_id: string | null;
  service_id: number;
  doctor_id: number;
  performed_at: string;
  summary: string;
  recommendations: string;
  price: number;
  treatment_plan_item_id: number | null;
  service_name: string;
  doctor_name: string;
  patient_name: string;
}

export interface Recall {
  id: number;
  patient_id: number;
  type: string;
  due_at: string;
  status: string;
  related_service_id: number | null;
  title: string;
  notes: string;
  service_name: string | null;
}

export interface PatientForm {
  allergies: string;
  medications: string;
  chronic_conditions: string;
  pregnancy: boolean;
  previous_surgery: string;
  notes: string;
}

export interface Clinic {
  name: string;
  description: string;
  phone: string;
  address: string;
}

export interface Portal {
  clinic: Clinic;
  patient: Patient;
  family: FamilyMember[];
  nextAppointment: Appointment | null;
  treatmentPlan: TreatmentPlan | null;
  nextRecommendedItem: TreatmentPlanItem | null;
  recalls: Recall[];
  chart: DentalChart;
  history: TreatmentRecord[];
}

export interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  doctor_id: number;
  doctor_name: string;
  room_id: number | null;
  room_name: string | null;
}

export interface UnscheduledItem {
  item: TreatmentPlanItem;
  patient: Patient;
  days_waiting: number;
  recommended_before: string | null;
}

export interface AdminDashboard {
  today: string;
  appointments: {
    today: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
  booked_revenue: number;
  treatment_plans_in_progress: number;
  unscheduled_treatment_value: number;
  unscheduled_count: number;
  recall_due: number;
  funnel: {
    created: number;
    accepted: number;
    in_progress: number;
    completed: number;
  };
}

export const SPECIALTY_LABEL: Record<SpecialtyCode, string> = {
  therapist: 'Терапевт',
  hygienist: 'Гигиенист',
  orthodontist: 'Ортодонт',
  implantologist: 'Имплантолог',
  pediatric: 'Детский стоматолог',
};

export const TOOTH_STATE_LABEL: Record<ToothState, string> = {
  healthy: 'Здоровый',
  treatment_required: 'Требуется лечение',
  treatment_planned: 'Запланировано лечение',
  treated: 'Вылечен',
  crown: 'Коронка',
  implant: 'Имплантат',
  missing: 'Отсутствует',
};

export const REASONS = [
  { id: 'tooth_pain', label: 'Болит зуб' },
  { id: 'consultation', label: 'Консультация' },
  { id: 'hygiene', label: 'Профессиональная гигиена' },
  { id: 'therapy', label: 'Терапия' },
  { id: 'implant', label: 'Имплантация' },
  { id: 'orthodontics', label: 'Ортодонтия' },
  { id: 'pediatric', label: 'Детская стоматология' },
  { id: 'other', label: 'Другое' },
] as const;
