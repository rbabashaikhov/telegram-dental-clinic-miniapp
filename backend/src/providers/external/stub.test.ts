import { describe, expect, it } from 'vitest';
import { createExternalProviders } from './stub.js';

describe('external CRM/PMS stub', () => {
  it('returns 501 NOT_CONFIGURED for data operations', () => {
    const providers = createExternalProviders();
    try {
      providers.patients.listAll();
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toMatchObject({ status: 501, code: 'NOT_CONFIGURED' });
    }
  });
});
