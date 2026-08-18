import { AppError } from '../../errors.js';
import type { Providers } from '../types.js';

export function createExternalProviders(): Providers {
  const notConfigured = (method: string): never => {
    throw new AppError(
      `External CRM/PMS data mode is not configured. Implement a dental adapter for ${method}.`,
      501,
      'NOT_CONFIGURED',
      { method },
    );
  };

  const stub = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        return () => notConfigured(String(prop));
      },
    },
  );

  return {
    clinic: stub as Providers['clinic'],
    patients: stub as Providers['patients'],
    doctors: stub as Providers['doctors'],
    services: stub as Providers['services'],
    availability: stub as Providers['availability'],
    appointments: stub as Providers['appointments'],
    treatmentPlans: stub as Providers['treatmentPlans'],
    dentalChart: stub as Providers['dentalChart'],
    treatmentRecords: stub as Providers['treatmentRecords'],
    recalls: stub as Providers['recalls'],
    payments: stub as Providers['payments'],
    events: stub as Providers['events'],
    notifications: stub as Providers['notifications'],
    transaction<T>(fn: () => T): T {
      return fn();
    },
  };
}
