import Database from 'better-sqlite3';
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
} from '../../types.js';
import { AppError } from '../../errors.js';
import { daysBetween, todayDateString } from '../../services/time.js';
import type { Providers } from '../types.js';

function bool(value: unknown): boolean {
  return Boolean(value);
}

function mapPatient(row: Record<string, unknown>): Patient {
  return {
    id: Number(row.id),
    telegram_user_id: row.telegram_user_id == null ? null : Number(row.telegram_user_id),
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    phone: String(row.phone),
    email: String(row.email),
    birth_date: row.birth_date ? String(row.birth_date) : null,
    username: row.username ? String(row.username) : null,
    relation: String(row.relation),
    active: bool(row.active),
    created_at: String(row.created_at),
  };
}

function mapDoctor(row: Record<string, unknown>): Doctor {
  return {
    id: Number(row.id),
    location_id: Number(row.location_id),
    name: String(row.name),
    specialty: String(row.specialty) as SpecialtyCode,
    avatar: String(row.avatar),
    bio: String(row.bio),
    active: bool(row.active),
  };
}

function mapService(row: Record<string, unknown>): Service {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description),
    duration_minutes: Number(row.duration_minutes),
    price: Number(row.price),
    specialty: String(row.specialty) as SpecialtyCode,
    visit_reason: row.visit_reason ? (String(row.visit_reason) as Service['visit_reason']) : null,
    room_type: String(row.room_type),
    repeatable: bool(row.repeatable),
    active: bool(row.active),
  };
}

function mapPlan(row: Record<string, unknown>): TreatmentPlan {
  return {
    id: Number(row.id),
    patient_id: Number(row.patient_id),
    title: String(row.title),
    status: String(row.status) as TreatmentPlanStatus,
    created_at: String(row.created_at),
    accepted_at: row.accepted_at ? String(row.accepted_at) : null,
    estimated_total: Number(row.estimated_total),
    paid_total: Number(row.paid_total),
    notes: String(row.notes),
  };
}

const APPOINTMENT_SELECT = `
  SELECT
    a.*,
    TRIM(p.first_name || ' ' || p.last_name) AS patient_name,
    d.name AS doctor_name,
    d.specialty AS doctor_specialty,
    s.name AS service_name,
    l.name AS location_name,
    r.name AS room_name,
    i.title AS treatment_item_title,
    i.tooth_id AS tooth_id
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  JOIN doctors d ON d.id = a.doctor_id
  JOIN services s ON s.id = a.service_id
  JOIN locations l ON l.id = a.location_id
  LEFT JOIN rooms r ON r.id = a.room_id
  LEFT JOIN treatment_plan_items i ON i.id = a.treatment_plan_item_id
`;

function mapAppointment(row: Record<string, unknown>): AppointmentDetails {
  return {
    id: Number(row.id),
    patient_id: Number(row.patient_id),
    doctor_id: Number(row.doctor_id),
    service_id: Number(row.service_id),
    room_id: row.room_id == null ? null : Number(row.room_id),
    location_id: Number(row.location_id),
    treatment_plan_item_id: row.treatment_plan_item_id == null ? null : Number(row.treatment_plan_item_id),
    recall_id: row.recall_id == null ? null : Number(row.recall_id),
    appointment_date: String(row.appointment_date),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    duration_minutes: Number(row.duration_minutes),
    status: String(row.status) as AppointmentStatus,
    price: Number(row.price),
    notes: String(row.notes),
    created_at: String(row.created_at),
    patient_name: String(row.patient_name),
    doctor_name: String(row.doctor_name),
    doctor_specialty: String(row.doctor_specialty) as SpecialtyCode,
    service_name: String(row.service_name),
    location_name: String(row.location_name),
    room_name: row.room_name ? String(row.room_name) : null,
    treatment_item_title: row.treatment_item_title ? String(row.treatment_item_title) : null,
    tooth_id: row.tooth_id ? String(row.tooth_id) : null,
  };
}

const ITEM_SELECT = `
  SELECT i.*, s.name AS service_name
  FROM treatment_plan_items i
  JOIN services s ON s.id = i.service_id
`;

function mapItem(row: Record<string, unknown>, appointment?: AppointmentDetails | null): TreatmentPlanItemDetails {
  return {
    id: Number(row.id),
    treatment_plan_id: Number(row.treatment_plan_id),
    tooth_id: row.tooth_id ? String(row.tooth_id) : null,
    service_id: Number(row.service_id),
    title: String(row.title),
    description: String(row.description),
    doctor_specialty: String(row.doctor_specialty) as SpecialtyCode,
    estimated_price: Number(row.estimated_price),
    status: String(row.status) as TreatmentPlanItemDetails['status'],
    sort_order: Number(row.sort_order),
    recommended_before: row.recommended_before ? String(row.recommended_before) : null,
    prerequisite_item_id: row.prerequisite_item_id == null ? null : Number(row.prerequisite_item_id),
    appointment_id: row.appointment_id == null ? null : Number(row.appointment_id),
    service_name: String(row.service_name),
    appointment: appointment ?? null,
  };
}

function withProgress(plan: TreatmentPlan, items: TreatmentPlanItemDetails[]): TreatmentPlanDetails {
  const countable = items.filter((item) => item.status !== 'cancelled');
  const completed = countable.filter((item) => item.status === 'completed').length;
  return {
    ...plan,
    items,
    completed_items: completed,
    total_items: countable.length,
    progress_percent: countable.length === 0 ? 0 : Math.round((completed / countable.length) * 100),
    outstanding_total: Math.max(0, plan.estimated_total - plan.paid_total),
  };
}

