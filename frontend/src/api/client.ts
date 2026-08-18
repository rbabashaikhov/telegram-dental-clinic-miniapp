import type {
  AdminDashboard,
  Appointment,
  AppConfig,
  DentalChart,
  Doctor,
  Patient,
  PatientForm,
  Portal,
  Recall,
  Service,
  TimeSlot,
  Tooth,
  TreatmentPlan,
  TreatmentRecord,
  UnscheduledItem,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

let initData = '';
let adminToken = '';
let patientId: number | null = null;

if (typeof sessionStorage !== 'undefined') {
  adminToken = sessionStorage.getItem('admin_token') || '';
  const storedPatient = sessionStorage.getItem('active_patient_id');
  patientId = storedPatient ? Number(storedPatient) : null;
}

export function setTelegramInitData(value: string): void {
  initData = value;
}

export function setAdminToken(value: string): void {
  adminToken = value;
  if (typeof sessionStorage !== 'undefined') {
    if (value) sessionStorage.setItem('admin_token', value);
    else sessionStorage.removeItem('admin_token');
  }
}

export function getAdminToken(): string {
  return adminToken;
}

export function setActivePatientId(id: number | null): void {
  patientId = id;
  if (typeof sessionStorage !== 'undefined') {
    if (id) sessionStorage.setItem('active_patient_id', String(id));
    else sessionStorage.removeItem('active_patient_id');
  }
}

export function getActivePatientId(): number | null {
  return patientId;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (initData) headers.set('x-telegram-init-data', initData);
  if (patientId) headers.set('x-patient-id', String(patientId));
  if (adminToken && path.startsWith('/api/admin')) headers.set('x-admin-token', adminToken);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error || `Request failed (${response.status})`, response.status);
  }
  return payload as T;
}

export const api = {
  getConfig: () => request<{ data: AppConfig }>('/api/config'),
  getMe: () => request<{ data: { user: { id: number }; isDemo: boolean; family: Array<{ patient_id: number }> } }>('/api/me'),
  getPortal: () => request<{ data: Portal }>('/api/me/portal'),
  getDoctors: () => request<{ data: Doctor[] }>('/api/doctors'),
  getServices: () => request<{ data: Service[] }>('/api/services'),
  getAvailability: (query: { serviceId: number; date: string; doctorId?: number }) => {
    const params = new URLSearchParams({ serviceId: String(query.serviceId), date: query.date });
    if (query.doctorId) params.set('doctorId', String(query.doctorId));
    return request<{ data: TimeSlot[] }>(`/api/availability?${params}`);
  },
  createAppointment: (body: {
    serviceId: number;
    doctorId?: number | null;
    date: string;
    startTime: string;
    recallId?: number;
  }) => request<{ data: Appointment }>('/api/appointments', { method: 'POST', body: JSON.stringify(body) }),
  cancelAppointment: (id: number) =>
    request<{ data: Appointment }>(`/api/appointments/${id}/cancel`, { method: 'POST' }),
  rescheduleAppointment: (id: number, body: { date: string; startTime: string; doctorId?: number | null }) =>
    request<{ data: Appointment }>(`/api/appointments/${id}/reschedule`, { method: 'POST', body: JSON.stringify(body) }),
  getTreatmentPlans: () => request<{ data: TreatmentPlan[] }>('/api/treatment-plans'),
  getTreatmentPlan: (id: number) => request<{ data: TreatmentPlan }>(`/api/treatment-plans/${id}`),
  bookTreatmentItem: (id: number, body: { date: string; startTime: string; doctorId?: number | null }) =>
    request<{ data: Appointment }>(`/api/treatment-plan-items/${id}/book`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getChart: () => request<{ data: DentalChart }>('/api/dental-chart'),
  getTooth: (toothId: string) => request<{ data: Tooth }>(`/api/dental-chart/${toothId}`),
  getHistory: () => request<{ data: TreatmentRecord[] }>('/api/treatment-records'),
  getRecord: (id: number) => request<{ data: TreatmentRecord }>(`/api/treatment-records/${id}`),
  getRecalls: () => request<{ data: Recall[] }>('/api/recalls'),
  getForm: () => request<{ data: PatientForm }>('/api/forms'),
  saveForm: (body: PatientForm) => request<{ data: PatientForm }>('/api/forms', { method: 'PUT', body: JSON.stringify(body) }),
  adminDashboard: (preview: boolean) =>
    request<{ data: AdminDashboard }>(preview ? '/api/demo-admin/dashboard' : '/api/admin/dashboard'),
  adminAppointments: (preview: boolean) =>
    request<{ data: Appointment[] }>(preview ? '/api/demo-admin/appointments' : '/api/admin/appointments'),
  adminUnscheduled: (preview: boolean) =>
    request<{ data: { items: UnscheduledItem[]; total_value: number } }>(
      preview ? '/api/demo-admin/unscheduled' : '/api/admin/unscheduled',
    ),
  adminPatients: (preview: boolean) =>
    request<{ data: Patient[] }>(preview ? '/api/demo-admin/patients' : '/api/admin/patients'),
  adminPlans: (preview: boolean) =>
    request<{ data: TreatmentPlan[] }>(preview ? '/api/demo-admin/treatment-plans' : '/api/admin/treatment-plans'),
  adminRecalls: (preview: boolean) =>
    request<{ data: Recall[] }>(preview ? '/api/demo-admin/recalls' : '/api/admin/recalls'),
  adminRecords: (preview: boolean) =>
    request<{ data: TreatmentRecord[] }>(preview ? '/api/demo-admin/treatment-records' : '/api/admin/treatment-records'),
  adminDoctors: (preview: boolean) =>
    request<{ data: Doctor[] }>(preview ? '/api/demo-admin/doctors' : '/api/admin/doctors'),
  adminServices: (preview: boolean) =>
    request<{ data: Service[] }>(preview ? '/api/demo-admin/services' : '/api/admin/services'),
  adminComplete: (id: number, body?: { summary?: string; recommendations?: string }) =>
    request<{ data: { appointment: Appointment } }>(`/api/admin/appointments/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
  adminConfirm: (id: number) =>
    request<{ data: Appointment }>(`/api/admin/appointments/${id}/confirm`, { method: 'POST' }),
  adminNoShow: (id: number) =>
    request<{ data: Appointment }>(`/api/admin/appointments/${id}/no-show`, { method: 'POST' }),
  adminCancel: (id: number) =>
    request<{ data: Appointment }>(`/api/admin/appointments/${id}/cancel`, { method: 'POST' }),
  adminPay: (planId: number, amount: number) =>
    request<{ data: TreatmentPlan }>(`/api/admin/treatment-plans/${planId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
};
