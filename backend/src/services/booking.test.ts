import { describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
import { createAppointment, cancelAppointment, rescheduleAppointment } from '../services/booking.js';
import { listAvailability } from './availability.js';
import {
  ANNA,
  bootstrapClinic,
  createDoctor,
  createEmptyWorld,
  createService,
  seedDemoWorld,
} from '../test/harness.js';

describe('booking', () => {
  it('books a free slot', () => {
    const world = createEmptyWorld();
    const { locationId } = bootstrapClinic(world);
    const doctor = createDoctor(world, locationId);
    const service = createService(world);
    world.db.prepare('INSERT INTO doctor_services (doctor_id, service_id) VALUES (?, ?)').run(doctor.id, service.id);
    const appointment = createAppointment(world.providers, {
      user: ANNA,
      serviceId: service.id,
      doctorId: doctor.id,
      date: world.futureDate,
      startTime: '10:00',
      now: world.now,
    });
    expect(appointment.status).toBe('scheduled');
    expect(appointment.doctor_id).toBe(doctor.id);
    expect(appointment.room_id).toBeTruthy();
  });

  it('rejects a doctor conflict', () => {
    const world = createEmptyWorld();
    const { locationId } = bootstrapClinic(world);
    const doctor = createDoctor(world, locationId);
    const service = createService(world);
    world.db.prepare('INSERT INTO doctor_services (doctor_id, service_id) VALUES (?, ?)').run(doctor.id, service.id);
    createAppointment(world.providers, {
      user: ANNA,
      serviceId: service.id,
      doctorId: doctor.id,
      date: world.futureDate,
      startTime: '10:00',
      now: world.now,
    });
    expect(() =>
      createAppointment(world.providers, {
        user: { id: 42, first_name: 'Other' },
        serviceId: service.id,
        doctorId: doctor.id,
        date: world.futureDate,
        startTime: '10:00',
        now: world.now,
      }),
    ).toThrow(AppError);
  });

  it('rejects a room conflict when the only matching room is busy', () => {
    const world = createEmptyWorld();
    const { locationId, roomId } = bootstrapClinic(world);
    world.db.prepare('UPDATE rooms SET active = 0 WHERE id != ?').run(roomId);
    const doctorA = createDoctor(world, locationId, { name: 'A' });
    const doctorB = createDoctor(world, locationId, { name: 'B' });
    const service = createService(world, { roomType: 'general' });
    world.db.prepare('INSERT INTO doctor_services (doctor_id, service_id) VALUES (?, ?)').run(doctorA.id, service.id);
    world.db.prepare('INSERT INTO doctor_services (doctor_id, service_id) VALUES (?, ?)').run(doctorB.id, service.id);
    createAppointment(world.providers, {
      user: ANNA,
      serviceId: service.id,
      doctorId: doctorA.id,
      date: world.futureDate,
      startTime: '10:00',
      now: world.now,
    });
    expect(() =>
      createAppointment(world.providers, {
        user: { id: 77, first_name: 'Second' },
        serviceId: service.id,
        doctorId: doctorB.id,
        date: world.futureDate,
        startTime: '10:00',
        now: world.now,
      }),
    ).toThrow(/room|Slot/i);
  });

  it('rejects a blocked slot', () => {
    const world = createEmptyWorld();
    const { locationId } = bootstrapClinic(world);
    const doctor = createDoctor(world, locationId);
    const service = createService(world);
    world.db.prepare('INSERT INTO doctor_services (doctor_id, service_id) VALUES (?, ?)').run(doctor.id, service.id);
    world.providers.availability.createBlock({
      doctor_id: doctor.id,
      room_id: null,
      block_date: world.futureDate,
      start_time: '09:00',
      end_time: '12:00',
      reason: 'обучение',
    });
    expect(() =>
      createAppointment(world.providers, {
        user: ANNA,
        serviceId: service.id,
        doctorId: doctor.id,
        date: world.futureDate,
        startTime: '10:00',
        now: world.now,
      }),
    ).toThrow(/blocked|Slot/i);
  });

  it('any-doctor assigns a free eligible doctor', () => {
    const world = createEmptyWorld();
    const { locationId } = bootstrapClinic(world);
    const busy = createDoctor(world, locationId, { name: 'Busy' });
    const free = createDoctor(world, locationId, { name: 'Free' });
    const service = createService(world);
    world.db.prepare('INSERT INTO doctor_services (doctor_id, service_id) VALUES (?, ?)').run(busy.id, service.id);
    world.db.prepare('INSERT INTO doctor_services (doctor_id, service_id) VALUES (?, ?)').run(free.id, service.id);
    createAppointment(world.providers, {
      user: ANNA,
      serviceId: service.id,
      doctorId: busy.id,
      date: world.futureDate,
      startTime: '10:00',
      now: world.now,
    });
    const booked = createAppointment(world.providers, {
      user: { id: 88, first_name: 'Second' },
      serviceId: service.id,
      date: world.futureDate,
      startTime: '10:00',
      now: world.now,
    });
    expect(booked.doctor_id).toBe(free.id);
  });

  it('cancels an appointment', () => {
    const world = seedDemoWorld();
    const upcoming = world.providers.appointments
      .list({ patientId: 1 })
      .find((row) => row.status === 'scheduled');
    expect(upcoming).toBeTruthy();
    const cancelled = cancelAppointment(world.providers, { user: ANNA, appointmentId: upcoming!.id });
    expect(cancelled.status).toBe('cancelled');
  });

  it('reschedules an appointment to a free slot', () => {
    const world = seedDemoWorld();
    const upcoming = world.providers.appointments
      .list({ patientId: 1 })
      .find((row) => row.status === 'scheduled' && row.treatment_plan_item_id);
    expect(upcoming).toBeTruthy();
    const slots = listAvailability(world.providers, {
      serviceId: upcoming!.service_id,
      date: world.futureDate,
      doctorId: upcoming!.doctor_id,
      now: world.now,
    }).filter((slot) => slot.start_time !== upcoming!.start_time);
    const target = slots.find((slot) => slot.start_time === '11:30') ?? slots[0];
    const moved = rescheduleAppointment(world.providers, {
      user: ANNA,
      appointmentId: upcoming!.id,
      date: target.date,
      startTime: target.start_time,
      doctorId: upcoming!.doctor_id,
      now: world.now,
    });
    expect(moved.start_time).toBe(target.start_time);
    expect(moved.status).toBe('scheduled');
  });
});
