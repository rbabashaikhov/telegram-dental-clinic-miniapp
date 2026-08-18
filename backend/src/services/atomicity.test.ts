import { describe, expect, it } from 'vitest';
import { completeAppointment } from './treatment.js';
import { seedDemoWorld } from '../test/harness.js';

describe('completion atomicity', () => {
  it('does not leave appointment completed if treatment item update fails', () => {
    const world = seedDemoWorld();
    const plan = world.providers.treatmentPlans.list({ patientId: 1 })[0];
    const item = plan.items.find((row) => row.status === 'scheduled')!;
    const appointmentId = item.appointment_id!;
    expect(() =>
      completeAppointment(world.providers, {
        appointmentId,
        failAfterAppointment: true,
      }),
    ).toThrow(/Forced completion failure/);
    const appointment = world.providers.appointments.getById(appointmentId)!;
    const still = world.providers.treatmentPlans.getItem(item.id)!;
    expect(appointment.status).toBe('scheduled');
    expect(still.status).toBe('scheduled');
  });
});
