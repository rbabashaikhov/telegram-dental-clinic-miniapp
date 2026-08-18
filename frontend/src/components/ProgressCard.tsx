import { money } from '../lib/format';

export function ProgressCard({
  completed,
  total,
  percent,
  estimated,
  paid,
  outstanding,
}: {
  completed: number;
  total: number;
  percent: number;
  estimated: number;
  paid: number;
  outstanding: number;
}) {
  return (
    <div className="progress-finances">
      <p className="muted">
        {completed} из {total} этапов завершено
      </p>
      <div className="progress-track" aria-label={`${percent}%`}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="progress-percent">{percent}%</p>
      <div className="finance-grid">
        <div>
          <span className="muted">Стоимость плана</span>
          <strong>{money(estimated)}</strong>
        </div>
        <div>
          <span className="muted">Оплачено</span>
          <strong>{money(paid)}</strong>
        </div>
        <div>
          <span className="muted">Осталось</span>
          <strong>{money(outstanding)}</strong>
        </div>
      </div>
    </div>
  );
}