const RECORD_SELECT = `
  SELECT
    r.*,
    s.name AS service_name,
    d.name AS doctor_name,
    TRIM(p.first_name || ' ' || p.last_name) AS patient_name
  FROM treatment_records r
  JOIN services s ON s.id = r.service_id
  JOIN doctors d ON d.id = r.doctor_id
  JOIN patients p ON p.id = r.patient_id
`;

function mapRecord(row: Record<string, unknown>): TreatmentRecordDetails {
  return {
    id: Number(row.id),
    patient_id: Number(row.patient_id),
    appointment_id: row.appointment_id == null ? null : Number(row.appointment_id),
    tooth_id: row.tooth_id ? String(row.tooth_id) : null,
    service_id: Number(row.service_id),
    doctor_id: Number(row.doctor_id),
    performed_at: String(row.performed_at),
    summary: String(row.summary),
    recommendations: String(row.recommendations),
    price: Number(row.price),
    treatment_plan_item_id: row.treatment_plan_item_id == null ? null : Number(row.treatment_plan_item_id),
    service_name: String(row.service_name),
    doctor_name: String(row.doctor_name),
    patient_name: String(row.patient_name),
  };
}

const RECALL_SELECT = `
  SELECT
    r.*,
    s.name AS service_name,
    TRIM(p.first_name || ' ' || p.last_name) AS patient_name
  FROM recalls r
  JOIN patients p ON p.id = r.patient_id
  LEFT JOIN services s ON s.id = r.related_service_id
`;

function mapRecall(row: Record<string, unknown>): RecallDetails {
  return {
    id: Number(row.id),
    patient_id: Number(row.patient_id),
    type: String(row.type) as RecallDetails['type'],
    due_at: String(row.due_at),
    status: String(row.status) as RecallStatus,
    related_service_id: row.related_service_id == null ? null : Number(row.related_service_id),
    related_treatment_plan_id: row.related_treatment_plan_id == null ? null : Number(row.related_treatment_plan_id),
    title: String(row.title),
    notes: String(row.notes),
    service_name: row.service_name ? String(row.service_name) : null,
    patient_name: String(row.patient_name),
  };
}

function mapTooth(row: Record<string, unknown>, latest?: TreatmentRecordDetails | null): ToothDetails {
  return {
    id: Number(row.id),
    patient_id: Number(row.patient_id),
    tooth_id: String(row.tooth_id),
    state: String(row.state) as ToothDetails['state'],
    problem: String(row.problem),
    recommended_service_id: row.recommended_service_id == null ? null : Number(row.recommended_service_id),
    notes: String(row.notes),
    recommended_service_name: row.recommended_service_name ? String(row.recommended_service_name) : null,
    recommended_price: row.recommended_price == null ? null : Number(row.recommended_price),
    latest_record: latest ?? null,
  };
}

