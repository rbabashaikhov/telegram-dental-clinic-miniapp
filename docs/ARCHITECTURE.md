# Architecture

DentalCare is a standalone clinic portal. Application code depends on provider interfaces, not SQLite, Telegram, or a vendor PMS.

```text
Telegram Mini App / Browser Demo
        ↓
REST API
        ↓
Application / Domain Layer
        ↓
Provider / Repository Interfaces
        ↓
┌──────────────────────────────┐
Local Providers           External Providers
SQLite                    CRM/PMS stub (501)
└──────────────────────────────┘

+ EventProvider (local | mock | webhook)
+ NotificationProvider (local | mock)
+ PaymentProvider (mock | external stub)
```

`DATA_MODE`, `EVENT_ADAPTER`, `NOTIFICATION_ADAPTER` and `PAYMENT_ADAPTER` are resolved in `backend/src/container.ts`. Services never contain `if (dataMode === 'external')`.

## Layers

| Layer | Responsibility |
| --- | --- |
| Routes | HTTP, auth, validation, serialization |
| Application services | Booking, availability, treatment completion, portal, recall, admin KPIs |
| Ports | `PatientProvider`, `DoctorProvider`, `AvailabilityProvider`, `AppointmentProvider`, `TreatmentPlanProvider`, `DentalChartProvider`, `TreatmentRecordProvider`, `PaymentProvider`, `RecallProvider`, `NotificationProvider`, `EventProvider` |
| Adapters | SQLite local, external stub, webhook/mock events, mock/external payments |

Dependency direction: routes → services → ports ← adapters.

## Domain

- **Patient / FamilyMember** — one Telegram user may switch several patient profiles
- **Doctor / Specialty / Service** — catalog and eligibility
- **TreatmentPlan / TreatmentPlanItem** — accepted plan, stage statuses `planned → scheduled → completed`
- **Tooth / DentalChart** — FDI permanent teeth, demo states
- **Appointment / AppointmentHistory** — visit lifecycle, doctor + room conflict checks
- **TreatmentRecord** — created when a visit is completed
- **Recall** — hygiene / checkup follow-up
- **Payment / Invoice** — mock ledger for plan totals

## Composition

`createLocalProviders(db)` is the demo implementation. `createExternalProviders()` throws `501 NOT_CONFIGURED` for every method so a later Bitrix24 / amoCRM / dental PMS adapter can replace SQLite without rewriting services or UI.

## Admin protection

Write endpoints on `/api/admin` are fail-closed: if `ADMIN_TOKEN` is empty, writes are rejected.

`/api/demo-admin` is GET-only when `ALLOW_DEMO_MODE` and `FEATURE_DEMO_ADMIN_PREVIEW` are on.

## Atomicity

`completeAppointment` runs inside `providers.transaction()`. If treatment-item update or record insert fails, the appointment stays `scheduled` and the item stays `scheduled`.
