# DentalCare — Telegram Mini App for a dental clinic

Production-ready demo of a **patient portal**, not a generic booking template.

DentalCare walks a clinic through a full treatment lifecycle:

**diagnostics → treatment plan → book a treatment stage → visit → progress update → next stage → recall.**

Product name in the UI: **DentalCare**.

## What the product demonstrates

1. Patient cabinet (next visit, plan, recommended stage)
2. Treatment plan with timeline and finances
3. Interactive dental chart (FDI permanent teeth)
4. Booking a specific treatment plan item
5. Treatment history
6. Unscheduled treatment value for admin
7. Recall / return visits
8. Family profiles
9. Write-capable admin console
10. Ports ready for an external dental CRM / PMS

Demo patient: **Анна Смирнова**. Active plan of 5 stages, 2 completed, tooth 16 scheduled, tooth 26 waiting. Plan total **74 000 ₽**, paid **28 000 ₽**, outstanding **46 000 ₽**.

## Architecture

```text
React + Vite + Telegram WebApp
              ↓ REST
Express + TypeScript
              ↓
Application Services
              ↓
Domain Ports
              ↓
Providers
 ├── SQLite/local
 ├── external CRM/PMS stubs
 ├── Payment provider
 ├── Notification provider
 └── Event provider
```

Implementations are selected only in `backend/src/container.ts`. Services never branch on `DATA_MODE`.

## Local run

```bash
cp .env.example .env
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000
- Browser demo works when Telegram context is missing and `ALLOW_DEMO_MODE=true`

```bash
npm test
npm run typecheck
```

## Docker

```bash
docker compose up --build
```

Single container: Express serves `/api/*` and the frontend build. SQLite lives on volume `/data` (`DATABASE_PATH=/data/dental.db`). Healthcheck: `GET /api/health`.

## Environment

See `.env.example`. Important:

| Variable | Meaning |
| --- | --- |
| `DATA_MODE=local\|external` | SQLite demo vs CRM/PMS stub (`501 NOT_CONFIGURED`) |
| `EVENT_ADAPTER=local\|webhook\|mock` | Domain events |
| `NOTIFICATION_ADAPTER=local\|mock` | In-app notifications |
| `PAYMENT_ADAPTER=mock\|external` | Mock ledger vs stub |
| `ADMIN_TOKEN` | Fail-closed admin writes |
| `TELEGRAM_BOT_TOKEN` | Production `initData` validation |
| `ALLOW_DEMO_MODE` | Browser demo user |

## Admin

- `/admin` — write console. Sends `x-admin-token`. Empty `ADMIN_TOKEN` **locks writes**.
- `/demo/admin` — sales preview, **GET only**. Completing a visit is not allowed here.

Docker Compose sets `ADMIN_TOKEN=dentalcare-demo` by default.

## Known limitations

- no real dental diagnosis
- no DICOM / X-ray processing
- no AI diagnosis
- no insurance claims
- no government medical integrations
- no real payment acquiring
- no vendor-specific dental PMS adapter
- no legally binding medical document workflow

Demo medical forms use **synthetic** data only.
