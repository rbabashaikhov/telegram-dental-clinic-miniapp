import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import { config, publicAppConfig } from './config.js';
import { db } from './db/schema.js';
import { logger } from './logger.js';
import type { Providers } from './providers/types.js';
import { createAdminRouter } from './routes/admin.js';
import { createClientRouter, createPublicRouter } from './routes/client.js';
import { createDemoAdminRouter } from './routes/demoAdmin.js';

export function createApp(providers: Providers): express.Express {
  const app = express();
  const allowedOrigins = new Set([
    config.appUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ]);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.set('trust proxy', 1);

  app.get('/api/health', (_req, res) => {
    try {
      if (config.dataMode === 'local') {
        db.prepare('SELECT 1 AS ok').get();
      }
      res.json({
        ok: true,
        app: 'dentalcare',
        dataMode: config.dataMode,
        eventAdapter: config.eventAdapter,
        notificationAdapter: config.notificationAdapter,
        paymentAdapter: config.paymentAdapter,
        demoMode: config.allowDemoMode,
        adminProtected: Boolean(config.admin.token) || config.isProduction,
      });
    } catch (error) {
      logger.error('Healthcheck database failure', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(503).json({ ok: false, error: 'Database unavailable', code: 'DB_UNAVAILABLE' });
    }
  });

  app.use('/api', createPublicRouter());
  app.use('/api', createClientRouter(providers));
  app.use('/api/demo-admin', createDemoAdminRouter(providers));
  app.use('/api/admin', createAdminRouter(providers));

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDirCandidates = [
    config.publicDir || undefined,
    path.join(__dirname, '../public'),
    path.join(process.cwd(), 'public'),
  ].filter(Boolean) as string[];

  const publicDir = publicDirCandidates.find((dir) => fs.existsSync(dir));

  if (publicDir) {
    app.use(express.static(publicDir, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
        return;
      }
      res.sendFile(path.join(publicDir, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error('Unhandled request error', { error: err.message });
      res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    },
  );

  return app;
}

export { publicAppConfig };
