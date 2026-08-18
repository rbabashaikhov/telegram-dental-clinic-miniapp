import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DentalChartView } from '../components/DentalChartView';
import { TabBar } from '../components/TabBar';
import { usePortal } from '../context/PortalContext';
import { humanDate, money } from '../lib/format';
import { TOOTH_STATE_LABEL } from '../types';

export function ChartPage() {
  const { portal, loading } = usePortal();
  const [selectedId, setSelectedId] = useState<string | null>('16');
  if (loading && !portal) return <div className="loading">Загрузка карты…</div>;
  const teeth = portal?.chart.teeth ?? [];
  const selected = teeth.find((tooth) => tooth.tooth_id === selectedId);

  return (
    <div className="page">
      <p className="eyebrow">Зубная карта</p>
      <h1>Моя зубная карта</h1>
      <p className="muted">Интерактивная demo-визуализация. Это не медицинская одонтограмма и не диагноз.</p>
      <DentalChartView teeth={teeth} selectedId={selectedId} onSelect={setSelectedId} />
      {selected && (
        <section className="card tooth-drawer" data-demo-tour="tooth-drawer">
          <p className="eyebrow">Зуб {selected.tooth_id}</p>
          <h2>{TOOTH_STATE_LABEL[selected.state]}</h2>
          {selected.problem && (
            <p>
              <span className="muted">Проблема: </span>
              {selected.problem}
            </p>
          )}
          {selected.recommended_service_name && (
            <p>
              <span className="muted">Рекомендуемая процедура: </span>
              {selected.recommended_service_name}
            </p>
          )}
          {selected.recommended_price != null && <p>{money(selected.recommended_price)}</p>}
          {selected.latest_record && (
            <div className="record-mini">
              <p className="muted">Последняя запись · {humanDate(selected.latest_record.performed_at)}</p>
              <p>{selected.latest_record.summary}</p>
            </div>
          )}
          {selected.notes && <p className="muted">{selected.notes}</p>}
          {(selected.state === 'treatment_required' || selected.state === 'treatment_planned') && (
            <Link className="btn btn-primary" to={`/book?tooth=${selected.tooth_id}`}>
              Записаться
            </Link>
          )}
        </section>
      )}
      <TabBar />
    </div>
  );
}
