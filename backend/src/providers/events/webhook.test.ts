import { describe, expect, it, vi } from 'vitest';
import { createMockEventPublisher } from './mock.js';
import { createWebhookEventPublisher } from './webhook.js';

describe('event webhook adapter', () => {
  it('persists locally and posts to the webhook URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const publisher = createWebhookEventPublisher(createMockEventPublisher(), 'https://crm.example/events');
    publisher.publish('appointment.created', { appointmentId: 1 });
    expect(publisher.list()[0].name).toBe('appointment.created');
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
