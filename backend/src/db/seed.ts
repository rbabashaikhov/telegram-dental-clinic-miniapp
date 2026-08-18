import type Database from 'better-sqlite3';
import { PERMANENT_TEETH } from './teeth.js';
import { addDaysIso, todayDateString } from '../services/time.js';

const DEMO_TELEGRAM_ID = 999000001;

function insert(database: Database.Database, table: string, row: Record<string, unknown>): number {
  const keys = Object.keys(row);
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
  const result = database.prepare(sql).run(...keys.map((key) => row[key]));
  return Number(result.lastInsertRowid);
}

export function seed(database: Database.Database, now = new Date('2026-08-18T09:00:00+03:00')): void {
  const existing = database.prepare('SELECT COUNT(*) AS count FROM clinics').get() as { count: number };
  if (existing.count > 0) return;

  const today = todayDateString(now);

  const clinicId = insert(database, 'clinics', {
    name: 'DentalCare на Патриарших',
    description: 'Семейная стоматология с планом лечения, визуальной картой и персональным сопровождением.',
    phone: '+7 495 120-45-10',
    email: 'hello@dentalcare.demo',
    address: 'Москва, Большой Патриарший переулок, 8',
    timezone: 'Europe/Moscow',
  });

  const locationId = insert(database, 'locations', {
    clinic_id: clinicId,
    name: 'Клиника на Патриарших',
    address: 'Москва, Большой Патриарший переулок, 8',
    timezone: 'Europe/Moscow',
    active: 1,
  });

  const rooms = {
    one: insert(database, 'rooms', { location_id: locationId, name: 'Кабинет 1', room_type: 'general', active: 1 }),
    two: insert(database, 'rooms', { location_id: locationId, name: 'Кабинет 2', room_type: 'general', active: 1 }),
    hygiene: insert(database, 'rooms', { location_id: locationId, name: 'Гигиена', room_type: 'hygiene', active: 1 }),
    pediatric: insert(database, 'rooms', { location_id: locationId, name: 'Детский кабинет', room_type: 'pediatric', active: 1 }),
    surgery: insert(database, 'rooms', { location_id: locationId, name: 'Хирургия', room_type: 'surgery', active: 1 }),
  };

  const doctors = {
    therapist: insert(database, 'doctors', {
      location_id: locationId,
      name: 'Елена Волкова',
      specialty: 'therapist',
      avatar: '',
      bio: 'Терапевт. Лечение кариеса, эстетические реставрации и спокойный разбор плана лечения.',
      active: 1,
    }),
    hygienist: insert(database, 'doctors', {
      location_id: locationId,
      name: 'Игорь Петров',
      specialty: 'hygienist',
      avatar: '',
      bio: 'Гигиенист. Профессиональная гигиена AirFlow, профилактика и обучение домашнему уходу.',
      active: 1,
    }),
    orthodontist: insert(database, 'doctors', {
      location_id: locationId,
      name: 'Мария Кузнецова',
      specialty: 'orthodontist',
      avatar: '',
      bio: 'Ортодонт. Элайнеры и брекет-системы для взрослых и подростков.',
      active: 1,
    }),
    implantologist: insert(database, 'doctors', {
      location_id: locationId,
      name: 'Павел Орлов',
      specialty: 'implantologist',
      avatar: '',
      bio: 'Имплантолог. Одноэтапная и классическая имплантация, костная пластика.',
      active: 1,
    }),
    pediatric: insert(database, 'doctors', {
      location_id: locationId,
      name: 'Анна Белова',
      specialty: 'pediatric',
      avatar: '',
      bio: 'Детский стоматолог. Адаптация, профилактика и лечение без спешки.',
      active: 1,
    }),
  };

  const weekdayHours = [
    { weekday: 1, start_time: '09:00', end_time: '13:00' },
    { weekday: 1, start_time: '14:00', end_time: '18:00' },
    { weekday: 2, start_time: '09:00', end_time: '13:00' },
    { weekday: 2, start_time: '14:00', end_time: '18:00' },
    { weekday: 3, start_time: '09:00', end_time: '13:00' },
    { weekday: 3, start_time: '14:00', end_time: '18:00' },
    { weekday: 4, start_time: '09:00', end_time: '13:00' },
    { weekday: 4, start_time: '14:00', end_time: '18:00' },
    { weekday: 5, start_time: '09:00', end_time: '13:00' },
    { weekday: 5, start_time: '14:00', end_time: '18:00' },
    { weekday: 6, start_time: '10:00', end_time: '15:00' },
  ];
  const insertSchedule = database.prepare(
    'INSERT INTO doctor_schedules (doctor_id, weekday, start_time, end_time) VALUES (?, ?, ?, ?)',
  );
  for (const doctorId of Object.values(doctors)) {
    for (const slot of weekdayHours) {
      insertSchedule.run(doctorId, slot.weekday, slot.start_time, slot.end_time);
    }
  }

  const services = {
    consult: insert(database, 'services', {
      name: 'Диагностика и консультация',
      description: 'Осмотр, фотопротокол и разбор плана лечения.',
      duration_minutes: 45,
      price: 10000,
      specialty: 'therapist',
      visit_reason: 'consultation',
      room_type: 'general',
      repeatable: 0,
      active: 1,
    }),
    hygiene: insert(database, 'services', {
      name: 'Профессиональная гигиена',
      description: 'Снятие камня, AirFlow и покрытие реминерализующим гелем.',
      duration_minutes: 60,
      price: 18000,
      specialty: 'hygienist',
      visit_reason: 'hygiene',
      room_type: 'hygiene',
      repeatable: 1,
      active: 1,
    }),
    caries: insert(database, 'services', {
      name: 'Лечение кариеса',
      description: 'Препарирование, изоляция и эстетическая реставрация.',
      duration_minutes: 75,
      price: 12000,
      specialty: 'therapist',
      visit_reason: 'therapy',
      room_type: 'general',
      repeatable: 0,
      active: 1,
    }),
    pulpitis: insert(database, 'services', {
      name: 'Лечение пульпита',
      description: 'Эндодонтическое лечение с микроскопом.',
      duration_minutes: 90,
      price: 22000,
      specialty: 'therapist',
      visit_reason: 'tooth_pain',
      room_type: 'general',
      repeatable: 0,
      active: 1,
    }),
    filling: insert(database, 'services', {
      name: 'Эстетическая реставрация',
      description: 'Восстановление формы и цвета зуба.',
      duration_minutes: 60,
      price: 14000,
      specialty: 'therapist',
      visit_reason: null,
      room_type: 'general',
      repeatable: 0,
      active: 1,
    }),
    extraction: insert(database, 'services', {
      name: 'Удаление зуба',
      description: 'Атравматичное удаление с контролем заживления.',
      duration_minutes: 45,
      price: 16000,
      specialty: 'implantologist',
      visit_reason: null,
      room_type: 'surgery',
      repeatable: 0,
      active: 1,
    }),
    crown: insert(database, 'services', {
      name: 'Коронка',
      description: 'Циркониевая коронка с цифровым сканированием.',
      duration_minutes: 90,
      price: 28000,
      specialty: 'therapist',
      visit_reason: null,
      room_type: 'general',
      repeatable: 0,
      active: 1,
    }),
    implant: insert(database, 'services', {
      name: 'Имплантация',
      description: 'Установка имплантата и формирование десны.',
      duration_minutes: 120,
      price: 180000,
      specialty: 'implantologist',
      visit_reason: 'implant',
      room_type: 'surgery',
      repeatable: 0,
      active: 1,
    }),
    ortho: insert(database, 'services', {
      name: 'Ортодонтическая консультация',
      description: 'Диагностика прикуса и подбор системы.',
      duration_minutes: 45,
      price: 8000,
      specialty: 'orthodontist',
      visit_reason: 'orthodontics',
      room_type: 'general',
      repeatable: 0,
      active: 1,
    }),
    braces: insert(database, 'services', {
      name: 'Установка брекет-системы',
      description: 'Фиксация брекетов и план перемещений.',
      duration_minutes: 90,
      price: 98000,
      specialty: 'orthodontist',
      visit_reason: null,
      room_type: 'general',
      repeatable: 0,
      active: 1,
    }),
    pediatric: insert(database, 'services', {
      name: 'Детский осмотр',
      description: 'Адаптация, осмотр и рекомендации родителям.',
      duration_minutes: 30,
      price: 5000,
      specialty: 'pediatric',
      visit_reason: 'pediatric',
      room_type: 'pediatric',
      repeatable: 1,
      active: 1,
    }),
    checkup: insert(database, 'services', {
      name: 'Контрольный осмотр',
      description: 'Проверка результата лечения и фотопротокол.',
      duration_minutes: 30,
      price: 12000,
      specialty: 'therapist',
      visit_reason: 'other',
      room_type: 'general',
      repeatable: 1,
      active: 1,
    }),
    xray: insert(database, 'services', {
      name: 'Прицельный снимок',
      description: 'Диагностический снимок зуба. Обработка DICOM не выполняется.',
      duration_minutes: 15,
      price: 2500,
      specialty: 'therapist',
      visit_reason: null,
      room_type: 'general',
      repeatable: 0,
      active: 1,
    }),
    whitening: insert(database, 'services', {
      name: 'Кабинетное отбеливание',
      description: 'Профессиональное отбеливание после гигиены.',
      duration_minutes: 60,
      price: 24000,
      specialty: 'hygienist',
      visit_reason: null,
      room_type: 'hygiene',
      repeatable: 0,
      active: 1,
    }),
    perio: insert(database, 'services', {
      name: 'Лечение дёсен',
      description: 'Пародонтологическая поддержка и кюретаж.',
      duration_minutes: 60,
      price: 18000,
      specialty: 'hygienist',
      visit_reason: null,
      room_type: 'hygiene',
      repeatable: 0,
      active: 1,
    }),
  };

  const linkService = database.prepare('INSERT INTO doctor_services (doctor_id, service_id) VALUES (?, ?)');
  for (const serviceId of [services.consult, services.caries, services.pulpitis, services.filling, services.crown, services.checkup, services.xray]) {
    linkService.run(doctors.therapist, serviceId);
  }
  for (const serviceId of [services.hygiene, services.whitening, services.perio]) {
    linkService.run(doctors.hygienist, serviceId);
  }
  linkService.run(doctors.orthodontist, services.ortho);
  linkService.run(doctors.orthodontist, services.braces);
  linkService.run(doctors.implantologist, services.implant);
  linkService.run(doctors.implantologist, services.extraction);
  linkService.run(doctors.pediatric, services.pediatric);
  linkService.run(doctors.pediatric, services.hygiene);

  const annaId = insert(database, 'patients', {
    telegram_user_id: DEMO_TELEGRAM_ID,
    first_name: 'Анна',
    last_name: 'Смирнова',
    phone: '+7 916 000-11-22',
    email: 'anna.smirnova@demo.local',
    birth_date: '1988-04-12',
    username: 'demo_patient',
    relation: 'self',
    active: 1,
  });
  const maximId = insert(database, 'patients', {
    telegram_user_id: null,
    first_name: 'Максим',
    last_name: 'Смирнов',
    phone: '',
    email: '',
    birth_date: '2017-03-04',
    username: null,
    relation: 'child',
    active: 1,
  });
  const sofiaId = insert(database, 'patients', {
    telegram_user_id: null,
    first_name: 'София',
    last_name: 'Смирнова',
    phone: '',
    email: '',
    birth_date: '2020-09-18',
    username: null,
    relation: 'child',
    active: 1,
  });

  insert(database, 'family_members', { owner_telegram_user_id: DEMO_TELEGRAM_ID, patient_id: annaId, relation: 'self', is_primary: 1 });
  insert(database, 'family_members', { owner_telegram_user_id: DEMO_TELEGRAM_ID, patient_id: maximId, relation: 'son', is_primary: 0 });
  insert(database, 'family_members', { owner_telegram_user_id: DEMO_TELEGRAM_ID, patient_id: sofiaId, relation: 'daughter', is_primary: 0 });

  insert(database, 'patient_forms', {
    patient_id: annaId,
    allergies: 'Лидокаин — уточнять альтернативу',
    medications: 'Нет постоянных препаратов',
    chronic_conditions: 'Нет',
    pregnancy: 0,
    previous_surgery: 'Удаление зуба мудрости в 2019',
    notes: 'Синтетические demo-данные. Не являются медицинской картой.',
  });

  const dmitryId = insert(database, 'patients', {
    telegram_user_id: null,
    first_name: 'Дмитрий',
    last_name: 'Козлов',
    phone: '+7 903 111-22-33',
    email: '',
    birth_date: '1979-11-02',
    username: null,
    relation: 'self',
    active: 1,
  });
  const olgaId = insert(database, 'patients', {
    telegram_user_id: null,
    first_name: 'Ольга',
    last_name: 'Новикова',
    phone: '+7 905 222-33-44',
    email: '',
    birth_date: '1992-06-21',
    username: null,
    relation: 'self',
    active: 1,
  });
  const sergeyId = insert(database, 'patients', {
    telegram_user_id: null,
    first_name: 'Сергей',
    last_name: 'Морозов',
    phone: '+7 926 333-44-55',
    email: '',
    birth_date: '1984-01-15',
    username: null,
    relation: 'self',
    active: 1,
  });
  const irinaId = insert(database, 'patients', {
    telegram_user_id: null,
    first_name: 'Ирина',
    last_name: 'Лебедева',
    phone: '+7 915 444-55-66',
    email: '',
    birth_date: '1975-08-09',
    username: null,
    relation: 'self',
    active: 1,
  });

  const toothInsert = database.prepare(
    `INSERT INTO teeth (patient_id, tooth_id, state, problem, recommended_service_id, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const tooth of PERMANENT_TEETH) {
    let state = 'healthy';
    let problem = '';
    let service: number | null = null;
    let notes = '';
    if (tooth === '18') {
      state = 'missing';
      problem = 'Зуб удалён';
      notes = 'Удалён в 2019';
    } else if (tooth === '16') {
      state = 'treatment_planned';
      problem = 'Кариес';
      service = services.caries;
      notes = 'Этап плана: лечение кариеса';
    } else if (tooth === '26') {
      state = 'treatment_required';
      problem = 'Кариес';
      service = services.pulpitis;
      notes = 'Следующий рекомендуемый этап';
    } else if (tooth === '36') {
      state = 'treated';
      problem = '';
      notes = 'Реставрация 2024';
    } else if (tooth === '46') {
      state = 'crown';
      notes = 'Коронка 2023';
    }
    toothInsert.run(annaId, tooth, state, problem, service, notes);
  }

  for (const childId of [maximId, sofiaId]) {
    for (const tooth of PERMANENT_TEETH) {
      toothInsert.run(childId, tooth, 'healthy', '', null, 'Детская карта, demo');
    }
  }

  const annaPlanId = insert(database, 'treatment_plans', {
    patient_id: annaId,
    title: 'План лечения: кариес 16 и 26',
    status: 'in_progress',
    created_at: '2026-07-08 10:00:00',
    accepted_at: '2026-07-08 10:20:00',
    estimated_total: 74000,
    paid_total: 28000,
    notes: 'План принят на консультации. Оплачены завершённые этапы.',
  });

  const item1 = insert(database, 'treatment_plan_items', {
    treatment_plan_id: annaPlanId,
    tooth_id: null,
    service_id: services.consult,
    title: 'Диагностика и консультация',
    description: 'Осмотр, снимок и согласование плана.',
    doctor_specialty: 'therapist',
    estimated_price: 10000,
    status: 'completed',
    sort_order: 1,
    recommended_before: '2026-07-15',
    prerequisite_item_id: null,
    appointment_id: null,
  });
  const item2 = insert(database, 'treatment_plan_items', {
    treatment_plan_id: annaPlanId,
    tooth_id: null,
    service_id: services.hygiene,
    title: 'Профессиональная гигиена',
    description: 'Подготовка эмали перед лечением.',
    doctor_specialty: 'hygienist',
    estimated_price: 18000,
    status: 'completed',
    sort_order: 2,
    recommended_before: '2026-07-25',
    prerequisite_item_id: item1,
    appointment_id: null,
  });
  const item3 = insert(database, 'treatment_plan_items', {
    treatment_plan_id: annaPlanId,
    tooth_id: '16',
    service_id: services.caries,
    title: 'Лечение кариеса зуба 16',
    description: 'Реставрация жевательной поверхности.',
    doctor_specialty: 'therapist',
    estimated_price: 12000,
    status: 'scheduled',
    sort_order: 3,
    recommended_before: '2026-08-25',
    prerequisite_item_id: item2,
    appointment_id: null,
  });
  const item4 = insert(database, 'treatment_plan_items', {
    treatment_plan_id: annaPlanId,
    tooth_id: '26',
    service_id: services.pulpitis,
    title: 'Лечение зуба 26',
    description: 'Глубокий кариес, вероятна эндодонтия.',
    doctor_specialty: 'therapist',
    estimated_price: 22000,
    status: 'planned',
    sort_order: 4,
    recommended_before: '2026-09-30',
    prerequisite_item_id: item3,
    appointment_id: null,
  });
  insert(database, 'treatment_plan_items', {
    treatment_plan_id: annaPlanId,
    tooth_id: null,
    service_id: services.checkup,
    title: 'Контрольный осмотр',
    description: 'Проверка реставраций и рекомендации по уходу.',
    doctor_specialty: 'therapist',
    estimated_price: 12000,
    status: 'planned',
    sort_order: 5,
    recommended_before: '2026-10-30',
    prerequisite_item_id: item4,
    appointment_id: null,
  });

  const consultAppt = insert(database, 'appointments', {
    patient_id: annaId,
    doctor_id: doctors.therapist,
    service_id: services.consult,
    room_id: rooms.one,
    location_id: locationId,
    treatment_plan_item_id: item1,
    recall_id: null,
    appointment_date: '2026-07-10',
    start_time: '10:00',
    end_time: '10:45',
    duration_minutes: 45,
    status: 'completed',
    price: 10000,
    notes: '',
    created_at: '2026-07-08 11:00:00',
  });
  const hygieneAppt = insert(database, 'appointments', {
    patient_id: annaId,
    doctor_id: doctors.hygienist,
    service_id: services.hygiene,
    room_id: rooms.hygiene,
    location_id: locationId,
    treatment_plan_item_id: item2,
    recall_id: null,
    appointment_date: '2026-07-21',
    start_time: '11:00',
    end_time: '12:00',
    duration_minutes: 60,
    status: 'completed',
    price: 18000,
    notes: '',
    created_at: '2026-07-10 12:00:00',
  });
  const upcoming = insert(database, 'appointments', {
    patient_id: annaId,
    doctor_id: doctors.therapist,
    service_id: services.caries,
    room_id: rooms.one,
    location_id: locationId,
    treatment_plan_item_id: item3,
    recall_id: null,
    appointment_date: addDaysIso(today, 2),
    start_time: '10:00',
    end_time: '11:15',
    duration_minutes: 75,
    status: 'scheduled',
    price: 12000,
    notes: 'Этап плана: зуб 16',
    created_at: '2026-08-01 09:00:00',
  });
  database.prepare('UPDATE treatment_plan_items SET appointment_id = ? WHERE id = ?').run(consultAppt, item1);
  database.prepare('UPDATE treatment_plan_items SET appointment_id = ? WHERE id = ?').run(hygieneAppt, item2);
  database.prepare('UPDATE treatment_plan_items SET appointment_id = ? WHERE id = ?').run(upcoming, item3);

  insert(database, 'appointment_history', { appointment_id: consultAppt, from_status: 'scheduled', to_status: 'completed', note: 'Визит завершён' });
  insert(database, 'appointment_history', { appointment_id: hygieneAppt, from_status: 'scheduled', to_status: 'completed', note: 'Визит завершён' });
  insert(database, 'appointment_history', { appointment_id: upcoming, from_status: null, to_status: 'scheduled', note: 'Запись на этап лечения' });

  insert(database, 'treatment_records', {
    patient_id: annaId,
    appointment_id: consultAppt,
    tooth_id: null,
    service_id: services.consult,
    doctor_id: doctors.therapist,
    performed_at: '2026-07-10',
    summary: 'Составлен план лечения: гигиена, зуб 16, зуб 26, контрольный осмотр.',
    recommendations: 'Начать с профессиональной гигиены, затем закрыть кариес 16.',
    price: 10000,
    treatment_plan_item_id: item1,
  });
  insert(database, 'treatment_records', {
    patient_id: annaId,
    appointment_id: hygieneAppt,
    tooth_id: null,
    service_id: services.hygiene,
    doctor_id: doctors.hygienist,
    performed_at: '2026-07-21',
    summary: 'Профессиональная гигиена, AirFlow, покрытие эмали.',
    recommendations: 'Повторная гигиена через 6 месяцев. Мягкая щётка и ирригатор.',
    price: 18000,
    treatment_plan_item_id: item2,
  });

  insert(database, 'payments', {
    patient_id: annaId,
    treatment_plan_id: annaPlanId,
    appointment_id: consultAppt,
    amount: 10000,
    status: 'paid',
    method: 'mock',
  });
  insert(database, 'payments', {
    patient_id: annaId,
    treatment_plan_id: annaPlanId,
    appointment_id: hygieneAppt,
    amount: 18000,
    status: 'paid',
    method: 'mock',
  });
  insert(database, 'invoices', {
    patient_id: annaId,
    treatment_plan_id: annaPlanId,
    total: 74000,
    paid_total: 28000,
    status: 'open',
  });

  insert(database, 'recalls', {
    patient_id: annaId,
    type: 'hygiene',
    due_at: '2027-02-20',
    status: 'scheduled',
    related_service_id: services.hygiene,
    related_treatment_plan_id: annaPlanId,
    title: 'Профессиональная гигиена',
    notes: 'Рекомендуется через 6 месяцев после последнего визита.',
  });

  const maximAppt = insert(database, 'appointments', {
    patient_id: maximId,
    doctor_id: doctors.pediatric,
    service_id: services.pediatric,
    room_id: rooms.pediatric,
    location_id: locationId,
    treatment_plan_item_id: null,
    recall_id: null,
    appointment_date: today,
    start_time: '16:00',
    end_time: '16:30',
    duration_minutes: 30,
    status: 'confirmed',
    price: 5000,
    notes: 'Адаптационный осмотр',
  });
  insert(database, 'appointment_history', { appointment_id: maximAppt, from_status: 'scheduled', to_status: 'confirmed', note: 'Подтверждено администратором' });
  insert(database, 'recalls', {
    patient_id: maximId,
    type: 'checkup',
    due_at: addDaysIso(today, -2),
    status: 'due',
    related_service_id: services.pediatric,
    related_treatment_plan_id: null,
    title: 'Детский контрольный осмотр',
    notes: 'Максиму пора на профилактический визит.',
  });
  insert(database, 'recalls', {
    patient_id: sofiaId,
    type: 'hygiene',
    due_at: addDaysIso(today, 40),
    status: 'scheduled',
    related_service_id: services.pediatric,
    related_treatment_plan_id: null,
    title: 'Детская гигиена',
    notes: 'Мягкая адаптация, без лечения.',
  });

  const dmitryPlan = insert(database, 'treatment_plans', {
    patient_id: dmitryId,
    title: 'Имплантация зуба 36',
    status: 'accepted',
    accepted_at: '2026-06-12 12:00:00',
    estimated_total: 180000,
    paid_total: 0,
    notes: 'План принят, запись не назначена.',
  });
  insert(database, 'treatment_plan_items', {
    treatment_plan_id: dmitryPlan,
    tooth_id: '36',
    service_id: services.implant,
    title: 'Имплантация зуба 36',
    description: 'Установка имплантата после консультации.',
    doctor_specialty: 'implantologist',
    estimated_price: 180000,
    status: 'planned',
    sort_order: 1,
    recommended_before: '2026-09-15',
    prerequisite_item_id: null,
    appointment_id: null,
  });

  const olgaPlan = insert(database, 'treatment_plans', {
    patient_id: olgaId,
    title: 'Ортодонтия: брекет-система',
    status: 'in_progress',
    accepted_at: '2026-05-20 11:00:00',
    estimated_total: 98000,
    paid_total: 8000,
    notes: 'Консультация пройдена, установка не записана.',
  });
  insert(database, 'treatment_plan_items', {
    treatment_plan_id: olgaPlan,
    tooth_id: null,
    service_id: services.braces,
    title: 'Установка брекет-системы',
    description: 'Фиксация после согласования плана перемещений.',
    doctor_specialty: 'orthodontist',
    estimated_price: 98000,
    status: 'planned',
    sort_order: 1,
    recommended_before: '2026-08-30',
    prerequisite_item_id: null,
    appointment_id: null,
  });

  const sergeyPlan = insert(database, 'treatment_plans', {
    patient_id: sergeyId,
    title: 'Коронки 14 и 15',
    status: 'accepted',
    accepted_at: '2026-07-01 15:00:00',
    estimated_total: 56000,
    paid_total: 0,
    notes: '',
  });
  insert(database, 'treatment_plan_items', {
    treatment_plan_id: sergeyPlan,
    tooth_id: '14',
    service_id: services.crown,
    title: 'Коронка зуба 14',
    description: 'Циркониевая коронка.',
    doctor_specialty: 'therapist',
    estimated_price: 28000,
    status: 'planned',
    sort_order: 1,
    recommended_before: '2026-09-10',
    prerequisite_item_id: null,
    appointment_id: null,
  });
  insert(database, 'treatment_plan_items', {
    treatment_plan_id: sergeyPlan,
    tooth_id: '15',
    service_id: services.crown,
    title: 'Коронка зуба 15',
    description: 'Циркониевая коронка.',
    doctor_specialty: 'therapist',
    estimated_price: 28000,
    status: 'planned',
    sort_order: 2,
    recommended_before: '2026-09-20',
    prerequisite_item_id: null,
    appointment_id: null,
  });

  const irinaPlan = insert(database, 'treatment_plans', {
    patient_id: irinaId,
    title: 'Пародонтологическая поддержка',
    status: 'proposed',
    accepted_at: null,
    estimated_total: 18000,
    paid_total: 0,
    notes: 'План предложен, запись не создана.',
  });
  insert(database, 'treatment_plan_items', {
    treatment_plan_id: irinaPlan,
    tooth_id: null,
    service_id: services.perio,
    title: 'Лечение дёсен',
    description: 'Кюретаж и поддерживающая терапия.',
    doctor_specialty: 'hygienist',
    estimated_price: 18000,
    status: 'planned',
    sort_order: 1,
    recommended_before: '2026-08-28',
    prerequisite_item_id: null,
    appointment_id: null,
  });

  insert(database, 'appointments', {
    patient_id: irinaId,
    doctor_id: doctors.hygienist,
    service_id: services.hygiene,
    room_id: rooms.hygiene,
    location_id: locationId,
    treatment_plan_item_id: null,
    recall_id: null,
    appointment_date: today,
    start_time: '09:00',
    end_time: '10:00',
    duration_minutes: 60,
    status: 'completed',
    price: 18000,
    notes: '',
  });
  insert(database, 'appointments', {
    patient_id: olgaId,
    doctor_id: doctors.orthodontist,
    service_id: services.ortho,
    room_id: rooms.two,
    location_id: locationId,
    treatment_plan_item_id: null,
    recall_id: null,
    appointment_date: today,
    start_time: '11:00',
    end_time: '11:45',
    duration_minutes: 45,
    status: 'cancelled',
    price: 8000,
    notes: 'Пациентка перенесла',
  });
  insert(database, 'appointments', {
    patient_id: sergeyId,
    doctor_id: doctors.therapist,
    service_id: services.consult,
    room_id: rooms.two,
    location_id: locationId,
    treatment_plan_item_id: null,
    recall_id: null,
    appointment_date: today,
    start_time: '12:00',
    end_time: '12:45',
    duration_minutes: 45,
    status: 'no_show',
    price: 10000,
    notes: '',
  });
  insert(database, 'appointments', {
    patient_id: dmitryId,
    doctor_id: doctors.implantologist,
    service_id: services.implant,
    room_id: rooms.surgery,
    location_id: locationId,
    treatment_plan_item_id: null,
    recall_id: null,
    appointment_date: addDaysIso(today, 5),
    start_time: '10:00',
    end_time: '12:00',
    duration_minutes: 120,
    status: 'scheduled',
    price: 180000,
    notes: 'Консультация перед имплантацией уже была; это отдельный визит.',
  });

  insert(database, 'schedule_blocks', {
    doctor_id: doctors.implantologist,
    room_id: rooms.surgery,
    block_date: addDaysIso(today, 1),
    start_time: '09:00',
    end_time: '18:00',
    reason: 'Операционный день вне клиники',
  });
  insert(database, 'schedule_blocks', {
    doctor_id: doctors.therapist,
    room_id: null,
    block_date: addDaysIso(today, 3),
    start_time: '14:00',
    end_time: '18:00',
    reason: 'Обучение',
  });

  insert(database, 'events', {
    name: 'treatment_plan.created',
    payload: JSON.stringify({ treatmentPlanId: annaPlanId, patientId: annaId }),
  });
  insert(database, 'notifications', {
    patient_id: annaId,
    kind: 'appointment_created',
    title: 'Запись подтверждена',
    body: 'Лечение кариеса зуба 16 — ближайший визит.',
  });
}
