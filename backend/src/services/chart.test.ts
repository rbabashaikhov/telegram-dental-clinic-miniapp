import { describe, expect, it } from 'vitest';
import { completeAppointment } from './treatment.js';
import { seedDemoWorld } from '../test/harness.js';

describe('dental chart', () => {
  it('returns tooth states for the demo patient', () => {
    const world = seedDemoWorld();
    const chart = world.providers.dentalChart.getChart(1);
    const tooth16 = chart.teeth.find((tooth) => tooth.tooth_id === '16');
    const tooth26 = chart.teeth.find((tooth) => tooth.tooth_id === '26');
    expect(tooth16?.state).toBe('treatment_planned');
    expect(tooth26?.state).toBe('treatment_required');
    expect(tooth26?.problem).toMatch(/Кариес/);
  });

  it('links a treatment record to a tooth after visit completion', () => {
    const world = seedDemoWorld();
    const plan = world.providers.treatmentPlans.list({ patientId: 1 })[0];
    const item = plan.items.find((row) => row.tooth_id === '16' && row.status === 'scheduled')!;
    completeAppointment(world.providers, { appointmentId: item.appointment_id! });
    const tooth = world.providers.dentalChart.getTooth(1, '16')!;
    expect(tooth.state).toBe('treated');
    expect(tooth.latest_record?.tooth_id).toBe('16');
    expect(tooth.latest_record?.treatment_plan_item_id).toBe(item.id);
  });
});
