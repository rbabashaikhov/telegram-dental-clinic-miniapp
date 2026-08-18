import { describe, expect, it } from 'vitest';
import { money, patientName } from './format';

describe('format', () => {
  it('formats ruble amounts', () => {
    expect(money(74000)).toMatch(/74/);
    expect(money(74000)).toMatch(/₽/);
  });

  it('joins a patient name', () => {
    expect(patientName({ first_name: 'Анна', last_name: 'Смирнова' })).toBe('Анна Смирнова');
  });
});
