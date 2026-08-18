import { Link } from 'react-router-dom';
import { TabBar } from '../components/TabBar';
import { usePortal } from '../context/PortalContext';
import { humanDate } from '../lib/format';

export function RecallsPage() {
  const { portal } = usePortal();
  const recalls = portal?.recalls ?? [];

  return (
    <div className="page">
      <p className="eyebrow">Напоминания</p>
      <h1>Recall</h1>
      {recalls.length === 0 && <p className="muted">Нет активных напоминаний.</p>}
      <div className="stack">
        {recalls.map((recall) => (
          <section key={recall.id} className="card">
            <p className="eyebrow">{recall.status === 'due' ? 'Пора записаться' : 'Запланировано'}</p>
            <h2>{recall.title || recall.service_name}</h2>
            <p>{humanDate(recall.due_at)}</p>
            {recall.notes && <p className="muted">{recall.notes}</p>}
            <Link className="btn btn-primary" to={`/book?reason=${recall.type === 'hygiene' ? 'hygiene' : 'consultation'}&recallId=${recall.id}`}>
              Запланировать визит
            </Link>
          </section>
        ))}
      </div>
      <TabBar />
    </div>
  );
}
