import { describe, expect, it } from 'vitest';
import { findTourTarget, tourTargetSelector } from './targets';

describe('tour targets', () => {
  it('builds a data-demo-tour selector', () => {
    expect(tourTargetSelector('plan-summary')).toBe('[data-demo-tour="plan-summary"]');
  });

  it('returns null without a document', () => {
    expect(findTourTarget('x', null)).toBeNull();
  });
});
