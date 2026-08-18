import { AppError } from '../../errors.js';
import type { PaymentProvider } from '../types.js';

export function createExternalPaymentProvider(): PaymentProvider {
  const notConfigured = (method: string): never => {
    throw new AppError(
      `External payment adapter is not configured. Implement acquiring for ${method}.`,
      501,
      'NOT_CONFIGURED',
      { method },
    );
  };
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        return () => notConfigured(String(prop));
      },
    },
  ) as PaymentProvider;
}
