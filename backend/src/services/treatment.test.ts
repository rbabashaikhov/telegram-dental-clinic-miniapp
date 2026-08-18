import { describe, expect, it } from 'vitest';
import { bookTreatmentItem } from './booking.js';
import { completeAppointment, createTreatmentPlan, recalculatePlanProgress } from './treatment.js';
import { ANNA, seedDemoWorld } from '../test/harness.js';
import { addDaysIso } from './time.js';

describe('treatment plan', () => {
  it('creates a plan with planned items', () => {
    const world = seedDemoWorld();
    const service = world.providers.services.list(true)[0];
    const plan = createTreatmentPlan(world.providers, {
      patientId: 1,
      title: 'Новый план',
      items: [{ serviceId: service.id, title: service.name, estimatedPrice: service.price }],
    });
    expect(plan.status).toBe('proposed');
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].status).toBe('planned');
  });

  it('schedules a treatment item and links the appointment', () => {
    const world = seedDemoWorld();
    const service = world.providers.services.list(true).find((row) => row.name.includes('кариеса'))!;
    const plan = createTreatmentPlan(world.providers, {
      patientId: 1,
      title: 'Дополнительный этап',
      items: [{ serviceId: service.id, title: 'Лечение зуба 17', estimatedPrice: 12000, toothId: '17' }],
    });
    const item = plan.items[0];
    const date = addDaysIso(world.today, 4);
    const appointment = bookTreatmentItem(world.providers, {
      user: ANNA,
      itemId: item.id,
      date,
      startTime: '10:00',
      now: world.now,
    });
    const updated = world.providers.treatmentPlans.getItem(item.id)!;
    expect(updated.status).toBe('scheduled');
    expect(updated.appointment_id).toBe(appointment.id);
    expect(appointment.treatment_plan_item_id).toBe(item.id);
  });

  it('completing an appointment completes the linked treatment item and recalculates progress', () => {
    const world = seedDemoWorld();
    const planBefore = world.providers.treatmentPlans.list({ patientId: 1 })[0];
    expect(planBefore.completed_items).toBe(2);
    const upcoming = planBefore.items.find((row) => row.status === 'scheduled')!;
    const result = completeAppointment(world.providers, {
      appointmentId: upcoming.appointment_id!,
      summary: 'Кариес 16 закрыт',
      recommendations: 'Следующий этап — зуб 26',
    });
    expect(result.appointment.status).toBe('completed');
    expect(result.record.treatment_plan_item_id).toBe(upcoming.id);
    const item = world.providers.treatmentPlans.getItem(upcoming.id)!;
    expect(item.status).toBe('completed');
    const plan = world.providers.treatmentPlans.getById(planBefore.id)!;
    expect(plan.completed_items).toBe(3);
    expect(plan.progress_percent).toBe(60);
    expect(plan.status).toBe('in_progress');
    expect(plan.items.find((row) => row.title.includes('26'))?.status).toBe('planned');
  });

  it('marks the plan completed when every item is completed', () => {
    const world = seedDemoWorld();
    const plan = world.providers.treatmentPlans.list({ patientId: 1 })[0];
    for (const item of plan.items) {
      if (item.status !== 'completed') {
        world.providers.treatmentPlans.updateItem(item.id, { status: 'completed' });
      }
    }
    const updated = recalculatePlanProgress(world.providers, plan.id);
    expect(updated.status).toBe('completed');
    expect(updated.progress_percent).toBe(100);
  });
});
