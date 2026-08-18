import { describe, expect, it } from 'vitest';
import { isAdminWriteLocked, publicAppConfig } from './config.js';

describe('config', () => {
  it('exposes public app metadata without secrets', () => {
    const published = publicAppConfig();
    expect(published.businessName).toBeTruthy();
    expect(published).not.toHaveProperty('admin');
    expect(isAdminWriteLocked('')).toBe(true);
    expect(isAdminWriteLocked('token')).toBe(false);
  });
});
