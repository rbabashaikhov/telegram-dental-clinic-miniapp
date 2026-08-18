import { afterEach, describe, expect, it } from 'vitest';
import request from './http.js';
import { createApp } from '../app.js';
import { seedDemoWorld } from '../test/harness.js';

const originalAdmin = process.env.ADMIN_TOKEN;
const originalDemo = process.env.ALLOW_DEMO_MODE;
const originalNode = process.env.NODE_ENV;

afterEach(() => {
  process.env.ADMIN_TOKEN = originalAdmin;
  process.env.ALLOW_DEMO_MODE = originalDemo;
  process.env.NODE_ENV = originalNode;
});

describe('HTTP security', () => {
  it('rejects unauthorized admin writes', async () => {
    process.env.ADMIN_TOKEN = 'secret-admin';
    process.env.ALLOW_DEMO_MODE = 'true';
    const world = seedDemoWorld();
    const app = createApp(world.providers);
    const response = await request(app, 'POST', '/api/admin/appointments/1/complete', { body: {} });
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('ADMIN_UNAUTHORIZED');
  });

  it('allows admin writes with the configured token', async () => {
    process.env.ADMIN_TOKEN = 'secret-admin';
    const world = seedDemoWorld();
    const app = createApp(world.providers);
    const upcoming = world.providers.appointments.list({ patientId: 1 }).find((row) => row.status === 'scheduled')!;
    const response = await request(app, 'POST', `/api/admin/appointments/${upcoming.id}/complete`, {
      headers: { 'x-admin-token': 'secret-admin' },
      body: { summary: 'Готово' },
    });
    expect(response.status).toBe(200);
    expect(world.providers.appointments.getById(upcoming.id)?.status).toBe('completed');
  });

  it('does not allow /api/demo-admin to mutate', async () => {
    process.env.ALLOW_DEMO_MODE = 'true';
    process.env.FEATURE_DEMO_ADMIN_PREVIEW = 'true';
    const world = seedDemoWorld();
    const app = createApp(world.providers);
    const upcoming = world.providers.appointments.list({ patientId: 1 }).find((row) => row.status === 'scheduled')!;
    const response = await request(app, 'POST', `/api/demo-admin/appointments/${upcoming.id}/complete`, {
      body: {},
    });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('DEMO_ADMIN_READONLY');
    expect(world.providers.appointments.getById(upcoming.id)?.status).toBe('scheduled');
  });
});
