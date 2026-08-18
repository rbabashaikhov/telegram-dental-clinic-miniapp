import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { TabBar } from '../components/TabBar';
import { usePortal } from '../context/PortalContext';
import { addDays, humanDate, money, todayIso } from '../lib/format';
import type { Doctor, Service, TimeSlot } from '../types';
import { REASONS, SPECIALTY_LABEL } from '../types';

export function BookPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { portal, refresh } = usePortal();
  const itemId = params.get('itemId') ? Number(params.get('itemId')) : null;
  const recallId = params.get('recallId') ? Number(params.get('recallId')) : undefined;
  const rescheduleId = params.get('reschedule') ? Number(params.get('reschedule')) : null;
  const reasonParam = params.get('reason');
  const item = portal?.treatmentPlan?.items.find((row) => row.id === itemId) ?? null;
  const tooth = params.get('tooth');

  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [reason, setReason] = useState(reasonParam || (item ? '' : ''));
  const [serviceId, setServiceId] = useState<number | null>(item?.service_id ?? null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [date, setDate] = useState(addDays(todayIso(), 2));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([api.getServices(), api.getDoctors()]).then(([svc, doc]) => {
      setServices(svc.data);
      setDoctors(doc.data);
    });
  }, []);

  useEffect(() => {
    if (tooth && portal) {
      const match = portal.treatmentPlan?.items.find((row) => row.tooth_id === tooth && row.status === 'planned');
      if (match) {
        setServiceId(match.service_id);
      }
    }
  }, [portal, tooth]);

  const filteredServices = useMemo(() => {
    if (item) return services.filter((row) => row.id === item.service_id);
    if (!reason) return services;
    return services.filter((row) => row.visit_reason === reason);
  }, [item, reason, services]);

  const selectedService = services.find((row) => row.id === serviceId) ?? filteredServices[0];

  useEffect(() => {
    if (!selectedService) return;
    setServiceId(selectedService.id);
    void api
      .getAvailability({
        serviceId: selectedService.id,
        date,
        doctorId: doctorId ?? undefined,
      })
      .then((res) => {
        setSlots(res.data);
        setSlot(null);
      })
      .catch((err: Error) => setError(err.message));
  }, [selectedService, date, doctorId]);

  async function confirm() {
    if (!selectedService || !slot) return;
    setBusy(true);
    setError(null);
    try {
      if (rescheduleId) {
        await api.rescheduleAppointment(rescheduleId, {
          date: slot.date,
          startTime: slot.start_time,
          doctorId: doctorId,
        });
      } else if (item) {
        await api.bookTreatmentItem(item.id, {
          date: slot.date,
          startTime: slot.start_time,
          doctorId,
        });
      } else {
        await api.createAppointment({
          serviceId: selectedService.id,
          doctorId,
          date: slot.date,
          startTime: slot.start_time,
          recallId,
        });
      }
      await refresh();
      navigate('/book/done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записаться');
    } finally {
      setBusy(false);
    }
  }

  const dates = Array.from({ length: 10 }, (_, index) => addDays(todayIso(), index + 1));

  return (
    <div className="page">
      <p className="eyebrow">{item ? 'Запись на этап лечения' : rescheduleId ? 'Перенос визита' : 'Новая запись'}</p>
      <h1>{item ? item.title : 'Выберите причину обращения'}</h1>
      {item && <p className="muted">Контекст плана сохраняется: этап не потеряется после записи.</p>}

      {!item && !rescheduleId && (
        <div className="chip-row">
          {REASONS.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`chip ${reason === row.id ? 'is-on' : ''}`}
              onClick={() => {
                setReason(row.id);
                const next = services.find((service) => service.visit_reason === row.id);
                setServiceId(next?.id ?? null);
              }}
            >
              {row.label}
            </button>
          ))}
        </div>
      )}

      {filteredServices.length > 1 && (
        <div className="stack">
          {filteredServices.map((service) => (
            <button
              key={service.id}
              type="button"
              className={`card selectable ${serviceId === service.id ? 'is-on' : ''}`}
              onClick={() => setServiceId(service.id)}
            >
              <h2>{service.name}</h2>
              <p className="muted">{service.description}</p>
              <p>
                {money(service.price)} · {service.duration_minutes} мин
              </p>
            </button>
          ))}
        </div>
      )}

      {selectedService && (
        <>
          <h2>Врач</h2>
          <div className="chip-row" data-demo-tour="book-doctor">
            <button type="button" className={`chip ${doctorId == null ? 'is-on' : ''}`} onClick={() => setDoctorId(null)}>
              Любой врач
            </button>
            {doctors
              .filter((doctor) => doctor.specialty === selectedService.specialty)
              .map((doctor) => (
                <button
                  key={doctor.id}
                  type="button"
                  className={`chip ${doctorId === doctor.id ? 'is-on' : ''}`}
                  onClick={() => setDoctorId(doctor.id)}
                >
                  {doctor.name}
                  <span className="muted"> · {SPECIALTY_LABEL[doctor.specialty]}</span>
                </button>
              ))}
          </div>
          <h2>Дата</h2>
          <div className="chip-row">
            {dates.map((value) => (
              <button key={value} type="button" className={`chip ${date === value ? 'is-on' : ''}`} onClick={() => setDate(value)}>
                {humanDate(value).replace(/ г\./, '')}
              </button>
            ))}
          </div>
          <h2>Свободное время</h2>
          <div className="slot-grid" data-demo-tour="book-slots">
            {slots.length === 0 && <p className="muted">На эту дату свободных слотов нет.</p>}
            {slots.map((row) => (
              <button
                key={`${row.doctor_id}-${row.start_time}`}
                type="button"
                className={`slot ${slot?.start_time === row.start_time && slot.doctor_id === row.doctor_id ? 'is-on' : ''}`}
                onClick={() => setSlot(row)}
              >
                <strong>{row.start_time}</strong>
                <span>{row.doctor_name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {slot && (
        <section className="card" data-demo-tour="book-confirm">
          <p className="eyebrow">Подтверждение</p>
          <h2>{item?.title || selectedService?.name}</h2>
          <p>
            {slot.doctor_name} · {humanDate(slot.date)} · {slot.start_time}
          </p>
          {slot.room_name && <p className="muted">{slot.room_name}</p>}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void confirm()}>
            {busy ? 'Сохраняем…' : 'Подтвердить запись'}
          </button>
        </section>
      )}
      {error && <p className="error-state">{error}</p>}
      <TabBar />
    </div>
  );
}

export function BookDonePage() {
  const { portal } = usePortal();
  return (
    <div className="page">
      <div className="card" data-demo-tour="book-done">
        <p className="eyebrow">Готово</p>
        <h1>Запись сохранена</h1>
        {portal?.nextAppointment && (
          <p>
            {portal.nextAppointment.service_name}: {humanDate(portal.nextAppointment.appointment_date)} в{' '}
            {portal.nextAppointment.start_time}
          </p>
        )}
        <Link className="btn btn-primary" to="/">
          На главный экран
        </Link>
      </div>
      <TabBar />
    </div>
  );
}
