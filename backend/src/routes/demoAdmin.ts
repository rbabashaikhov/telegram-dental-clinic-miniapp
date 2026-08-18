import { Router } from 'express';
import { demoAdminPreviewMiddleware } from '../middleware/adminAuth.js';
import type { Providers } from '../providers/types.js';
import { getAdminDashboard } from '../services/admin.js';

export function createDemoAdminRouter(providers: Providers): Router {
  const router = Router();
  router.use(demoAdminPreviewMiddleware);

  router.get('/dashboard', (_req, res) => {
    res.json({ data: getAdminDashboard(providers) });
  });

  router.get('/appointments', (_req, res) => {
    res.json({ data: providers.appointments.list() });
  });

  router.get('/unscheduled', (_req, res) => {
    const items = providers.treatmentPlans.listUnscheduled();
    res.json({
      data: {
        items,
        total_value: items.reduce((sum, row) => sum + row.item.estimated_price, 0),
      },
    });
  });

  router.get('/patients', (_req, res) => {
    res.json({ data: providers.patients.listAll() });
  });

  router.get('/treatment-plans', (_req, res) => {
    res.json({ data: providers.treatmentPlans.list() });
  });

  router.get('/recalls', (_req, res) => {
    res.json({ data: providers.recalls.list() });
  });

  router.get('/treatment-records', (_req, res) => {
    res.json({ data: providers.treatmentRecords.list() });
  });

  router.get('/doctors', (_req, res) => {
    res.json({ data: providers.doctors.list(false) });
  });

  router.get('/services', (_req, res) => {
    res.json({ data: providers.services.list(false) });
  });

  router.get('/schedule/blocks', (_req, res) => {
    res.json({ data: providers.availability.listBlocks() });
  });

  return router;
}
