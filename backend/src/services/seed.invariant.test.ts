import { describe, expect, it } from 'vitest';
import { getAdminDashboard } from './admin.js';
import { seedDemoWorld } from '../test/harness.js';

describe('demo seed', () => {
  it('exposes Anna’s plan finances and unscheduled clinic value', () => {
    const world = seedDemoWorld();
    const plan = world.providers.treatmentPlans.list({ patientId: 1 })[0];
    expect(plan.estimated_total).toBe(74000);
    expect(plan.paid_total).toBe(28000);
    expect(plan.completed_items).toBe(2);
    expect(plan.total_items).toBe(5);
    const dash = getAdminDashboard(world.providers, world.now);
    expect(dash.unscheduled_treatment_value).toBe(386000);
  });
});
