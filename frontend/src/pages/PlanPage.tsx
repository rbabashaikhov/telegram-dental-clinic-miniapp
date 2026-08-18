import { Link } from 'react-router-dom';
import { ProgressCard } from '../components/ProgressCard';
import { TabBar } from '../components/TabBar';
import { usePortal } from '../context/PortalContext';
import { humanDate, ITEM_STATUS, money } from '../lib/format';

export function PlanPage() {
  const { portal, loading } = usePortal();
  if (loading && !portal) return <div className="loading">Загрузка плана…</div>;
  const plan = portal?.treatmentPlan;
  if (!plan) {
    return (
      <div className="page">
        <h1>План лечения</h1>
        <p className="muted">Активный план пока не сформирован. Можно записаться на консультацию.</p>
        <Link className="btn btn-primary" to="/book?reason=consultation">
          Записаться на консультацию
        </Link>
        <TabBar />
      </div>
    );
  }

  return (
    <div className="page">
      <p className="eyebrow">План лечения</p>
      <h1>{plan.title}</h1>
      <div className="card" data-demo-tour="plan-timeline">
        <ProgressCard
          completed={plan.completed_items}
          total={plan.total_items}
          percent={plan.progress_percent}
          estimated={plan.estimated_total}
          paid={plan.paid_total}
          outstanding={plan.outstanding_total}
        />
      </div>
      <ol className="timeline">
        {plan.items.map((item) => (
          <li
            key={item.id}
            className={`timeline-item ${item.status}`}
            data-demo-tour={item.status === 'scheduled' ? 'plan-item-scheduled' : item.status === 'planned' ? 'plan-item-planned' : undefined}
          >
            <div className="timeline-dot" />
            <div className="card">
              <p className="eyebrow">{ITEM_STATUS[item.status]}</p>
              <h2>{item.title}</h2>
              <p className="muted">{item.description}</p>
              {item.tooth_id && <p>Зуб {item.tooth_id}</p>}
              <p>{money(item.estimated_price)}</p>
              {item.recommended_before && <p className="muted">До {humanDate(item.recommended_before)}</p>}
              {item.appointment && (
                <p>
                  {humanDate(item.appointment.appointment_date)} · {item.appointment.start_time} · {item.appointment.doctor_name}
                </p>
              )}
              {item.status === 'planned' && (
                <Link className="btn btn-primary" to={`/book?itemId=${item.id}`}>
                  Записаться
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
      <TabBar />
    </div>
  );
}
