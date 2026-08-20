import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('booking navigation and chips', () => {
  it('renders an explicit back control on booking screens', () => {
    const page = readFileSync(join(dir, 'BookPage.tsx'), 'utf8');
    expect(page).toContain('← Назад');
    expect(page).toContain('back-nav');
    expect(page).toContain('TabBar');
  });

  it('hides chip-row overflow scrollbar and wraps on desktop', () => {
    const css = readFileSync(join(dir, '../styles.css'), 'utf8');
    expect(css).toContain('scrollbar-width: none');
    expect(css).toContain('.chip-row::-webkit-scrollbar');
    expect(css).toContain('padding-inline-end');
    expect(css).toMatch(/@media \(min-width:\s*768px\)/);
    expect(css).toContain('flex-wrap: wrap');
  });
});
