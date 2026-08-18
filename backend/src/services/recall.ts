import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import type { RecallDetails } from '../types.js';
import { todayDateString } from './time.js';

export function listDueRecalls(providers: Providers, now = new Date()): RecallDetails[] {
  const today = todayDateString(now);
  return providers.recalls.list({ dueOnOrBefore: today }).filter((row) => row.status === 'scheduled' || row.status === 'due');
}

export function refreshRecallStatuses(providers: Providers, now = new Date()): void {
  const today = todayDateString(now);
  for (const recall of providers.recalls.list({ status: 'scheduled', dueOnOrBefore: today })) {
    providers.recalls.update(recall.id, { status: 'due' });
    providers.events.publish('recall.due', { recallId: recall.id, patientId: recall.patient_id });
    providers.notifications.enqueue({
      patientId: recall.patient_id,
      kind: 'recall_due',
      title: recall.title || 'Пора записаться',
      body: `Рекомендуемый визит: ${recall.due_at}`,
    });
  }
}

export function createRecall(
  providers: Providers,
  params: {
    patientId: number;
    type: RecallDetails['type'];
    dueAt: string;
    title: string;
    relatedServiceId?: number | null;
    notes?: string;
  },
): RecallDetails {
  const patient = providers.patients.getById(params.patientId);
  if (!patient) {
    throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
  }
  const recall = providers.recalls.insert({
    patient_id: params.patientId,
    type: params.type,
    due_at: params.dueAt,
    status: 'scheduled',
    related_service_id: params.relatedServiceId ?? null,
    related_treatment_plan_id: null,
    title: params.title,
    notes: params.notes || '',
  });
  providers.events.publish('recall.created', { recallId: recall.id });
  return recall;
}

export function dismissRecall(providers: Providers, recallId: number): RecallDetails {
  const recall = providers.recalls.getById(recallId);
  if (!recall) {
    throw new AppError('Recall not found', 404, 'RECALL_NOT_FOUND');
  }
  return providers.recalls.update(recallId, { status: 'dismissed' });
}
