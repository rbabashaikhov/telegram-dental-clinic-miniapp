import { Link } from 'react-router-dom';
import { TabBar } from '../components/TabBar';
import { usePortal } from '../context/PortalContext';
import { ageFromBirth, patientName } from '../lib/format';

export function FamilyPage() {
  const { portal, selectPatient } = usePortal();
  const family = portal?.family ?? [];
  const activeId = portal?.patient.id;

  return (
    <div className="page">
      <p className="eyebrow">Семья</p>
      <h1>Профили</h1>
      <p className="muted">Переключение меняет записи, план, карту, историю и recall.</p>
      <div className="stack">
        {family.map((member) => {
          const age = ageFromBirth(member.patient.birth_date);
          return (
            <button
              key={member.id}
              type="button"
              className={`card selectable ${activeId === member.patient_id ? 'is-on' : ''}`}
              onClick={() => void selectPatient(member.patient_id)}
            >
              <h2>{patientName(member.patient)}</h2>
              <p className="muted">
                {member.relation === 'self' ? 'Основной профиль' : member.relation}
                {age != null ? ` · ${age} лет` : ''}
              </p>
            </button>
          );
        })}
      </div>
      <Link className="btn btn-secondary" to="/forms">
        Анкета текущего профиля
      </Link>
      <TabBar />
    </div>
  );
}
