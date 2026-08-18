import type { NotificationKind, NotificationRecord } from '../../types.js';
import type { NotificationProvider } from '../types.js';

export function createMockNotificationProvider(): NotificationProvider {
  const records: NotificationRecord[] = [];
  let nextId = 1;
  return {
    enqueue(params: { patientId: number; kind: NotificationKind; title: string; body: string }) {
      const record: NotificationRecord = {
        id: nextId++,
        patient_id: params.patientId,
        kind: params.kind,
        title: params.title,
        body: params.body,
        created_at: new Date().toISOString(),
      };
      records.unshift(record);
      return record;
    },
    list(patientId) {
      return patientId ? records.filter((row) => row.patient_id === patientId) : records;
    },
  };
}
