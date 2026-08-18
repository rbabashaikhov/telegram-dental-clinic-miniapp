import type {
  Appointment,
  AppointmentDetails,
  AppointmentHistory,
  AppointmentStatus,
  BusinessEvent,
  Clinic,
  DentalChart,
  Doctor,
  DoctorSchedule,
  FamilyMember,
  Invoice,
  Location,
  NotificationKind,
  NotificationRecord,
  OutboundEventName,
  Patient,
  PatientForm,
  Payment,
  PaymentStatus,
  Recall,
  RecallDetails,
  RecallStatus,
  Room,
  ScheduleBlock,
  Service,
  SpecialtyCode,
  TelegramUser,
  TimeSlot,
  Tooth,
  ToothDetails,
  TreatmentPlan,
  TreatmentPlanDetails,
  TreatmentPlanItem,
  TreatmentPlanItemDetails,
  TreatmentPlanStatus,
  TreatmentRecord,
  TreatmentRecordDetails,
  UnscheduledTreatmentItem,
} from '../types.js';

export interface ClinicProvider {
  getClinic(): Clinic;
  listLocations(activeOnly?: boolean): Location[];
  getLocation(id: number): Location | undefined;
  listRooms(locationId?: number, activeOnly?: boolean): Room[];
  getRoom(id: number): Room | undefined;
}

export interface PatientProvider {
  upsertTelegramOwner(user: TelegramUser): { patient: Patient; created: boolean };
  getById(id: number): Patient | undefined;
  getByTelegramUserId(telegramUserId: number): Patient | undefined;
  listAll(): Patient[];
  update(
    id: number,
    patch: Partial<Pick<Patient, 'first_name' | 'last_name' | 'phone' | 'email' | 'birth_date' | 'active'>>,
  ): Patient;
  listFamily(ownerTelegramUserId: number): FamilyMember[];
  assertFamilyAccess(ownerTelegramUserId: number, patientId: number): Patient;
  createDependent(params: {
    ownerTelegramUserId: number;
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    relation: string;
  }): Patient;
  getForm(patientId: number): PatientForm | undefined;
  upsertForm(patientId: number, form: Omit<PatientForm, 'id' | 'patient_id' | 'updated_at'>): PatientForm;
}

export interface DoctorProvider {
  list(activeOnly?: boolean): Doctor[];
  getById(id: number): Doctor | undefined;
  create(params: Omit<Doctor, 'id'>): Doctor;
  update(id: number, patch: Partial<Omit<Doctor, 'id'>>): Doctor;
  listSchedules(doctorId: number): DoctorSchedule[];
  replaceSchedules(doctorId: number, rows: Array<Omit<DoctorSchedule, 'id' | 'doctor_id'>>): DoctorSchedule[];
  listServiceIds(doctorId: number): number[];
  listBySpecialty(specialty: SpecialtyCode, activeOnly?: boolean): Doctor[];
  listEligibleForService(serviceId: number): Doctor[];
}

export interface ServiceProvider {
  list(activeOnly?: boolean): Service[];
  getById(id: number): Service | undefined;
  getByVisitReason(reason: string): Service | undefined;
  create(params: Omit<Service, 'id'>): Service;
  update(id: number, patch: Partial<Omit<Service, 'id'>>): Service;
}

export interface AvailabilityProvider {
  listBlocks(filters?: { date?: string; doctorId?: number; roomId?: number }): ScheduleBlock[];
  createBlock(params: Omit<ScheduleBlock, 'id'>): ScheduleBlock;
  deleteBlock(id: number): void;
  findBusyIntervals(params: {
    date: string;
    doctorId?: number;
    roomId?: number;
  }): Array<{ start_time: string; end_time: string; doctor_id: number; room_id: number | null }>;
}

