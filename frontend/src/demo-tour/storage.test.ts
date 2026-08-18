import { describe, expect, it } from 'vitest';
import { createTourStorage, memoryStorage } from './storage';

describe('tour storage', () => {
  it('marks a tour as seen', () => {
    const storage = createTourStorage('test-dental-tour', memoryStorage);
    storage.clear();
    expect(storage.hasBeenSeen()).toBe(false);
    storage.markSeen('completed');
    expect(storage.hasBeenSeen()).toBe(true);
    expect(storage.readReason()).toBe('completed');
  });
});
