import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, getAdminToken, setAdminToken } from '../api/client';
import { APPT_STATUS, humanDate, money, patientName, shortDate } from '../lib/format';
import type {
  AdminDashboard,
  Appointment,
  Doctor,
  Patient,
  Recall,
  Service,
  TreatmentPlan,
  TreatmentRecord,
  UnscheduledItem,
} from '../types';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'appointments', label: 'Визиты' },
  { id: 'unscheduled', label: 'Unscheduled' },
  { id: 'patients', label: 'Пациенты' },
  { id: 'doctors', label: 'Врачи' },
  { id: 'services', label: 'Услуги' },
  { id: 'plans', label: 'Планы' },
  { id: 'records', label: 'Записи лечения' },
  { id: 'recalls', label: 'Recall' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function AdminPage({ preview = false }: { preview?: boolean }) {
  const location = useLocation();
  const initial = new URLSearchParams(location.search).get('tab') as TabId | null;
  const [tab, setTab] = useState<TabId>(initial === 'unscheduled' ? 'unscheduled' : 'dashboard');

  useEffect(() => {
    const next = new URLSearchParams(location.search).get('tab') as TabId | null;
    if (next && TABS.some((item) => item.id === next)) setTab(next);
  }, [location.search]);
  const [token, setToken] = useState(getAdminToken());
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [unscheduled, setUnscheduled] = useState<{ items: UnscheduledItem[]; total_value: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [records, setRecords] = useState<TreatmentRecord[]>([]);
  const [recalls, setRecalls] = useState<Recall[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [dash, appts, unsched, people, docs, svcs, planList, recs, recs2] = await Promise.all([
        api.adminDashboard(preview),
        api.adminAppointments(preview),
        api.adminUnscheduled(preview),
        api.adminPatients(preview),
        api.adminDoctors(preview),
        api.adminServices(preview),
        api.adminPlans(preview),
        api.adminRecords(preview),
        api.adminRecalls(preview),
      ]);
      setDashboard(dash.data);
      setAppointments(appts.data);
      setUnscheduled(unsched.data);
      setPatients(people.data);
      setDoctors(docs.data);
      setServices(svcs.data);
      setPlans(planList.data);
      setRecords(recs.data);
      setRecalls(recs2.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    }
  }, [preview]);

  useEffect(() => {
    void load();
  }, [load]);

  async function complete(id: number) {
    await api.adminComplete(id, { summary: 'Визит завершён из admin console' });
    await load();
  }

  return (
    <div className="admin-shell">
      <header className="admin-head">
        <div>
          <p className="eyebrow">{preview ? 'Sales demo · read-only' : 'Admin console'}</p>
          <h1>DentalCare</h1>
        </div>
        {!preview && (
          <form
            className="token-row"
            onSubmit={(event) => {
              event.preventDefault();
              setAdminToken(token);
              void load();
            }}
          >
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN_TOKEN"
              type="password"
            />
            <button className="btn btn-secondary" type="submit">
              Войти
            </button>
          </form>
        )}
      </header>
      {preview && <p className="banner">Публичный /demo/admin только читает данные. Запись визита — в /admin с токеном.</p>}
      {error && <p className="error-state">{error}</p>}
      <nav className="admin-tabs">
        {TABS.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? 'is-on' : ''} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && dashboard && (
        <div className="kpi-grid" data-demo-tour="admin-dashboard">
          <article className="kpi">
            <span>Сегодня визитов</span>
            <strong>{dashboard.appointments.today}</strong>
          </article>
          <article className="kpi">
            <span>Confirmed</span>
            <strong>{dashboard.appointments.confirmed}</strong>
          </article>
          <article className="kpi">
            <span>Completed</span>
            <strong>{dashboard.appointments.completed}</strong>
          </article>
          <article className="kpi">
            <span>Cancelled</span>
            <strong>{dashboard.appointments.cancelled}</strong>
          </article>
          <article className="kpi">
            <span>No-show</span>
            <strong>{dashboard.appointments.no_show}</strong>
          </article>
          <article className="kpi">
            <span>Booked revenue</span>
            <strong>{money(dashboard.booked_revenue)}</strong>
          </article>
          <article className="kpi">
            <span>Plans in progress</span>
            <strong>{dashboard.treatment_plans_in_progress}</strong>
          </article>
          <article className="kpi highlight" data-demo-tour="unscheduled-kpi">
            <span>Unscheduled treatment</span>
            <strong>{money(dashboard.unscheduled_treatment_value)}</strong>
            <em>{dashboard.unscheduled_count} этапов без записи</em>
          </article>
          <article className="kpi">
            <span>Recall due</span>
            <strong>{dashboard.recall_due}</strong>
          </article>
          <article className="kpi wide">
            <span>Treatment funnel</span>
            <p>
              Created {dashboard.funnel.created} → Accepted {dashboard.funnel.accepted} → In progress {dashboard.funnel.in_progress} →
              Completed {dashboard.funnel.completed}
            </p>
          </article>
        </div>
      )}

      {tab === 'appointments' && (
        <div className="table-cards" data-demo-tour="admin-appointments">
          {appointments.map((row) => (
            <article key={row.id} className="card">
              <p className="muted">
                {shortDate(row.appointment_date)} {row.start_time} · {APPT_STATUS[row.status]}
              </p>
              <h2>{row.service_name}</h2>
              <p>
                {row.patient_name} · {row.doctor_name}
                {row.room_name ? ` · ${row.room_name}` : ''}
              </p>
              {!preview && (row.status === 'scheduled' || row.status === 'confirmed') && (
                <div className="row-actions">
                  <button type="button" className="btn btn-primary" onClick={() => void complete(row.id)}>
                    Complete
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => void api.adminConfirm(row.id).then(load)}>
                    Confirm
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => void api.adminNoShow(row.id).then(load)}>
                    No-show
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => void api.adminCancel(row.id).then(load)}>
                    Cancel
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === 'unscheduled' && unscheduled && (
        <div data-demo-tour="unscheduled-list">
          <div className="card highlight">
            <p className="eyebrow">Unscheduled treatment value</p>
            <h2>{money(unscheduled.total_value)}</h2>
          </div>
          {unscheduled.items.map((row) => (
            <article key={row.item.id} className="card">
              <h2>{patientName(row.patient)}</h2>
              <p>{row.item.title}</p>
              <p className="muted">
                {row.item.tooth_id ? `Зуб ${row.item.tooth_id} · ` : ''}
                {money(row.item.estimated_price)} · ждёт {row.days_waiting} дн.
                {row.recommended_before ? ` · до ${humanDate(row.recommended_before)}` : ''}
              </p>
            </article>
          ))}
        </div>
      )}

      {tab === 'patients' &&
        patients.map((patient) => (
          <article key={patient.id} className="card">
            <h2>{patientName(patient)}</h2>
            <p className="muted">{patient.phone || 'без телефона'}</p>
          </article>
        ))}

      {tab === 'doctors' &&
        doctors.map((doctor) => (
          <article key={doctor.id} className="card">
            <h2>{doctor.name}</h2>
            <p>{doctor.bio}</p>
          </article>
        ))}

      {tab === 'services' &&
        services.map((service) => (
          <article key={service.id} className="card">
            <h2>{service.name}</h2>
            <p>
              {money(service.price)} · {service.duration_minutes} мин
            </p>
          </article>
        ))}

      {tab === 'plans' &&
        plans.map((plan) => (
          <article key={plan.id} className="card">
            <h2>{plan.title}</h2>
            <p>
              {plan.status} · {plan.completed_items}/{plan.total_items} · {money(plan.estimated_total)}
            </p>
            {!preview && plan.outstanding_total > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void api.adminPay(plan.id, plan.outstanding_total).then(load)}
              >
                Mark as paid
              </button>
            )}
          </article>
        ))}

      {tab === 'records' &&
        records.map((record) => (
          <article key={record.id} className="card">
            <p className="muted">{humanDate(record.performed_at)}</p>
            <h2>{record.service_name}</h2>
            <p>
              {record.patient_name} · {record.doctor_name}
            </p>
            <p>{record.summary}</p>
          </article>
        ))}

      {tab === 'recalls' &&
        recalls.map((recall) => (
          <article key={recall.id} className="card">
            <h2>{recall.title || recall.service_name}</h2>
            <p>
              {humanDate(recall.due_at)} · {recall.status}
            </p>
          </article>
        ))}
    </div>
  );
}

export function DemoAdminPage() {
  return <AdminPage preview />;
}