export function createLocalProviders(database: Database.Database): Providers {
  const getAppointment = (id: number): AppointmentDetails | undefined => {
    const row = database.prepare(`${APPOINTMENT_SELECT} WHERE a.id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ? mapAppointment(row) : undefined;
  };

  const listAppointments = (filters?: {
    patientId?: number;
    doctorId?: number;
    status?: AppointmentStatus;
    date?: string;
    from?: string;
    to?: string;
  }): AppointmentDetails[] => {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters?.patientId) {
      where.push('a.patient_id = ?');
      params.push(filters.patientId);
    }
    if (filters?.doctorId) {
      where.push('a.doctor_id = ?');
      params.push(filters.doctorId);
    }
    if (filters?.status) {
      where.push('a.status = ?');
      params.push(filters.status);
    }
    if (filters?.date) {
      where.push('a.appointment_date = ?');
      params.push(filters.date);
    }
    if (filters?.from) {
      where.push('a.appointment_date >= ?');
      params.push(filters.from);
    }
    if (filters?.to) {
      where.push('a.appointment_date <= ?');
      params.push(filters.to);
    }
    const sql = `${APPOINTMENT_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.appointment_date, a.start_time`;
    return (database.prepare(sql).all(...params) as Record<string, unknown>[]).map(mapAppointment);
  };

  const getItem = (id: number): TreatmentPlanItemDetails | undefined => {
    const row = database.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const appointment = row.appointment_id ? getAppointment(Number(row.appointment_id)) : null;
    return mapItem(row, appointment);
  };

  const listItems = (planId: number): TreatmentPlanItemDetails[] => {
    const rows = database.prepare(`${ITEM_SELECT} WHERE i.treatment_plan_id = ? ORDER BY i.sort_order`).all(planId) as Record<
      string,
      unknown
    >[];
    return rows.map((row) => mapItem(row, row.appointment_id ? getAppointment(Number(row.appointment_id)) : null));
  };

  const getPlan = (id: number): TreatmentPlanDetails | undefined => {
    const row = database.prepare('SELECT * FROM treatment_plans WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return withProgress(mapPlan(row), listItems(id));
  };

  const listRecords = (filters?: {
    patientId?: number;
    toothId?: string;
    appointmentId?: number;
  }): TreatmentRecordDetails[] => {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters?.patientId) {
      where.push('r.patient_id = ?');
      params.push(filters.patientId);
    }
    if (filters?.toothId) {
      where.push('r.tooth_id = ?');
      params.push(filters.toothId);
    }
    if (filters?.appointmentId) {
      where.push('r.appointment_id = ?');
      params.push(filters.appointmentId);
    }
    const sql = `${RECORD_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY r.performed_at DESC, r.id DESC`;
    return (database.prepare(sql).all(...params) as Record<string, unknown>[]).map(mapRecord);
  };

  const getTooth = (patientId: number, toothId: string): ToothDetails | undefined => {
    const row = database
      .prepare(
        `SELECT t.*, s.name AS recommended_service_name, s.price AS recommended_price
         FROM teeth t
         LEFT JOIN services s ON s.id = t.recommended_service_id
         WHERE t.patient_id = ? AND t.tooth_id = ?`,
      )
      .get(patientId, toothId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const latest = listRecords({ patientId, toothId })[0] ?? null;
    return mapTooth(row, latest);
  };

  const notFound = (entity: string): never => {
    throw new AppError(`${entity} not found`, 404, 'NOT_FOUND');
  };

  return {
    clinic: {
      getClinic() {
        const row = database.prepare('SELECT * FROM clinics LIMIT 1').get() as Record<string, unknown> | undefined;
        if (!row) return notFound('Clinic');
        return {
          id: Number(row.id),
          name: String(row.name),
          description: String(row.description),
          phone: String(row.phone),
          email: String(row.email),
          address: String(row.address),
          timezone: String(row.timezone),
        } satisfies Clinic;
      },
      listLocations(activeOnly = false) {
        const sql = activeOnly ? 'SELECT * FROM locations WHERE active = 1' : 'SELECT * FROM locations';
        return (database.prepare(sql).all() as Record<string, unknown>[]).map(
          (row) =>
            ({
              id: Number(row.id),
              clinic_id: Number(row.clinic_id),
              name: String(row.name),
              address: String(row.address),
              timezone: String(row.timezone),
              active: bool(row.active),
            }) satisfies Location,
        );
      },
      getLocation(id) {
        const row = database.prepare('SELECT * FROM locations WHERE id = ?').get(id) as Record<string, unknown> | undefined;
        return row
          ? {
              id: Number(row.id),
              clinic_id: Number(row.clinic_id),
              name: String(row.name),
              address: String(row.address),
              timezone: String(row.timezone),
              active: bool(row.active),
            }
          : undefined;
      },
      listRooms(locationId, activeOnly = false) {
        const where: string[] = [];
        const params: unknown[] = [];
        if (locationId) {
          where.push('location_id = ?');
          params.push(locationId);
        }
        if (activeOnly) where.push('active = 1');
        const sql = `SELECT * FROM rooms ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY name`;
        return (database.prepare(sql).all(...params) as Record<string, unknown>[]).map(
          (row) =>
            ({
              id: Number(row.id),
              location_id: Number(row.location_id),
              name: String(row.name),
              room_type: String(row.room_type),
              active: bool(row.active),
            }) satisfies Room,
        );
      },
      getRoom(id) {
        const row = database.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Record<string, unknown> | undefined;
        return row
          ? {
              id: Number(row.id),
              location_id: Number(row.location_id),
              name: String(row.name),
              room_type: String(row.room_type),
              active: bool(row.active),
            }
          : undefined;
      },
    },
    patients: {
      upsertTelegramOwner(user: TelegramUser) {
        const existing = database
          .prepare('SELECT * FROM patients WHERE telegram_user_id = ?')
          .get(user.id) as Record<string, unknown> | undefined;
        if (existing) {
          return { patient: mapPatient(existing), created: false };
        }
        const result = database
          .prepare(
            `INSERT INTO patients (telegram_user_id, first_name, last_name, username, relation, active)
             VALUES (?, ?, ?, ?, 'self', 1)`,
          )
          .run(user.id, user.first_name || '', user.last_name || '', user.username || null);
        const patient = mapPatient(
          database.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>,
        );
        database
          .prepare(
            `INSERT INTO family_members (owner_telegram_user_id, patient_id, relation, is_primary)
             VALUES (?, ?, 'self', 1)`,
          )
          .run(user.id, patient.id);
        return { patient, created: true };
      },
      getById(id) {
        const row = database.prepare('SELECT * FROM patients WHERE id = ?').get(id) as Record<string, unknown> | undefined;
        return row ? mapPatient(row) : undefined;
      },
      getByTelegramUserId(telegramUserId) {
        const row = database
          .prepare('SELECT * FROM patients WHERE telegram_user_id = ?')
          .get(telegramUserId) as Record<string, unknown> | undefined;
        return row ? mapPatient(row) : undefined;
      },
      listAll() {
        return (database.prepare('SELECT * FROM patients ORDER BY last_name, first_name').all() as Record<string, unknown>[]).map(
          mapPatient,
        );
      },
      update(id, patch) {
        const current = this.getById(id);
        if (!current) notFound('Patient');
        const next = { ...current, ...patch };
        database
          .prepare(
            `UPDATE patients SET first_name = ?, last_name = ?, phone = ?, email = ?, birth_date = ?, active = ?
             WHERE id = ?`,
          )
          .run(next.first_name, next.last_name, next.phone, next.email, next.birth_date, next.active ? 1 : 0, id);
        return this.getById(id)!;
      },
      listFamily(ownerTelegramUserId) {
        const rows = database
          .prepare(
            `SELECT f.*, p.first_name, p.last_name, p.phone, p.email, p.birth_date, p.username,
                    p.telegram_user_id, p.relation AS patient_relation, p.active, p.created_at
             FROM family_members f
             JOIN patients p ON p.id = f.patient_id
             WHERE f.owner_telegram_user_id = ?
             ORDER BY f.is_primary DESC, p.birth_date IS NULL, p.birth_date DESC`,
          )
          .all(ownerTelegramUserId) as Record<string, unknown>[];
        return rows.map(
          (row) =>
            ({
              id: Number(row.id),
              owner_telegram_user_id: Number(row.owner_telegram_user_id),
              patient_id: Number(row.patient_id),
              relation: String(row.relation),
              is_primary: bool(row.is_primary),
              patient: {
                id: Number(row.patient_id),
                telegram_user_id: row.telegram_user_id == null ? null : Number(row.telegram_user_id),
                first_name: String(row.first_name),
                last_name: String(row.last_name),
                phone: String(row.phone),
                email: String(row.email),
                birth_date: row.birth_date ? String(row.birth_date) : null,
                username: row.username ? String(row.username) : null,
                relation: String(row.patient_relation),
                active: bool(row.active),
                created_at: String(row.created_at),
              },
            }) satisfies FamilyMember,
        );
      },
      assertFamilyAccess(ownerTelegramUserId, patientId) {
        const row = database
          .prepare(
            `SELECT p.* FROM family_members f
             JOIN patients p ON p.id = f.patient_id
             WHERE f.owner_telegram_user_id = ? AND f.patient_id = ?`,
          )
          .get(ownerTelegramUserId, patientId) as Record<string, unknown> | undefined;
        if (!row) {
          throw new AppError('Patient profile is not available', 403, 'FAMILY_ACCESS_DENIED');
        }
        return mapPatient(row);
      },
      createDependent(params) {
        const result = database
          .prepare(
            `INSERT INTO patients (telegram_user_id, first_name, last_name, birth_date, relation, active)
             VALUES (NULL, ?, ?, ?, ?, 1)`,
          )
          .run(params.firstName, params.lastName, params.birthDate ?? null, params.relation);
        const patient = mapPatient(
          database.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>,
        );
        database
          .prepare(
            `INSERT INTO family_members (owner_telegram_user_id, patient_id, relation, is_primary)
             VALUES (?, ?, ?, 0)`,
          )
          .run(params.ownerTelegramUserId, patient.id, params.relation);
        return patient;
      },
      getForm(patientId) {
        const row = database.prepare('SELECT * FROM patient_forms WHERE patient_id = ?').get(patientId) as
          | Record<string, unknown>
          | undefined;
        return row
          ? {
              id: Number(row.id),
              patient_id: Number(row.patient_id),
              allergies: String(row.allergies),
              medications: String(row.medications),
              chronic_conditions: String(row.chronic_conditions),
              pregnancy: bool(row.pregnancy),
              previous_surgery: String(row.previous_surgery),
              notes: String(row.notes),
              updated_at: String(row.updated_at),
            }
          : undefined;
      },
      upsertForm(patientId, form) {
        database
          .prepare(
            `INSERT INTO patient_forms (patient_id, allergies, medications, chronic_conditions, pregnancy, previous_surgery, notes, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(patient_id) DO UPDATE SET
               allergies = excluded.allergies,
               medications = excluded.medications,
               chronic_conditions = excluded.chronic_conditions,
               pregnancy = excluded.pregnancy,
               previous_surgery = excluded.previous_surgery,
               notes = excluded.notes,
               updated_at = datetime('now')`,
          )
          .run(
            patientId,
            form.allergies,
            form.medications,
            form.chronic_conditions,
            form.pregnancy ? 1 : 0,
            form.previous_surgery,
            form.notes,
          );
        return this.getForm(patientId)!;
      },
    },
    doctors: {
      list(activeOnly = false) {
        const sql = activeOnly ? 'SELECT * FROM doctors WHERE active = 1 ORDER BY name' : 'SELECT * FROM doctors ORDER BY name';
        return (database.prepare(sql).all() as Record<string, unknown>[]).map(mapDoctor);
      },
      getById(id) {
        const row = database.prepare('SELECT * FROM doctors WHERE id = ?').get(id) as Record<string, unknown> | undefined;
        return row ? mapDoctor(row) : undefined;
      },
      create(params) {
        const result = database
          .prepare(
            `INSERT INTO doctors (location_id, name, specialty, avatar, bio, active)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(params.location_id, params.name, params.specialty, params.avatar, params.bio, params.active ? 1 : 0);
        return this.getById(Number(result.lastInsertRowid))!;
      },
      update(id, patch) {
        const current = this.getById(id);
        if (!current) notFound('Doctor');
        const next = { ...current, ...patch };
        database
          .prepare(
            `UPDATE doctors SET location_id = ?, name = ?, specialty = ?, avatar = ?, bio = ?, active = ? WHERE id = ?`,
          )
          .run(next.location_id, next.name, next.specialty, next.avatar, next.bio, next.active ? 1 : 0, id);
        return this.getById(id)!;
      },
      listSchedules(doctorId) {
        return (
          database.prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY weekday').all(doctorId) as Record<
            string,
            unknown
          >[]
        ).map(
          (row) =>
            ({
              id: Number(row.id),
              doctor_id: Number(row.doctor_id),
              weekday: Number(row.weekday),
              start_time: String(row.start_time),
              end_time: String(row.end_time),
            }) satisfies DoctorSchedule,
        );
      },
      replaceSchedules(doctorId, rows) {
        database.prepare('DELETE FROM doctor_schedules WHERE doctor_id = ?').run(doctorId);
        const insert = database.prepare(
          'INSERT INTO doctor_schedules (doctor_id, weekday, start_time, end_time) VALUES (?, ?, ?, ?)',
        );
        for (const row of rows) {
          insert.run(doctorId, row.weekday, row.start_time, row.end_time);
        }
        return this.listSchedules(doctorId);
      },
      listServiceIds(doctorId) {
        return (
          database.prepare('SELECT service_id FROM doctor_services WHERE doctor_id = ?').all(doctorId) as Array<{
            service_id: number;
          }>
        ).map((row) => row.service_id);
      },
      listBySpecialty(specialty, activeOnly = true) {
        const sql = activeOnly
          ? 'SELECT * FROM doctors WHERE specialty = ? AND active = 1 ORDER BY name'
          : 'SELECT * FROM doctors WHERE specialty = ? ORDER BY name';
        return (database.prepare(sql).all(specialty) as Record<string, unknown>[]).map(mapDoctor);
      },
      listEligibleForService(serviceId) {
        const linked = database
          .prepare(
            `SELECT d.* FROM doctors d
             JOIN doctor_services ds ON ds.doctor_id = d.id
             WHERE ds.service_id = ? AND d.active = 1
             ORDER BY d.name`,
          )
          .all(serviceId) as Record<string, unknown>[];
        if (linked.length) return linked.map(mapDoctor);
        const service = database.prepare('SELECT specialty FROM services WHERE id = ?').get(serviceId) as
          | { specialty: SpecialtyCode }
          | undefined;
        if (!service) return [];
        return this.listBySpecialty(service.specialty, true);
      },
    },
    services: {
      list(activeOnly = false) {
        const sql = activeOnly ? 'SELECT * FROM services WHERE active = 1 ORDER BY name' : 'SELECT * FROM services ORDER BY name';
        return (database.prepare(sql).all() as Record<string, unknown>[]).map(mapService);
      },
      getById(id) {
        const row = database.prepare('SELECT * FROM services WHERE id = ?').get(id) as Record<string, unknown> | undefined;
        return row ? mapService(row) : undefined;
      },
      getByVisitReason(reason) {
        const row = database.prepare('SELECT * FROM services WHERE visit_reason = ? AND active = 1 LIMIT 1').get(reason) as
          | Record<string, unknown>
          | undefined;
        return row ? mapService(row) : undefined;
      },
      create(params) {
        const result = database
          .prepare(
            `INSERT INTO services (name, description, duration_minutes, price, specialty, visit_reason, room_type, repeatable, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.name,
            params.description,
            params.duration_minutes,
            params.price,
            params.specialty,
            params.visit_reason,
            params.room_type,
            params.repeatable ? 1 : 0,
            params.active ? 1 : 0,
          );
        return this.getById(Number(result.lastInsertRowid))!;
      },
      update(id, patch) {
        const current = this.getById(id);
        if (!current) notFound('Service');
        const next = { ...current, ...patch };
        database
          .prepare(
            `UPDATE services SET name = ?, description = ?, duration_minutes = ?, price = ?, specialty = ?, visit_reason = ?, room_type = ?, repeatable = ?, active = ?
             WHERE id = ?`,
          )
          .run(
            next.name,
            next.description,
            next.duration_minutes,
            next.price,
            next.specialty,
            next.visit_reason,
            next.room_type,
            next.repeatable ? 1 : 0,
            next.active ? 1 : 0,
            id,
          );
        return this.getById(id)!;
      },
    },
    availability: {
      listBlocks(filters) {
        const where: string[] = [];
        const params: unknown[] = [];
        if (filters?.date) {
          where.push('block_date = ?');
          params.push(filters.date);
        }
        if (filters?.doctorId) {
          where.push('doctor_id = ?');
          params.push(filters.doctorId);
        }
        if (filters?.roomId) {
          where.push('room_id = ?');
          params.push(filters.roomId);
        }
        const sql = `SELECT * FROM schedule_blocks ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY block_date, start_time`;
        return (database.prepare(sql).all(...params) as Record<string, unknown>[]).map(
          (row) =>
            ({
              id: Number(row.id),
              doctor_id: row.doctor_id == null ? null : Number(row.doctor_id),
              room_id: row.room_id == null ? null : Number(row.room_id),
              block_date: String(row.block_date),
              start_time: String(row.start_time),
              end_time: String(row.end_time),
              reason: String(row.reason),
            }) satisfies ScheduleBlock,
        );
      },
      createBlock(params) {
        const result = database
          .prepare(
            `INSERT INTO schedule_blocks (doctor_id, room_id, block_date, start_time, end_time, reason)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(params.doctor_id, params.room_id, params.block_date, params.start_time, params.end_time, params.reason);
        return this.listBlocks({}).find((block) => block.id === Number(result.lastInsertRowid))!;
      },
      deleteBlock(id) {
        database.prepare('DELETE FROM schedule_blocks WHERE id = ?').run(id);
      },
      findBusyIntervals(params) {
        const rows = database
          .prepare(
            `SELECT start_time, end_time, doctor_id, room_id
             FROM appointments
             WHERE appointment_date = ?
               AND status NOT IN ('cancelled')
               AND (? IS NULL OR doctor_id = ?)
               AND (? IS NULL OR room_id = ?)`,
          )
          .all(params.date, params.doctorId ?? null, params.doctorId ?? null, params.roomId ?? null, params.roomId ?? null) as Array<{
          start_time: string;
          end_time: string;
          doctor_id: number;
          room_id: number | null;
        }>;
        return rows;
      },
    },
    appointments: {
      getById: getAppointment,
      list: listAppointments,
      insert(params: Omit<Appointment, 'id' | 'created_at'>) {
        const result = database
          .prepare(
            `INSERT INTO appointments (
              patient_id, doctor_id, service_id, room_id, location_id, treatment_plan_item_id, recall_id,
              appointment_date, start_time, end_time, duration_minutes, status, price, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.patient_id,
            params.doctor_id,
            params.service_id,
            params.room_id,
            params.location_id,
            params.treatment_plan_item_id,
            params.recall_id,
            params.appointment_date,
            params.start_time,
            params.end_time,
            params.duration_minutes,
            params.status,
            params.price,
            params.notes,
          );
        return getAppointment(Number(result.lastInsertRowid))!;
      },
      update(id, patch) {
        const current = getAppointment(id);
        if (!current) notFound('Appointment');
        const next = { ...current, ...patch };
        database
          .prepare(
            `UPDATE appointments SET doctor_id = ?, room_id = ?, appointment_date = ?, start_time = ?, end_time = ?,
             duration_minutes = ?, status = ?, notes = ?, treatment_plan_item_id = ?, recall_id = ?
             WHERE id = ?`,
          )
          .run(
            next.doctor_id,
            next.room_id,
            next.appointment_date,
            next.start_time,
            next.end_time,
            next.duration_minutes,
            next.status,
            next.notes,
            next.treatment_plan_item_id,
            next.recall_id,
            id,
          );
        return getAppointment(id)!;
      },
      listHistory(appointmentId) {
        return (
          database
            .prepare('SELECT * FROM appointment_history WHERE appointment_id = ? ORDER BY created_at')
            .all(appointmentId) as Record<string, unknown>[]
        ).map(
          (row) =>
            ({
              id: Number(row.id),
              appointment_id: Number(row.appointment_id),
              from_status: row.from_status ? (String(row.from_status) as AppointmentStatus) : null,
              to_status: String(row.to_status) as AppointmentStatus,
              note: String(row.note),
              created_at: String(row.created_at),
            }) satisfies AppointmentHistory,
        );
      },
      addHistory(params) {
        const result = database
          .prepare(
            `INSERT INTO appointment_history (appointment_id, from_status, to_status, note)
             VALUES (?, ?, ?, ?)`,
          )
          .run(params.appointment_id, params.from_status, params.to_status, params.note);
        return this.listHistory(params.appointment_id).find((row) => row.id === Number(result.lastInsertRowid))!;
      },
    },
    treatmentPlans: {
      getById: getPlan,
      list(filters) {
        const where: string[] = [];
        const params: unknown[] = [];
        if (filters?.patientId) {
          where.push('patient_id = ?');
          params.push(filters.patientId);
        }
        if (filters?.status) {
          where.push('status = ?');
          params.push(filters.status);
        }
        const rows = database
          .prepare(
            `SELECT * FROM treatment_plans ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`,
          )
          .all(...params) as Record<string, unknown>[];
        return rows.map((row) => withProgress(mapPlan(row), listItems(Number(row.id))));
      },
      create(params) {
        const result = database
          .prepare(
            `INSERT INTO treatment_plans (patient_id, title, status, accepted_at, estimated_total, paid_total, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.patient_id,
            params.title,
            params.status,
            params.accepted_at,
            params.estimated_total,
            params.paid_total,
            params.notes,
          );
        return getPlan(Number(result.lastInsertRowid))!;
      },
      update(id, patch) {
        const current = getPlan(id);
        if (!current) notFound('Treatment plan');
        const next = { ...current, ...patch };
        database
          .prepare(
            `UPDATE treatment_plans SET title = ?, status = ?, accepted_at = ?, estimated_total = ?, paid_total = ?, notes = ?
             WHERE id = ?`,
          )
          .run(next.title, next.status, next.accepted_at, next.estimated_total, next.paid_total, next.notes, id);
        return getPlan(id)!;
      },
      getItem,
      listItems,
      createItem(params: Omit<TreatmentPlanItem, 'id'>) {
        const result = database
          .prepare(
            `INSERT INTO treatment_plan_items (
              treatment_plan_id, tooth_id, service_id, title, description, doctor_specialty, estimated_price,
              status, sort_order, recommended_before, prerequisite_item_id, appointment_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.treatment_plan_id,
            params.tooth_id,
            params.service_id,
            params.title,
            params.description,
            params.doctor_specialty,
            params.estimated_price,
            params.status,
            params.sort_order,
            params.recommended_before,
            params.prerequisite_item_id,
            params.appointment_id,
          );
        return getItem(Number(result.lastInsertRowid))!;
      },
      updateItem(id, patch) {
        const current = getItem(id);
        if (!current) notFound('Treatment plan item');
        const next = { ...current, ...patch };
        database
          .prepare(
            `UPDATE treatment_plan_items SET status = ?, appointment_id = ?, title = ?, description = ?, estimated_price = ?,
             recommended_before = ?, sort_order = ?, tooth_id = ?
             WHERE id = ?`,
          )
          .run(
            next.status,
            next.appointment_id,
            next.title,
            next.description,
            next.estimated_price,
            next.recommended_before,
            next.sort_order,
            next.tooth_id,
            id,
          );
        return getItem(id)!;
      },
      listUnscheduled(nowDate = todayDateString()) {
        const rows = database
          .prepare(
            `SELECT i.*, s.name AS service_name, tp.patient_id AS plan_patient_id, tp.created_at AS plan_created_at
             FROM treatment_plan_items i
             JOIN services s ON s.id = i.service_id
             JOIN treatment_plans tp ON tp.id = i.treatment_plan_id
             WHERE i.status = 'planned' AND i.appointment_id IS NULL AND tp.status NOT IN ('cancelled', 'completed')
             ORDER BY i.recommended_before IS NULL, i.recommended_before, i.id`,
          )
          .all() as Record<string, unknown>[];
        return rows.map((row) => {
          const patient = mapPatient(
            database.prepare('SELECT * FROM patients WHERE id = ?').get(Number(row.plan_patient_id)) as Record<string, unknown>,
          );
          return {
            item: mapItem(row),
            patient,
            days_waiting: Math.max(0, daysBetween(String(row.plan_created_at), nowDate)),
            recommended_before: row.recommended_before ? String(row.recommended_before) : null,
          } satisfies UnscheduledTreatmentItem;
        });
      },
    },
    dentalChart: {
      getChart(patientId): DentalChart {
        const rows = database
          .prepare(
            `SELECT t.*, s.name AS recommended_service_name, s.price AS recommended_price
             FROM teeth t
             LEFT JOIN services s ON s.id = t.recommended_service_id
             WHERE t.patient_id = ?
             ORDER BY t.tooth_id`,
          )
          .all(patientId) as Record<string, unknown>[];
        return {
          patient_id: patientId,
          teeth: rows.map((row) => mapTooth(row, listRecords({ patientId, toothId: String(row.tooth_id) })[0] ?? null)),
        };
      },
      getTooth,
      upsertTooth(params: Omit<Tooth, 'id'>) {
        database
          .prepare(
            `INSERT INTO teeth (patient_id, tooth_id, state, problem, recommended_service_id, notes)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(patient_id, tooth_id) DO UPDATE SET
               state = excluded.state,
               problem = excluded.problem,
               recommended_service_id = excluded.recommended_service_id,
               notes = excluded.notes`,
          )
          .run(params.patient_id, params.tooth_id, params.state, params.problem, params.recommended_service_id, params.notes);
        return getTooth(params.patient_id, params.tooth_id)!;
      },
    },
    treatmentRecords: {
      getById(id) {
        const row = database.prepare(`${RECORD_SELECT} WHERE r.id = ?`).get(id) as Record<string, unknown> | undefined;
        return row ? mapRecord(row) : undefined;
      },
      list: listRecords,
      insert(params: Omit<TreatmentRecord, 'id'>) {
        const result = database
          .prepare(
            `INSERT INTO treatment_records (
              patient_id, appointment_id, tooth_id, service_id, doctor_id, performed_at,
              summary, recommendations, price, treatment_plan_item_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.patient_id,
            params.appointment_id,
            params.tooth_id,
            params.service_id,
            params.doctor_id,
            params.performed_at,
            params.summary,
            params.recommendations,
            params.price,
            params.treatment_plan_item_id,
          );
        return this.getById(Number(result.lastInsertRowid))!;
      },
    },
    recalls: {
      getById(id) {
        const row = database.prepare(`${RECALL_SELECT} WHERE r.id = ?`).get(id) as Record<string, unknown> | undefined;
        return row ? mapRecall(row) : undefined;
      },
      list(filters) {
        const where: string[] = [];
        const params: unknown[] = [];
        if (filters?.patientId) {
          where.push('r.patient_id = ?');
          params.push(filters.patientId);
        }
        if (filters?.status) {
          where.push('r.status = ?');
          params.push(filters.status);
        }
        if (filters?.dueOnOrBefore) {
          where.push('r.due_at <= ?');
          params.push(filters.dueOnOrBefore);
        }
        const sql = `${RECALL_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY r.due_at`;
        return (database.prepare(sql).all(...params) as Record<string, unknown>[]).map(mapRecall);
      },
      insert(params: Omit<Recall, 'id'>) {
        const result = database
          .prepare(
            `INSERT INTO recalls (patient_id, type, due_at, status, related_service_id, related_treatment_plan_id, title, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.patient_id,
            params.type,
            params.due_at,
            params.status,
            params.related_service_id,
            params.related_treatment_plan_id,
            params.title,
            params.notes,
          );
        return this.getById(Number(result.lastInsertRowid))!;
      },
      update(id, patch) {
        const current = this.getById(id);
        if (!current) notFound('Recall');
        const next = { ...current, ...patch };
        database
          .prepare('UPDATE recalls SET status = ?, due_at = ?, title = ?, notes = ? WHERE id = ?')
          .run(next.status, next.due_at, next.title, next.notes, id);
        return this.getById(id)!;
      },
    },
    payments: {
      list(filters) {
        const where: string[] = [];
        const params: unknown[] = [];
        if (filters?.patientId) {
          where.push('patient_id = ?');
          params.push(filters.patientId);
        }
        if (filters?.treatmentPlanId) {
          where.push('treatment_plan_id = ?');
          params.push(filters.treatmentPlanId);
        }
        const sql = `SELECT * FROM payments ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`;
        return (database.prepare(sql).all(...params) as Record<string, unknown>[]).map(
          (row) =>
            ({
              id: Number(row.id),
              patient_id: Number(row.patient_id),
              treatment_plan_id: row.treatment_plan_id == null ? null : Number(row.treatment_plan_id),
              appointment_id: row.appointment_id == null ? null : Number(row.appointment_id),
              amount: Number(row.amount),
              status: String(row.status) as PaymentStatus,
              method: String(row.method),
              created_at: String(row.created_at),
            }) satisfies Payment,
        );
      },
      insert(params) {
        const result = database
          .prepare(
            `INSERT INTO payments (patient_id, treatment_plan_id, appointment_id, amount, status, method)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.patient_id,
            params.treatment_plan_id,
            params.appointment_id,
            params.amount,
            params.status,
            params.method,
          );
        return this.list({}).find((row) => row.id === Number(result.lastInsertRowid))!;
      },
      updateStatus(id, status) {
        database.prepare('UPDATE payments SET status = ? WHERE id = ?').run(status, id);
        const row = this.list({}).find((item) => item.id === id);
        if (!row) return notFound('Payment');
        return row;
      },
      listInvoices(patientId) {
        const sql = patientId
          ? 'SELECT * FROM invoices WHERE patient_id = ? ORDER BY created_at DESC'
          : 'SELECT * FROM invoices ORDER BY created_at DESC';
        const rows = (patientId ? database.prepare(sql).all(patientId) : database.prepare(sql).all()) as Record<string, unknown>[];
        return rows.map(
          (row) =>
            ({
              id: Number(row.id),
              patient_id: Number(row.patient_id),
              treatment_plan_id: row.treatment_plan_id == null ? null : Number(row.treatment_plan_id),
              total: Number(row.total),
              paid_total: Number(row.paid_total),
              status: String(row.status) as Invoice['status'],
              created_at: String(row.created_at),
            }) satisfies Invoice,
        );
      },
      upsertInvoice(params) {
        const existing = database
          .prepare('SELECT id FROM invoices WHERE patient_id = ? AND treatment_plan_id IS ?')
          .get(params.patient_id, params.treatment_plan_id) as { id: number } | undefined;
        if (existing) {
          database
            .prepare('UPDATE invoices SET total = ?, paid_total = ?, status = ? WHERE id = ?')
            .run(params.total, params.paid_total, params.status, existing.id);
          return this.listInvoices(params.patient_id).find((row) => row.id === existing.id)!;
        }
        const result = database
          .prepare(
            `INSERT INTO invoices (patient_id, treatment_plan_id, total, paid_total, status)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(params.patient_id, params.treatment_plan_id, params.total, params.paid_total, params.status);
        return this.listInvoices(params.patient_id).find((row) => row.id === Number(result.lastInsertRowid))!;
      },
    },
    events: {
      publish(name: OutboundEventName, payload: Record<string, unknown>): BusinessEvent {
        const result = database
          .prepare('INSERT INTO events (name, payload) VALUES (?, ?)')
          .run(name, JSON.stringify(payload));
        const row = database.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
        return {
          id: Number(row.id),
          name: String(row.name) as OutboundEventName,
          payload: JSON.parse(String(row.payload)) as Record<string, unknown>,
          created_at: String(row.created_at),
        };
      },
      list(limit = 50) {
        return (database.prepare('SELECT * FROM events ORDER BY id DESC LIMIT ?').all(limit) as Record<string, unknown>[]).map(
          (row) => ({
            id: Number(row.id),
            name: String(row.name) as OutboundEventName,
            payload: JSON.parse(String(row.payload)) as Record<string, unknown>,
            created_at: String(row.created_at),
          }),
        );
      },
    },
    notifications: {
      enqueue(params: { patientId: number; kind: NotificationKind; title: string; body: string }) {
        const result = database
          .prepare('INSERT INTO notifications (patient_id, kind, title, body) VALUES (?, ?, ?, ?)')
          .run(params.patientId, params.kind, params.title, params.body);
        const row = database.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid) as Record<
          string,
          unknown
        >;
        return {
          id: Number(row.id),
          patient_id: Number(row.patient_id),
          kind: String(row.kind) as NotificationKind,
          title: String(row.title),
          body: String(row.body),
          created_at: String(row.created_at),
        } satisfies NotificationRecord;
      },
      list(patientId) {
        const sql = patientId
          ? 'SELECT * FROM notifications WHERE patient_id = ? ORDER BY id DESC'
          : 'SELECT * FROM notifications ORDER BY id DESC';
        const rows = (patientId ? database.prepare(sql).all(patientId) : database.prepare(sql).all()) as Record<string, unknown>[];
        return rows.map(
          (row) =>
            ({
              id: Number(row.id),
              patient_id: Number(row.patient_id),
              kind: String(row.kind) as NotificationKind,
              title: String(row.title),
              body: String(row.body),
              created_at: String(row.created_at),
            }) satisfies NotificationRecord,
        );
      },
    },
    transaction<T>(fn: () => T): T {
      return database.transaction(fn)();
    },
  };
}
