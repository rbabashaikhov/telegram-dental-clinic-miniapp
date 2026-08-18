import type { Tooth, ToothState } from '../types';

const UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

function ToothButton({
  id,
  tooth,
  selected,
  onSelect,
}: {
  id: string;
  tooth?: Tooth;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const state: ToothState = tooth?.state ?? 'healthy';
  return (
    <button
      type="button"
      className={`tooth ${state} ${selected ? 'is-selected' : ''}`}
      data-demo-tour={id === '16' ? 'tooth-16' : undefined}
      onClick={() => onSelect(id)}
    >
      <span className="tooth-shape" />
      <span className="tooth-id">{id}</span>
    </button>
  );
}

export function DentalChartView({
  teeth,
  selectedId,
  onSelect,
}: {
  teeth: Tooth[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(teeth.map((tooth) => [tooth.tooth_id, tooth]));
  return (
    <div className="odontogram" data-demo-tour="dental-chart">
      <div className="arch upper">
        <div className="quadrant">
          {UPPER_RIGHT.map((id) => (
            <ToothButton key={id} id={id} tooth={byId.get(id)} selected={selectedId === id} onSelect={onSelect} />
          ))}
        </div>
        <div className="arch-split" />
        <div className="quadrant">
          {UPPER_LEFT.map((id) => (
            <ToothButton key={id} id={id} tooth={byId.get(id)} selected={selectedId === id} onSelect={onSelect} />
          ))}
        </div>
      </div>
      <div className="arch-label">верхняя челюсть</div>
      <div className="arch lower">
        <div className="quadrant">
          {LOWER_RIGHT.map((id) => (
            <ToothButton key={id} id={id} tooth={byId.get(id)} selected={selectedId === id} onSelect={onSelect} />
          ))}
        </div>
        <div className="arch-split" />
        <div className="quadrant">
          {LOWER_LEFT.map((id) => (
            <ToothButton key={id} id={id} tooth={byId.get(id)} selected={selectedId === id} onSelect={onSelect} />
          ))}
        </div>
      </div>
      <div className="arch-label">нижняя челюсть</div>
    </div>
  );
}
