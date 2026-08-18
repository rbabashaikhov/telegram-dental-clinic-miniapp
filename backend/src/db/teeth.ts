export const UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'] as const;
export const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'] as const;
export const LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41'] as const;
export const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'] as const;

export const PERMANENT_TEETH = [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT];

export const TOOTH_LABELS: Record<string, string> = {
  healthy: 'Здоровый',
  treatment_required: 'Требуется лечение',
  treatment_planned: 'Запланировано лечение',
  treated: 'Вылечен',
  crown: 'Коронка',
  implant: 'Имплантат',
  missing: 'Отсутствует',
};
