export function money(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
}

export function humanDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  );
}

export function shortDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  );
}

export function patientName(patient: { first_name: string; last_name: string }): string {
  return `${patient.first_name} ${patient.last_name}`.trim();
}

export function ageFromBirth(birth: string | null, now = new Date()): number | null {
  if (!birth) return null;
  const [y, m, d] = birth.split('-').map(Number);
  let age = now.getFullYear() - y;
  const monthDiff = now.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d)) age -= 1;
  return age;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(y, m - 1, d + days);
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${next.getFullYear()}-${month}-${day}`;
}

export function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export const ITEM_STATUS: Record<string, string> = {
  planned: 'Запланирован',
  scheduled: 'Запись есть',
  in_progress: 'В работе',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

export const APPT_STATUS: Record<string, string> = {
  scheduled: 'Запланирован',
  confirmed: 'Подтверждён',
  completed: 'Завершён',
  cancelled: 'Отменён',
  no_show: 'Не пришёл',
};
