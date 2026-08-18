import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ProgressCard } from '../components/ProgressCard';
import { TabBar } from '../components/TabBar';
import { usePortal } from '../context/PortalContext';
import { APPT_STATUS, humanDate, money, patientName } from '../lib/format';

export function HomePage() {
  const { portal, loading, error, refresh } = usePortal();
  const navigate = useNavigate();

  if (loading && !portal) return <div className="loading">Открываем кабинет…</div>;
  if (error || !portal) return <div className="error-state">{error || 'Нет данных'}</div>;

  const { patient, nextAppointment, treatmentPlan, nextRecommendedItem, clinic } = portal;

  async function cancelVisit() {
    if (!nextAppointment) return;
    if (!window.confirm('Отменить ближайший визит?')) return;
    await api.cancelAppointment(nextAppointment.id);
    await refresh();
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">{clinic.name}</p>
        <h1>{patientName(patient)}</h1>
        <p className="lead">Личный кабинет пациента — план лечения, карта и следующие шаги.</p>
      </header>

      {nextAppointment && (
        <section className="card next-visit" data-demo-tour="next-visit">
          <p className="eyebrow">Следующий визит</p>
          <h2>{nextAppointment.treatment_item_title || nextAppointment.service_name}</h2>
          <p>
            {nextAppointment.doctor_name} · {humanDate(nextAppointment.appointment_date)} · {nextAppointment.start_time}
          </p>
          <p className="muted">
            {nextAppointment.location_name}
            {nextAppointment.room_name ? ` · ${nextAppointment.room_name}` : ''}
          </p>
          <span className={`status ${nextAppointment.status}`}>{APPT_STATUS[nextAppointment.status]}</span>
          <div className="row-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/book?reschedule=${nextAppointment.id}`)}>
              Перенести
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void cancelVisit()}>
              Отменить
            </button>
          </div>
        </section>
      )}

      {treatmentPlan && (
        <section className="card" data-demo-tour="plan-summary">
          <p className="eyebrow">План лечения</p>
          <h2>{treatmentPlan.title}</h2>
          <ProgressCard
            completed={treatmentPlan.completed_items}
            total={treatmentPlan.total_items}
            percent={treatmentPlan.progress_percent}
            estimated={treatmentPlan.estimated_total}
            paid={treatmentPlan.paid_total}
            outstanding={treatmentPlan.outstanding_total}
          />
          <Link className="btn btn-primary" to="/plan">
            Открыть план лечения
          </Link>
        </section>
      )}

      {nextRecommendedItem && (
        <section className="card accent-card" data-demo-tour="next-stage">
          <p className="eyebrow">Следующий этап</p>
          <h2>{nextRecommendedItem.title}</h2>
          {nextRecommendedItem.recommended_before && (
            <p className="muted">Рекомендуемый срок: до {humanDate(nextRecommendedItem.recommended_before)}</p>
          )}
          <p>{money(nextRecommendedItem.estimated_price)}</p>
          <Link className="btn btn-primary" to={`/book?itemId=${nextRecommendedItem.id}`}>
            Выбрать время
          </Link>
        </section>
      )}

      <section className="quick-grid" data-demo-tour="quick-actions">
        <Link to="/book" className="quick">
          Записаться
        </Link>
        <Link to="/plan" className="quick">
          План лечения
        </Link>
        <Link to="/chart" className="quick">
          Моя зубная карта
        </Link>
        <Link to="/history" className="quick">
          История
        </Link>
        <Link to="/family" className="quick">
          Семья
        </Link>
        <Link to="/recalls" className="quick">
          Recall
        </Link>
      </section>
      <TabBar />
    </div>
  );
}
