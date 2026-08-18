import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

const databasePath =
  process.env.DATABASE_PATH ||
  path.join(process.cwd(), 'data', 'dental.db');

const dir = path.dirname(databasePath);
if (!fs.existsSync(dir) && process.env.NODE_ENV !== 'test') {
  fs.mkdirSync(dir, { recursive: true });
}

export const db: Database.Database =
  process.env.NODE_ENV === 'test' ? new Database(':memory:') : new Database(databasePath);

if (process.env.NODE_ENV !== 'test') {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

export function applySchema(database: Database.Database): void {
  database.pragma('foreign_keys = ON');

  database.exec(`
    CREATE TABLE IF NOT EXISTS clinics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      timezone TEXT NOT NULL DEFAULT 'Europe/Moscow'
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      room_type TEXT NOT NULL DEFAULT 'general',
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id INTEGER,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      birth_date TEXT,
      username TEXT,
      relation TEXT NOT NULL DEFAULT 'self',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_telegram_user_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      relation TEXT NOT NULL DEFAULT 'self',
      is_primary INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      specialty TEXT NOT NULL,
      visit_reason TEXT,
      room_type TEXT NOT NULL DEFAULT 'general',
      repeatable INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS doctor_services (
      doctor_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      PRIMARY KEY (doctor_id, service_id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS treatment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'proposed', 'accepted', 'in_progress', 'completed', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      accepted_at TEXT,
      estimated_total INTEGER NOT NULL DEFAULT 0,
      paid_total INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS treatment_plan_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      treatment_plan_id INTEGER NOT NULL,
      tooth_id TEXT,
      service_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      doctor_specialty TEXT NOT NULL,
      estimated_price INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'scheduled', 'in_progress', 'completed', 'cancelled')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      recommended_before TEXT,
      prerequisite_item_id INTEGER,
      appointment_id INTEGER,
      FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id),
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (prerequisite_item_id) REFERENCES treatment_plan_items(id)
    );

    CREATE TABLE IF NOT EXISTS teeth (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      tooth_id TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'healthy'
        CHECK (state IN ('healthy', 'treatment_required', 'treatment_planned', 'treated', 'crown', 'implant', 'missing')),
      problem TEXT NOT NULL DEFAULT '',
      recommended_service_id INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      UNIQUE (patient_id, tooth_id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (recommended_service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      room_id INTEGER,
      location_id INTEGER NOT NULL,
      treatment_plan_item_id INTEGER,
      recall_id INTEGER,
      appointment_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
      price INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS appointment_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    );

    CREATE TABLE IF NOT EXISTS treatment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      appointment_id INTEGER,
      tooth_id TEXT,
      service_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      performed_at TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      recommendations TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL DEFAULT 0,
      treatment_plan_item_id INTEGER,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS recalls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      type TEXT NOT NULL
        CHECK (type IN ('checkup', 'hygiene', 'treatment_followup', 'custom')),
      due_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'due', 'booked', 'completed', 'dismissed')),
      related_service_id INTEGER,
      related_treatment_plan_id INTEGER,
      title TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (related_service_id) REFERENCES services(id),
      FOREIGN KEY (related_treatment_plan_id) REFERENCES treatment_plans(id)
    );

    CREATE TABLE IF NOT EXISTS patient_forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL UNIQUE,
      allergies TEXT NOT NULL DEFAULT '',
      medications TEXT NOT NULL DEFAULT '',
      chronic_conditions TEXT NOT NULL DEFAULT '',
      pregnancy INTEGER NOT NULL DEFAULT 0,
      previous_surgery TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      treatment_plan_id INTEGER,
      appointment_id INTEGER,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
      method TEXT NOT NULL DEFAULT 'mock',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      treatment_plan_id INTEGER,
      total INTEGER NOT NULL DEFAULT 0,
      paid_total INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'paid', 'void')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS schedule_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER,
      room_id INTEGER,
      block_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date
      ON appointments (doctor_id, appointment_date, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_room_date
      ON appointments (room_id, appointment_date, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_patient
      ON appointments (patient_id, appointment_date);
    CREATE INDEX IF NOT EXISTS idx_family_owner
      ON family_members (owner_telegram_user_id);
    CREATE INDEX IF NOT EXISTS idx_teeth_patient
      ON teeth (patient_id);
    CREATE INDEX IF NOT EXISTS idx_plan_items_plan
      ON treatment_plan_items (treatment_plan_id, sort_order);
  `);
}

export function migrate(database: Database.Database = db): void {
  applySchema(database);
}
