import type { BusinessEvent, OutboundEventName } from '../../types.js';
import type { EventProvider } from '../types.js';

export function createMockEventPublisher(): EventProvider {
  const events: BusinessEvent[] = [];
  let nextId = 1;
  return {
    publish(name: OutboundEventName, payload: Record<string, unknown>): BusinessEvent {
      const event: BusinessEvent = {
        id: nextId++,
        name,
        payload,
        created_at: new Date().toISOString(),
      };
      events.unshift(event);
      return event;
    },
    list(limit = 50) {
      return events.slice(0, limit);
    },
  };
}
