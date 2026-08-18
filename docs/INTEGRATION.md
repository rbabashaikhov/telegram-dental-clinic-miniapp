# CRM / PMS integration

DentalCare talks to data through ports. A vendor adapter is a new provider package wired in `backend/src/container.ts`. Application services and the React UI stay unchanged.

## Modes

```env
DATA_MODE=local      # SQLite demo
DATA_MODE=external   # stub, every call is 501 NOT_CONFIGURED
```

`DATA_MODE=crm` is accepted as an alias of `external`.

## Minimum adapter contract

Implement the provider interfaces in `backend/src/providers/types.ts`. Expected operations:

```text
getPatient()
getFamilyMembers()

getDoctors()
getServices()
getAvailability()

getTreatmentPlans()
getDentalChart()
getTreatmentHistory()

createAppointment()
cancelAppointment()
rescheduleAppointment()

updateTreatmentPlan()
```

Plus the rest of the port surface used by services: rooms/blocks, treatment records, recalls, payments, events, notifications, and `transaction()`.

## External provider expectations

Until a partner adapter exists, `createExternalProviders()` throws:

```json
{ "error": "External CRM/PMS data mode is not configured...", "code": "NOT_CONFIGURED" }
```

HTTP status **501**.

A real adapter should:

- map clinic patients to `Patient` / `FamilyMember`
- expose doctor schedules and busy intervals so availability stays in the application layer **or** implement `AvailabilityProvider` equivalently
- create appointments atomically with treatment-item status `planned → scheduled`
- complete visits atomically with treatment records and plan progress
- publish the same domain events listed below

Do not encode Bitrix24, amoCRM, or a specific dental PMS inside services. The adapter owns vendor payloads.

## Domain events

```text
appointment.created
appointment.cancelled
appointment.rescheduled
appointment.completed

treatment_plan.created
treatment_plan.accepted
treatment_item.scheduled
treatment_item.completed
treatment_plan.completed

recall.created
recall.due
```

`EVENT_ADAPTER=webhook` posts JSON `{ name, payload, id, createdAt }` to `EVENT_WEBHOOK_URL`.

## Payments

`PAYMENT_ADAPTER=mock` writes to SQLite. `external` returns 501. There is no acquiring in this demo. Admin may `Mark as paid` on a treatment plan.

## Notifications

Local/mock stores rows in SQLite/memory. Telegram bot delivery is out of scope.
