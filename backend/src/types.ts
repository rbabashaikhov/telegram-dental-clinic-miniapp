export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthContext {
  telegramUser: TelegramUser;
  isDemo: boolean;
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

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ToothState =
  | 'healthy'
  | 'treatment_required'
  | 'treatment_planned'
  | 'treated'
  | 'crown'
  | 'implant'
  | 'missing';

export type RecallType = 'checkup' | 'hygiene' | 'treatment_followup' | 'custom';
export type RecallStatus = 'scheduled' | 'due' | 'booked' | 'completed' | 'dismissed';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type VisitReason =
  | 'tooth_pain'
  | 'consultation'
  | 'hygiene'
  | 'therapy'
  | 'implant'
  | 'orthodontics'
  | 'pediatric'
  | 'other';

export type NotificationKind =
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'appointment_reminder'
  | 'treatment_step_available'
  | 'recall_due';

export type OutboundEventName =
  | 'appointment.created'
  | 'appointment.cancelled'
  | 'appointment.rescheduled'
  | 'appointment.completed'
  | 'treatment_plan.created'
  | 'treatment_plan.accepted'
  | 'treatment_item.scheduled'
  | 'treatment_item.completed'
  | 'treatment_plan.completed'
  | 'recall.created'
  | 'recall.due';

export interface Clinic {
  id: number;
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  timezone: string;
}

export interface Location {
  id: number;
  clinic_id: number;
  name: string;
  address: string;
  timezone: string;
  active: boolean;
}

export interface Room {
  id: number;
  location_id: number;
  name: string;
  room_type: string;
  active: boolean;
}

export interface Patient {
  id: number;
  telegram_user_id: number | null;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  username: string | null;
  relation: string;
  active: boolean;
  created_at: string;
}

export interface FamilyMember {
  id: number;
  owner_telegram_user_id: number;
  patient_id: number;
  relation: string;
  is_primary: boolean;
  patient: Patient;
}

export interface Doctor {
  id: number;
  location_id: number;
  name: string;
  specialty: SpecialtyCode;
  avatar: string;
  bio: string;
  active: boolean;
}

export interface DoctorSchedule {
  id: number;
  doctor_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  specialty: SpecialtyCode;
  visit_reason: VisitReason | null;
  room_type: string;
  repeatable: boolean;
  active: boolean;
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
}

export interface TreatmentPlanDetails extends TreatmentPlan {
  items: TreatmentPlanItemDetails[];
  completed_items: number;
  total_items: number;
  progress_percent: number;
  outstanding_total: number;
}

export interface TreatmentPlanItemDetails extends TreatmentPlanItem {
  service_name: string;
  appointment?: AppointmentDetails | null;
}

export interface Tooth {
  id: number;
  patient_id: number;
  tooth_id: string;
  state: ToothState;
  problem: string;
  recommended_service_id: number | null;
  notes: string;
}

export interface DentalChart {
  patient_id: number;
  teeth: ToothDetails[];
}

export interface ToothDetails extends Tooth {
  recommended_service_name: string | null;
  recommended_price: number | null;
  latest_record?: TreatmentRecordDetails | null;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  service_id: number;
  room_id: number | null;
  location_id: number;
  treatment_plan_item_id: number | null;
  recall_id: number | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  price: number;
  notes: string;
  created_at: string;
}

export interface AppointmentDetails extends Appointment {
  patient_name: string;
  doctor_name: string;
  doctor_specialty: SpecialtyCode;
  service_name: string;
  location_name: string;
  room_name: string | null;
  treatment_item_title: string | null;
  tooth_id: string | null;
}

export interface AppointmentHistory {
  id: number;
  appointment_id: number;
  from_status: AppointmentStatus | null;
  to_status: AppointmentStatus;
  note: string;
  created_at: string;
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
}

export interface TreatmentRecordDetails extends TreatmentRecord {
  service_name: string;
  doctor_name: string;
  patient_name: string;
}

export interface Recall {
  id: number;
  patient_id: number;
  type: RecallType;
  due_at: string;
  status: RecallStatus;
  related_service_id: number | null;
  related_treatment_plan_id: number | null;
  title: string;
  notes: string;
}

export interface RecallDetails extends Recall {
  service_name: string | null;
  patient_name: string;
}

export interface PatientForm {
  id: number;
  patient_id: number;
  allergies: string;
  medications: string;
  chronic_conditions: string;
  pregnancy: boolean;
  previous_surgery: string;
  notes: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  patient_id: number;
  treatment_plan_id: number | null;
  appointment_id: number | null;
  amount: number;
  status: PaymentStatus;
  method: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  patient_id: number;
  treatment_plan_id: number | null;
  total: number;
  paid_total: number;
  status: 'open' | 'paid' | 'void';
  created_at: string;
}

export interface ScheduleBlock {
  id: number;
  doctor_id: number | null;
  room_id: number | null;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface BusinessEvent {
  id: number;
  name: OutboundEventName;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface NotificationRecord {
  id: number;
  patient_id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  created_at: string;
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

export interface UnscheduledTreatmentItem {
  item: TreatmentPlanItemDetails;
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
