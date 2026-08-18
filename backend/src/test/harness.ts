import Database from 'better-sqlite3';
import { migrate } from '../db/schema.js';
import { seed } from '../db/seed.js';
import { createLocalProviders } from '../providers/local/sqlite.js';
import type { Providers } from '../providers/types.js';
import type { TelegramUser } from '../types.js';
import { addDaysIso, todayDateString } from '../services/time.js';

export const ANNA: TelegramUser = {
  id: 999000001,
  first_name: 'Анна',
  last_name: 'Смирнова',
  username: 'demo_patient',
};

export interface TestWorld {
  db: Database.Database;
  providers: Providers;
  now: Date;
  today: string;
  futureDate: string;
}

export function createEmptyWorld(now = new Date('2026-08-18T09:00:00+03:00')): TestWorld {
  const db = new Database(':memory:');
  migrate(db);
  return {
    db,
    providers: createLocalProviders(db),
    now,
    today: todayDateString(now),
    futureDate: addDaysIso(todayDateString(now), 2),
  };
}

export function seedDemoWorld(now = new Date('2026-08-18T09:00:00+03:00')): TestWorld {
  const db = new Database(':memory:');
  migrate(db);
  seed(db, now);
  return {
    db,
    providers: createLocalProviders(db),
    now,
    today: todayDateString(now),
    futureDate: addDaysIso(todayDateString(now), 2),
  };
}

export function bootstrapClinic(world: TestWorld) {
  world.db
    .prepare(
      `INSERT INTO clinics (name, description, phone, email, address, timezone)
       VALUES ('Test Clinic', '', '', '', '', 'Europe/Moscow')`,
    )
    .run();
  const clinic = world.providers.clinic.getClinic();
  world.db
    .prepare('INSERT INTO locations (clinic_id, name, address, timezone, active) VALUES (?, ?, ?, ?, 1)')
    .run(clinic.id, 'Main', 'Moscow', 'Europe/Moscow');
  const location = world.providers.clinic.listLocations()[0];
  const room = world.db
    .prepare('INSERT INTO rooms (location_id, name, room_type, active) VALUES (?, ?, ?, 1)')
    .run(location.id, 'Кабинет 1', 'general');
  const room2 = world.db
    .prepare('INSERT INTO rooms (location_id, name, room_type, active) VALUES (?, ?, ?, 1)')
    .run(location.id, 'Кабинет 2', 'general');
  return { locationId: location.id, roomId: Number(room.lastInsertRowid), room2Id: Number(room2.lastInsertRowid) };
}

export function createDoctor(
  world: TestWorld,
  locationId: number,
  params?: { name?: string; specialty?: 'therapist' | 'hygienist' },
) {
  const doctor = world.providers.doctors.create({
    location_id: locationId,
    name: params?.name ?? 'Елена Волкова',
    specialty: params?.specialty ?? 'therapist',
    avatar: '',
    bio: 'Test',
    active: true,
  });
  world.providers.doctors.replaceSchedules(doctor.id, [
    { weekday: 2, start_time: '09:00', end_time: '18:00' },
    { weekday: 3, start_time: '09:00', end_time: '18:00' },
    { weekday: 4, start_time: '09:00', end_time: '18:00' },
  ]);
  return doctor;
}

export function createService(
  world: TestWorld,
  params?: { name?: string; duration?: number; price?: number; specialty?: 'therapist' | 'hygienist'; roomType?: string },
) {
  return world.providers.services.create({
    name: params?.name ?? 'Лечение кариеса',
    description: '',
    duration_minutes: params?.duration ?? 60,
    price: params?.price ?? 12000,
    specialty: params?.specialty ?? 'therapist',
    visit_reason: 'therapy',
    room_type: params?.roomType ?? 'general',
    repeatable: false,
    active: true,
  });
}
