import { describe, expect, it } from 'vitest';
import { chooseTooltipPlacement } from './placement';

describe('tour placement', () => {
  it('prefers bottom when there is room', () => {
    expect(
      chooseTooltipPlacement({
        targetTop: 80,
        targetBottom: 140,
        tooltipHeight: 160,
        viewportHeight: 800,
        preferred: 'bottom',
      }),
    ).toBe('bottom');
  });
});
