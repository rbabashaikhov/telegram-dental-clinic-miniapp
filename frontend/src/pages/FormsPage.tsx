import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { TabBar } from '../components/TabBar';
import type { PatientForm } from '../types';

const empty: PatientForm = {
  allergies: '',
  medications: '',
  chronic_conditions: '',
  pregnancy: false,
  previous_surgery: '',
  notes: '',
};

export function FormsPage() {
  const [form, setForm] = useState<PatientForm>(empty);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void api.getForm().then((res) => setForm(res.data));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await api.saveForm(form);
    setSaved(true);
  }

  return (
    <div className="page">
      <p className="eyebrow">Анкета</p>
      <h1>Медицинская анкета</h1>
      <p className="muted">Только синтетические demo-данные. Не храните реальные чувствительные сведения.</p>
      <form className="stack" onSubmit={(event) => void submit(event)}>
        <label>
          Аллергии
          <textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
        </label>
        <label>
          Препараты
          <textarea value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} />
        </label>
        <label>
          Хронические состояния
          <textarea
            value={form.chronic_conditions}
            onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={form.pregnancy}
            onChange={(e) => setForm({ ...form, pregnancy: e.target.checked })}
          />
          Беременность
        </label>
        <label>
          Предыдущие операции
          <textarea value={form.previous_surgery} onChange={(e) => setForm({ ...form, previous_surgery: e.target.value })} />
        </label>
        <label>
          Заметки
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <button className="btn btn-primary" type="submit">
          Сохранить demo-анкету
        </button>
        {saved && <p className="muted">Сохранено в локальную demo-базу.</p>}
      </form>
      <TabBar />
    </div>
  );
}
