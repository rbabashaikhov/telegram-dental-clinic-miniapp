import { Router } from 'express';
import { z } from 'zod';
import { errorBody, statusFromError } from '../errors.js';
import { adminReadMiddleware, adminWriteMiddleware } from '../middleware/adminAuth.js';
import type { Providers } from '../providers/types.js';
import { getAdminDashboard } from '../services/admin.js';
import { cancelAppointment, confirmAppointment, createAppointment, markNoShow, rescheduleAppointment } from '../services/booking.js';
import { DEMO_USER } from '../middleware/auth.js';
import { acceptTreatmentPlan, completeAppointment, createTreatmentPlan, markPlanPaid } from '../services/treatment.js';
import { createRecall, dismissRecall } from '../services/recall.js';

const idParam = z.coerce.number().int().positive();

function sendError(res: { status: (code: number) => { json: (body: unknown) => void } }, error: unknown): void {
  res.status(statusFromError(error)).json(errorBody(error));
}

export function createAdminRouter(providers: Providers): Router {
  const router = Router();
  router.use(adminReadMiddleware);

  router.get('/dashboard', (_req, res) => {
    res.json({ data: getAdminDashboard(providers) });
  });

  router.get('/appointments', (req, res) => {
    const query = z
      .object({
        date: z.string().optional(),
        status: z.string().optional(),
        patientId: z.coerce.number().int().positive().optional(),
      })
      .parse(req.query);
    res.json({
      data: providers.appointments.list({
        date: query.date,
        status: query.status as never,
        patientId: query.patientId,
      }),
    });
  });

  router.get('/patients', (_req, res) => {
    res.json({ data: providers.patients.listAll() });
  });

  router.get('/patients/:id', (req, res) => {
    const patient = providers.patients.getById(idParam.parse(req.params.id));
    if (!patient) {
      res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({
      data: {
        patient,
        plans: providers.treatmentPlans.list({ patientId: patient.id }),
        appointments: providers.appointments.list({ patientId: patient.id }),
        chart: providers.dentalChart.getChart(patient.id),
        records: providers.treatmentRecords.list({ patientId: patient.id }),
        recalls: providers.recalls.list({ patientId: patient.id }),
        form: providers.patients.getForm(patient.id) ?? null,
      },
    });
  });

  router.get('/doctors', (_req, res) => {
    res.json({
      data: providers.doctors.list(false).map((doctor) => ({
        ...doctor,
        schedule: providers.doctors.listSchedules(doctor.id),
      })),
    });
  });

  router.get('/services', (_req, res) => {
    res.json({ data: providers.services.list(false) });
  });

  router.get('/treatment-plans', (_req, res) => {
    res.json({ data: providers.treatmentPlans.list() });
  });

  router.get('/treatment-plans/:id', (req, res) => {
    const plan = providers.treatmentPlans.getById(idParam.parse(req.params.id));
    if (!plan) {
      res.status(404).json({ error: 'Treatment plan not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: plan });
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

  router.get('/dental-chart/:patientId', (req, res) => {
    res.json({ data: providers.dentalChart.getChart(idParam.parse(req.params.patientId)) });
  });

  router.get('/treatment-records', (req, res) => {
    const patientId = req.query.patientId ? idParam.parse(req.query.patientId) : undefined;
    res.json({ data: providers.treatmentRecords.list({ patientId }) });
  });

  router.get('/recalls', (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ data: providers.recalls.list({ status: status as never }) });
  });

  router.get('/schedule/blocks', (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    res.json({ data: providers.availability.listBlocks({ date }) });
  });

  router.get('/payments', (req, res) => {
    const patientId = req.query.patientId ? idParam.parse(req.query.patientId) : undefined;
    res.json({ data: providers.payments.list({ patientId }) });
  });

  router.get('/events', (_req, res) => {
    res.json({ data: providers.events.list(80) });
  });

  router.use(adminWriteMiddleware);

  router.post('/appointments/:id/confirm', (req, res) => {
    try {
      res.json({ data: confirmAppointment(providers, idParam.parse(req.params.id)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/appointments/:id/complete', (req, res) => {
    try {
      const body = z
        .object({
          summary: z.string().optional(),
          recommendations: z.string().optional(),
        })
        .parse(req.body ?? {});
      res.json({
        data: completeAppointment(providers, {
          appointmentId: idParam.parse(req.params.id),
          summary: body.summary,
          recommendations: body.recommendations,
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/appointments/:id/no-show', (req, res) => {
    try {
      res.json({ data: markNoShow(providers, idParam.parse(req.params.id)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/appointments/:id/cancel', (req, res) => {
    try {
      res.json({
        data: cancelAppointment(providers, {
          appointmentId: idParam.parse(req.params.id),
          asAdmin: true,
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/appointments/:id/reschedule', (req, res) => {
    try {
      const body = z.object({ date: z.string(), startTime: z.string(), doctorId: z.number().optional() }).parse(req.body);
      res.json({
        data: rescheduleAppointment(providers, {
          appointmentId: idParam.parse(req.params.id),
          date: body.date,
          startTime: body.startTime,
          doctorId: body.doctorId,
          asAdmin: true,
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/appointments', (req, res) => {
    try {
      const body = z
        .object({
          patientId: z.number().int().positive(),
          serviceId: z.number().int().positive(),
          doctorId: z.number().int().positive().nullable().optional(),
          date: z.string(),
          startTime: z.string(),
        })
        .parse(req.body);
      res.status(201).json({
        data: createAppointment(providers, {
          user: DEMO_USER,
          patientId: body.patientId,
          serviceId: body.serviceId,
          doctorId: body.doctorId,
          date: body.date,
          startTime: body.startTime,
          asAdmin: true,
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/patients', (req, res) => {
    try {
      const body = z
        .object({
          first_name: z.string(),
          last_name: z.string(),
          phone: z.string().optional(),
          email: z.string().optional(),
        })
        .parse(req.body);
      const created = providers.patients.upsertTelegramOwner({
        id: Date.now() % 1_000_000_000,
        first_name: body.first_name,
        last_name: body.last_name,
      });
      res.status(201).json({
        data: providers.patients.update(created.patient.id, {
          phone: body.phone || '',
          email: body.email || '',
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/doctors/:id', (req, res) => {
    try {
      const body = z
        .object({
          name: z.string().optional(),
          bio: z.string().optional(),
          active: z.boolean().optional(),
        })
        .parse(req.body);
      res.json({ data: providers.doctors.update(idParam.parse(req.params.id), body) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/services/:id', (req, res) => {
    try {
      const body = z
        .object({
          name: z.string().optional(),
          price: z.number().optional(),
          duration_minutes: z.number().optional(),
          active: z.boolean().optional(),
        })
        .parse(req.body);
      res.json({ data: providers.services.update(idParam.parse(req.params.id), body) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/treatment-plans', (req, res) => {
    try {
      const body = z
        .object({
          patientId: z.number().int().positive(),
          title: z.string(),
          notes: z.string().optional(),
          items: z.array(
            z.object({
              serviceId: z.number().int().positive(),
              title: z.string(),
              description: z.string().optional(),
              toothId: z.string().nullable().optional(),
              estimatedPrice: z.number(),
              recommendedBefore: z.string().nullable().optional(),
            }),
          ),
        })
        .parse(req.body);
      res.status(201).json({ data: createTreatmentPlan(providers, body) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/treatment-plans/:id/accept', (req, res) => {
    try {
      res.json({ data: acceptTreatmentPlan(providers, idParam.parse(req.params.id)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/treatment-plans/:id/pay', (req, res) => {
    try {
      const body = z.object({ amount: z.number().int().positive() }).parse(req.body);
      res.json({ data: markPlanPaid(providers, { planId: idParam.parse(req.params.id), amount: body.amount }) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.put('/dental-chart/:patientId/:toothId', (req, res) => {
    try {
      const body = z
        .object({
          state: z.enum(['healthy', 'treatment_required', 'treatment_planned', 'treated', 'crown', 'implant', 'missing']),
          problem: z.string().optional(),
          recommended_service_id: z.number().nullable().optional(),
          notes: z.string().optional(),
        })
        .parse(req.body);
      res.json({
        data: providers.dentalChart.upsertTooth({
          patient_id: idParam.parse(req.params.patientId),
          tooth_id: String(req.params.toothId),
          state: body.state,
          problem: body.problem || '',
          recommended_service_id: body.recommended_service_id ?? null,
          notes: body.notes || '',
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/recalls', (req, res) => {
    try {
      const body = z
        .object({
          patientId: z.number().int().positive(),
          type: z.enum(['checkup', 'hygiene', 'treatment_followup', 'custom']),
          dueAt: z.string(),
          title: z.string(),
          relatedServiceId: z.number().optional(),
          notes: z.string().optional(),
        })
        .parse(req.body);
      res.status(201).json({ data: createRecall(providers, body) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/recalls/:id/dismiss', (req, res) => {
    try {
      res.json({ data: dismissRecall(providers, idParam.parse(req.params.id)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/schedule/blocks', (req, res) => {
    try {
      const body = z
        .object({
          doctor_id: z.number().nullable().optional(),
          room_id: z.number().nullable().optional(),
          block_date: z.string(),
          start_time: z.string(),
          end_time: z.string(),
          reason: z.string().optional(),
        })
        .parse(req.body);
      res.status(201).json({
        data: providers.availability.createBlock({
          doctor_id: body.doctor_id ?? null,
          room_id: body.room_id ?? null,
          block_date: body.block_date,
          start_time: body.start_time,
          end_time: body.end_time,
          reason: body.reason || '',
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.delete('/schedule/blocks/:id', (req, res) => {
    providers.availability.deleteBlock(idParam.parse(req.params.id));
    res.status(204).end();
  });

  return router;
}
