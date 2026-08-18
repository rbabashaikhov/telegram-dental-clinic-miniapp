import { describe, expect, it } from 'vitest';
import { createAppointment } from './booking.js';
import { createRecall } from './recall.js';
import { ANNA, seedDemoWorld } from '../test/harness.js';
import { addDaysIso } from './time.js';

describe('recall', () => {
  it('creates a recall', () => {
    const world = seedDemoWorld();
    const recall = createRecall(world.providers, {
      patientId: 1,
      type: 'checkup',
      dueAt: addDaysIso(world.today, 10),
      title: 'Контроль',
    });
    expect(recall.status).toBe('scheduled');
    expect(world.providers.recalls.getById(recall.id)?.title).toBe('Контроль');
  });

  it('marks due recalls', () => {
    const world = seedDemoWorld();
    const due = world.providers.recalls.list({ patientId: 2 }).find((row) => row.status === 'due');
    expect(due).toBeTruthy();
  });

  it('converts a recall to booked after an appointment is created from it', () => {
    const world = seedDemoWorld();
    const recall = world.providers.recalls.list({ patientId: 1 }).find((row) => row.type === 'hygiene')!;
    const service = world.providers.services.getById(recall.related_service_id!)!;
    const appointment = createAppointment(world.providers, {
      user: ANNA,
      serviceId: service.id,
      date: addDaysIso(world.today, 6),
      startTime: '10:00',
      recallId: recall.id,
      now: world.now,
    });
    expect(appointment.recall_id).toBe(recall.id);
    expect(world.providers.recalls.getById(recall.id)?.status).toBe('booked');
  });
});
