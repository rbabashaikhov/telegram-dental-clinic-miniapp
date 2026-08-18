import 'dotenv/config';
import { createApp, publicAppConfig } from './app.js';
import { config } from './config.js';
import { providers } from './container.js';
import { seed } from './db/seed.js';
import { db, migrate } from './db/schema.js';
import { logger } from './logger.js';

migrate();
if (config.dataMode === 'local') {
  seed(db);
}

const app = createApp(providers);

if (!config.isTest) {
  app.listen(config.port, '0.0.0.0', () => {
    logger.info('App started', {
      port: config.port,
      database: process.env.DATABASE_PATH || 'local default',
      dataMode: config.dataMode,
      eventAdapter: config.eventAdapter,
      demoMode: config.allowDemoMode,
      adminProtected: Boolean(config.admin.token) || config.isProduction,
      business: publicAppConfig(),
    });
    if (!config.admin.token) {
      logger.warn('ADMIN_TOKEN is not set; admin writes are locked. Set ADMIN_TOKEN to enable the console.');
    }
  });
}

export { app };
