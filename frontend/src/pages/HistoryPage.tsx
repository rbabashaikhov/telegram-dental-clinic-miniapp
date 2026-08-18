import { Link, useParams } from 'react-router-dom';
import { TabBar } from '../components/TabBar';
import { usePortal } from '../context/PortalContext';
import { humanDate, money } from '../lib/format';

export function HistoryPage() {
  const { portal, loading } = usePortal();
  if (loading && !portal) return <div className="loading">История…</div>;
  const records = portal?.history ?? [];

  return (
    <div className="page">
      <p className="eyebrow">История лечения</p>
      <h1>Завершённые визиты</h1>
      {records.length === 0 && <p className="muted">Пока нет завершённых визитов.</p>}
      <div className="stack">
        {records.map((record) => (
          <Link key={record.id} to={`/history/${record.id}`} className="card">
            <p className="muted">{humanDate(record.performed_at)}</p>
            <h2>{record.service_name}</h2>
            <p>{record.doctor_name}</p>
            <p>{money(record.price)}</p>
          </Link>
        ))}
      </div>
      <TabBar />
    </div>
  );
}

export function HistoryDetailPage() {
  const { id } = useParams();
  const { portal } = usePortal();
  const record = portal?.history.find((row) => row.id === Number(id));
  if (!record) {
    return (
      <div className="page">
        <p>Запись не найдена</p>
        <TabBar />
      </div>
    );
  }
  const repeatable = /гигиен/i.test(record.service_name);

  return (
    <div className="page">
      <p className="eyebrow">{humanDate(record.performed_at)}</p>
      <h1>{record.service_name}</h1>
      <div className="card">
        <p>
          <span className="muted">Врач: </span>
          {record.doctor_name}
        </p>
        {record.tooth_id && (
          <p>
            <span className="muted">Зуб: </span>
            {record.tooth_id}
          </p>
        )}
        <p>{record.summary}</p>
        {record.recommendations && (
          <p>
            <span className="muted">Рекомендации: </span>
            {record.recommendations}
          </p>
        )}
        <p>{money(record.price)}</p>
        {repeatable && (
          <Link className="btn btn-primary" to="/book?reason=hygiene">
            Повторить запись
          </Link>
        )}
      </div>
      <TabBar />
    </div>
  );
}