export interface AppointmentProvider {
  getById(id: number): AppointmentDetails | undefined;
  list(filters?: {
    patientId?: number;
    doctorId?: number;
    status?: AppointmentStatus;
    date?: string;
    from?: string;
    to?: string;
  }): AppointmentDetails[];
  insert(params: Omit<Appointment, 'id' | 'created_at'>): AppointmentDetails;
  update(
    id: number,
    patch: Partial<
      Pick<
        Appointment,
        | 'doctor_id'
        | 'room_id'
        | 'appointment_date'
        | 'start_time'
        | 'end_time'
        | 'duration_minutes'
        | 'status'
        | 'notes'
        | 'treatment_plan_item_id'
        | 'recall_id'
      >
    >,
  ): AppointmentDetails;
  listHistory(appointmentId: number): AppointmentHistory[];
  addHistory(params: Omit<AppointmentHistory, 'id' | 'created_at'>): AppointmentHistory;
}

export interface TreatmentPlanProvider {
  getById(id: number): TreatmentPlanDetails | undefined;
  list(filters?: { patientId?: number; status?: TreatmentPlanStatus }): TreatmentPlanDetails[];
  create(params: Omit<TreatmentPlan, 'id' | 'created_at'>): TreatmentPlanDetails;
  update(
    id: number,
    patch: Partial<Pick<TreatmentPlan, 'title' | 'status' | 'accepted_at' | 'estimated_total' | 'paid_total' | 'notes'>>,
  ): TreatmentPlanDetails;
  getItem(id: number): TreatmentPlanItemDetails | undefined;
  listItems(planId: number): TreatmentPlanItemDetails[];
  createItem(params: Omit<TreatmentPlanItem, 'id'>): TreatmentPlanItemDetails;
  updateItem(
    id: number,
    patch: Partial<
      Pick<
        TreatmentPlanItem,
        | 'status'
        | 'appointment_id'
        | 'title'
        | 'description'
        | 'estimated_price'
        | 'recommended_before'
        | 'sort_order'
        | 'tooth_id'
      >
    >,
  ): TreatmentPlanItemDetails;
  listUnscheduled(nowDate?: string): UnscheduledTreatmentItem[];
}

export interface DentalChartProvider {
  getChart(patientId: number): DentalChart;
  getTooth(patientId: number, toothId: string): ToothDetails | undefined;
  upsertTooth(params: Omit<Tooth, 'id'>): ToothDetails;
}

export interface TreatmentRecordProvider {
  getById(id: number): TreatmentRecordDetails | undefined;
  list(filters?: { patientId?: number; toothId?: string; appointmentId?: number }): TreatmentRecordDetails[];
  insert(params: Omit<TreatmentRecord, 'id'>): TreatmentRecordDetails;
}

export interface RecallProvider {
  getById(id: number): RecallDetails | undefined;
  list(filters?: { patientId?: number; status?: RecallStatus; dueOnOrBefore?: string }): RecallDetails[];
  insert(params: Omit<Recall, 'id'>): RecallDetails;
  update(id: number, patch: Partial<Pick<Recall, 'status' | 'due_at' | 'title' | 'notes'>>): RecallDetails;
}

export interface PaymentProvider {
  list(filters?: { patientId?: number; treatmentPlanId?: number }): Payment[];
  insert(params: Omit<Payment, 'id' | 'created_at'>): Payment;
  updateStatus(id: number, status: PaymentStatus): Payment;
  listInvoices(patientId?: number): Invoice[];
  upsertInvoice(params: Omit<Invoice, 'id' | 'created_at'>): Invoice;
}

export interface EventProvider {
  publish(name: OutboundEventName, payload: Record<string, unknown>): BusinessEvent;
  list(limit?: number): BusinessEvent[];
}

export interface NotificationProvider {
  enqueue(params: {
    patientId: number;
    kind: NotificationKind;
    title: string;
    body: string;
  }): NotificationRecord;
  list(patientId?: number): NotificationRecord[];
}

export interface Providers {
  clinic: ClinicProvider;
  patients: PatientProvider;
  doctors: DoctorProvider;
  services: ServiceProvider;
  availability: AvailabilityProvider;
  appointments: AppointmentProvider;
  treatmentPlans: TreatmentPlanProvider;
  dentalChart: DentalChartProvider;
  treatmentRecords: TreatmentRecordProvider;
  recalls: RecallProvider;
  payments: PaymentProvider;
  events: EventProvider;
  notifications: NotificationProvider;
  transaction<T>(fn: () => T): T;
}

export type { TimeSlot };
