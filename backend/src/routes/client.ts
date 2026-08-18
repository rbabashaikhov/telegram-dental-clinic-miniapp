import { Router } from 'express';
import { z } from 'zod';
import { publicAppConfig } from '../config.js';
import { errorBody, statusFromError } from '../errors.js';
import { authMiddleware } from '../middleware/auth.js';
import { bookingRateLimit } from '../middleware/rateLimit.js';
import type { Providers } from '../providers/types.js';
import { listAvailability } from '../services/availability.js';
import {
  bookTreatmentItem,
  cancelAppointment,
  createAppointment,
  rescheduleAppointment,
} from '../services/booking.js';
import { getPatientForm, getPortal, listCatalog, resolvePatient } from '../services/portal.js';

const idParam = z.coerce.number().int().positive();
const bookingBody = z.object({
  serviceId: z.number().int().positive(),
  doctorId: z.number().int().positive().nullable().optional(),
  date: z.string(),
  startTime: z.string(),
  patientId: z.number().int().positive().optional(),
  recallId: z.number().int().positive().optional(),
});

function patientIdFrom(req: { header: (name: string) => string | undefined; query: Record<string, unknown> }): number | undefined {
  const header = req.header('x-patient-id');
  const query = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
  const raw = header || query;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function sendError(res: { status: (code: number) => { json: (body: unknown) => void } }, error: unknown): void {
  res.status(statusFromError(error)).json(errorBody(error));
}

export function createPublicRouter(): Router {
  const router = Router();
  router.get('/config', (_req, res) => {
    res.json({ data: publicAppConfig() });
  });
  return router;
}

export function createClientRouter(providers: Providers): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/me', (req, res) => {
    const user = req.auth!.telegramUser;
    const { patient, created } = providers.patients.upsertTelegramOwner(user);
    res.json({
      data: {
        user,
        isDemo: req.auth!.isDemo,
        patient,
        created,
        family: providers.patients.listFamily(user.id),
      },
    });
  });

  router.get('/me/portal', (req, res) => {
    try {
      const user = req.auth!.telegramUser;
      providers.patients.upsertTelegramOwner(user);
      res.json({ data: getPortal(providers, user.id, patientIdFrom(req)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/patients/:id/family', (req, res) => {
    try {
      const user = req.auth!.telegramUser;
      const patient = providers.patients.assertFamilyAccess(user.id, idParam.parse(req.params.id));
      res.json({ data: { patient, family: providers.patients.listFamily(user.id) } });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/doctors', (_req, res) => {
    res.json({ data: listCatalog(providers).doctors });
  });

  router.get('/services', (_req, res) => {
    res.json({ data: listCatalog(providers).services });
  });

  router.get('/availability', (req, res) => {
    try {
      const query = z
        .object({
          serviceId: z.coerce.number().int().positive(),
          date: z.string(),
          doctorId: z.coerce.number().int().positive().optional(),
        })
        .parse(req.query);
      res.json({
        data: listAvailability(providers, {
          serviceId: query.serviceId,
          date: query.date,
          doctorId: query.doctorId,
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/appointments', (req, res) => {
    try {
      const user = req.auth!.telegramUser;
      const patient = resolvePatient(providers, user.id, patientIdFrom(req));
      res.json({ data: providers.appointments.list({ patientId: patient.id }) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/appointments', bookingRateLimit, (req, res) => {
    try {
      const body = bookingBody.parse(req.body);
      const appointment = createAppointment(providers, {
        user: req.auth!.telegramUser,
        patientId: body.patientId ?? patientIdFrom(req),
        serviceId: body.serviceId,
        doctorId: body.doctorId,
        date: body.date,
        startTime: body.startTime,
        recallId: body.recallId,
      });
      res.status(201).json({ data: appointment });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/appointments/:id/cancel', (req, res) => {
    try {
      res.json({
        data: cancelAppointment(providers, {
          user: req.auth!.telegramUser,
          appointmentId: idParam.parse(req.params.id),
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/appointments/:id/reschedule', (req, res) => {
    try {
      const body = z
        .object({
          date: z.string(),
          startTime: z.string(),
          doctorId: z.number().int().positive().nullable().optional(),
        })
        .parse(req.body);
      res.json({
        data: rescheduleAppointment(providers, {
          user: req.auth!.telegramUser,
          appointmentId: idParam.parse(req.params.id),
          date: body.date,
          startTime: body.startTime,
          doctorId: body.doctorId,
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/treatment-plans', (req, res) => {
    try {
      const patient = resolvePatient(providers, req.auth!.telegramUser.id, patientIdFrom(req));
      res.json({ data: providers.treatmentPlans.list({ patientId: patient.id }) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/treatment-plans/:id', (req, res) => {
    try {
      const plan = providers.treatmentPlans.getById(idParam.parse(req.params.id));
      if (!plan) {
        res.status(404).json({ error: 'Treatment plan not found', code: 'NOT_FOUND' });
        return;
      }
      providers.patients.assertFamilyAccess(req.auth!.telegramUser.id, plan.patient_id);
      res.json({ data: plan });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/treatment-plan-items/:id/book', bookingRateLimit, (req, res) => {
    try {
      const body = z
        .object({
          date: z.string(),
          startTime: z.string(),
          doctorId: z.number().int().positive().nullable().optional(),
        })
        .parse(req.body);
      res.status(201).json({
        data: bookTreatmentItem(providers, {
          user: req.auth!.telegramUser,
          itemId: idParam.parse(req.params.id),
          doctorId: body.doctorId,
          date: body.date,
          startTime: body.startTime,
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/dental-chart', (req, res) => {
    try {
      const patient = resolvePatient(providers, req.auth!.telegramUser.id, patientIdFrom(req));
      res.json({ data: providers.dentalChart.getChart(patient.id) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/dental-chart/:toothId', (req, res) => {
    try {
      const patient = resolvePatient(providers, req.auth!.telegramUser.id, patientIdFrom(req));
      const tooth = providers.dentalChart.getTooth(patient.id, String(req.params.toothId));
      if (!tooth) {
        res.status(404).json({ error: 'Tooth not found', code: 'NOT_FOUND' });
        return;
      }
      res.json({ data: tooth });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/treatment-records', (req, res) => {
    try {
      const patient = resolvePatient(providers, req.auth!.telegramUser.id, patientIdFrom(req));
      res.json({ data: providers.treatmentRecords.list({ patientId: patient.id }) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/treatment-records/:id', (req, res) => {
    try {
      const record = providers.treatmentRecords.getById(idParam.parse(req.params.id));
      if (!record) {
        res.status(404).json({ error: 'Record not found', code: 'NOT_FOUND' });
        return;
      }
      providers.patients.assertFamilyAccess(req.auth!.telegramUser.id, record.patient_id);
      res.json({ data: record });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/recalls', (req, res) => {
    try {
      const patient = resolvePatient(providers, req.auth!.telegramUser.id, patientIdFrom(req));
      res.json({ data: providers.recalls.list({ patientId: patient.id }) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/forms', (req, res) => {
    try {
      const patient = resolvePatient(providers, req.auth!.telegramUser.id, patientIdFrom(req));
      res.json({ data: getPatientForm(providers, patient.id) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.put('/forms', (req, res) => {
    try {
      const patient = resolvePatient(providers, req.auth!.telegramUser.id, patientIdFrom(req));
      const body = z
        .object({
          allergies: z.string().default(''),
          medications: z.string().default(''),
          chronic_conditions: z.string().default(''),
          pregnancy: z.boolean().default(false),
          previous_surgery: z.string().default(''),
          notes: z.string().default(''),
        })
        .parse(req.body);
      res.json({ data: providers.patients.upsertForm(patient.id, body) });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}
