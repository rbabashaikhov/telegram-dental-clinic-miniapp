import { config } from './config.js';
import { db } from './db/schema.js';
import { logger } from './logger.js';
import { createExternalProviders } from './providers/external/stub.js';
import { createMockEventPublisher } from './providers/events/mock.js';
import { createWebhookEventPublisher } from './providers/events/webhook.js';
import { createLocalProviders } from './providers/local/sqlite.js';
import { createMockNotificationProvider } from './providers/notifications/mock.js';
import { createExternalPaymentProvider } from './providers/payments/external.js';
import type { Providers } from './providers/types.js';

function composeProviders(): Providers {
  if (config.dataMode === 'external') {
    logger.warn('DATA_MODE=external: using CRM/PMS provider stub. Partner adapter is not implemented.');
    return createExternalProviders();
  }

  const data = createLocalProviders(db);

  let events = data.events;
  if (config.eventAdapter === 'mock') {
    events = createMockEventPublisher();
  } else if (config.eventAdapter === 'webhook') {
    events = createWebhookEventPublisher(data.events, config.events.webhookUrl);
  }

  let notifications = data.notifications;
  if (config.notificationAdapter === 'mock') {
    notifications = createMockNotificationProvider();
  }

  let payments = data.payments;
  if (config.paymentAdapter === 'external') {
    payments = createExternalPaymentProvider();
  }

  logger.info('Providers composed', {
    dataMode: config.dataMode,
    eventAdapter: config.eventAdapter,
    notificationAdapter: config.notificationAdapter,
    paymentAdapter: config.paymentAdapter,
  });

  return {
    ...data,
    events,
    notifications,
    payments,
  };
}

export const providers: Providers = composeProviders();
