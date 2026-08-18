function boolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

function numberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
const allowDemoMode =
  process.env.ALLOW_DEMO_MODE === 'true' ||
  nodeEnv !== 'production' ||
  !telegramBotToken;

export type DataModeName = 'local' | 'external';
export type EventAdapterName = 'local' | 'webhook' | 'mock';
export type NotificationAdapterName = 'local' | 'mock';
export type PaymentAdapterName = 'mock' | 'external';

function dataModeName(value: string | undefined): DataModeName {
  if (value === 'external' || value === 'local') return value;
  if (value === 'crm') return 'external';
  return 'local';
}

function eventAdapterName(value: string | undefined): EventAdapterName {
  if (value === 'webhook' || value === 'mock' || value === 'local') return value;
  return 'local';
}

function notificationAdapterName(value: string | undefined): NotificationAdapterName {
  if (value === 'mock' || value === 'local') return value;
  return 'local';
}

function paymentAdapterName(value: string | undefined): PaymentAdapterName {
  if (value === 'external' || value === 'mock') return value;
  return 'mock';
}

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.API_PORT || process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  databasePath: process.env.DATABASE_PATH || '',
  publicDir: process.env.PUBLIC_DIR || '',
  telegramBotToken,
  allowDemoMode,
  timezone: process.env.TZ || 'Europe/Moscow',
  dataMode: dataModeName(process.env.DATA_MODE),
  eventAdapter: eventAdapterName(process.env.EVENT_ADAPTER),
  notificationAdapter: notificationAdapterName(process.env.NOTIFICATION_ADAPTER),
  paymentAdapter: paymentAdapterName(process.env.PAYMENT_ADAPTER),
  business: {
    name: process.env.BUSINESS_NAME || 'DentalCare',
    title: process.env.APP_TITLE || 'DentalCare',
    description:
      process.env.APP_DESCRIPTION ||
      'Личный кабинет стоматологической клиники: план лечения, зубная карта и запись на этапы.',
    brandAccent: process.env.BRAND_ACCENT || '#1B6B63',
    logoUrl: process.env.BRAND_LOGO_URL || '',
  },
  features: {
    demoTour: boolEnv(process.env.FEATURE_DEMO_TOUR, true),
    demoAdminPreview: boolEnv(process.env.FEATURE_DEMO_ADMIN_PREVIEW, true),
  },
  admin: {
    token: (process.env.ADMIN_TOKEN || '').trim(),
  },
  events: {
    webhookUrl: process.env.EVENT_WEBHOOK_URL || '',
    webhookSecret: process.env.EVENT_WEBHOOK_SECRET || '',
    timeoutMs: numberEnv(process.env.EVENT_WEBHOOK_TIMEOUT_MS, 5000),
  },
  rateLimit: {
    windowMs: numberEnv(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: numberEnv(process.env.RATE_LIMIT_MAX, 20),
  },
};

export function publicAppConfig() {
  return {
    businessName: config.business.name,
    appTitle: config.business.title,
    appDescription: config.business.description,
    timezone: config.timezone,
    demoMode: config.allowDemoMode,
    adminProtected: Boolean(config.admin.token) || config.isProduction,
    branding: {
      accent: config.business.brandAccent,
      logoUrl: config.business.logoUrl || null,
    },
    features: {
      demoTour: config.features.demoTour,
      demoAdminPreview: config.features.demoAdminPreview,
    },
  };
}

export function isDemoAdminPreviewEnabled(
  cfg: {
    allowDemoMode: boolean;
    features: { demoAdminPreview: boolean };
  } = config,
): boolean {
  return cfg.allowDemoMode && cfg.features.demoAdminPreview;
}

export function isAdminWriteLocked(token: string): boolean {
  return token.length === 0;
}
