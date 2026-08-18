import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import type { Doctor, Room, Service, TimeSlot } from '../types.js';
import {
  currentTimeString,
  intervalsOverlap,
  minutesToTime,
  timeToMinutes,
  todayDateString,
  weekdayOf,
} from './time.js';

const SLOT_STEP = 15;

export class SlotUnavailableError extends AppError {
  constructor(message = 'Selected time slot is no longer available') {
    super(message, 409, 'SLOT_UNAVAILABLE');
    this.name = 'SlotUnavailableError';
  }
}

function roomsForService(providers: Providers, service: Service): Room[] {
  const rooms = providers.clinic.listRooms(undefined, true);
  const matching = rooms.filter((room) => room.room_type === service.room_type && room.active);
  return matching.length ? matching : rooms.filter((room) => room.active);
}

function isBlocked(
  providers: Providers,
  params: { date: string; doctorId: number; roomId: number | null; start: string; end: string },
): boolean {
  const blocks = providers.availability.listBlocks({ date: params.date });
  return blocks.some((block) => {
    const doctorMatch = block.doctor_id == null || block.doctor_id === params.doctorId;
    const roomMatch = block.room_id == null || (params.roomId != null && block.room_id === params.roomId);
    if (!doctorMatch && !roomMatch) return false;
    if (block.doctor_id === params.doctorId || block.room_id === params.roomId || (block.doctor_id == null && block.room_id == null)) {
      return intervalsOverlap(params.start, params.end, block.start_time, block.end_time);
    }
    return false;
  });
}

function hasConflict(
  providers: Providers,
  params: {
    date: string;
    doctorId: number;
    roomId: number | null;
    start: string;
    end: string;
    ignoreAppointmentId?: number;
  },
): 'doctor' | 'room' | null {
  const busy = providers.appointments.list({ date: params.date }).filter(
    (row) => row.status !== 'cancelled' && row.id !== params.ignoreAppointmentId,
  );
  for (const row of busy) {
    if (!intervalsOverlap(params.start, params.end, row.start_time, row.end_time)) continue;
    if (row.doctor_id === params.doctorId) return 'doctor';
    if (params.roomId && row.room_id === params.roomId) return 'room';
  }
  return null;
}

export function listEligibleDoctors(providers: Providers, serviceId: number): Doctor[] {
  return providers.doctors.listEligibleForService(serviceId).filter((doctor) => doctor.active);
}

export function pickRoom(
  providers: Providers,
  params: {
    service: Service;
    date: string;
    start: string;
    end: string;
    ignoreAppointmentId?: number;
  },
): Room | undefined {
  return roomsForService(providers, params.service).find((room) => {
    if (isBlocked(providers, { date: params.date, doctorId: -1, roomId: room.id, start: params.start, end: params.end })) {
      const blocks = providers.availability.listBlocks({ date: params.date, roomId: room.id });
      if (blocks.some((block) => intervalsOverlap(params.start, params.end, block.start_time, block.end_time))) {
        return false;
      }
    }
    return !hasConflict(providers, {
      date: params.date,
      doctorId: -1,
      roomId: room.id,
      start: params.start,
      end: params.end,
      ignoreAppointmentId: params.ignoreAppointmentId,
    });
  });
}

export function assertSlotBookable(
  providers: Providers,
  params: {
    serviceId: number;
    doctorId: number;
    date: string;
    startTime: string;
    now?: Date;
    ignoreAppointmentId?: number;
  },
): { service: Service; doctor: Doctor; room: Room; endTime: string; durationMinutes: number } {
  const service = providers.services.getById(params.serviceId);
  if (!service?.active) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }
  const doctor = providers.doctors.getById(params.doctorId);
  if (!doctor?.active) {
    throw new AppError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
  }
  const eligible = listEligibleDoctors(providers, service.id);
  if (!eligible.some((item) => item.id === doctor.id)) {
    throw new AppError('Doctor cannot perform this service', 400, 'DOCTOR_NOT_ELIGIBLE');
  }

  const durationMinutes = service.duration_minutes;
  const endTime = minutesToTime(timeToMinutes(params.startTime) + durationMinutes);
  const weekday = weekdayOf(params.date);
  const schedule = providers.doctors
    .listSchedules(doctor.id)
    .filter((row) => row.weekday === weekday)
    .some(
      (row) => timeToMinutes(params.startTime) >= timeToMinutes(row.start_time) && timeToMinutes(endTime) <= timeToMinutes(row.end_time),
    );
  if (!schedule) {
    throw new SlotUnavailableError('Doctor is not working at this time');
  }

  const today = todayDateString(params.now);
  if (params.date < today) {
    throw new SlotUnavailableError('Cannot book in the past');
  }
  if (params.date === today && timeToMinutes(params.startTime) < timeToMinutes(currentTimeString(params.now))) {
    throw new SlotUnavailableError('Cannot book in the past');
  }

  if (
    isBlocked(providers, {
      date: params.date,
      doctorId: doctor.id,
      roomId: null,
      start: params.startTime,
      end: endTime,
    })
  ) {
    throw new SlotUnavailableError('Time is blocked');
  }

  const conflict = hasConflict(providers, {
    date: params.date,
    doctorId: doctor.id,
    roomId: null,
    start: params.startTime,
    end: endTime,
    ignoreAppointmentId: params.ignoreAppointmentId,
  });
  if (conflict === 'doctor') {
    throw new SlotUnavailableError('Doctor is already booked');
  }

  const room = pickRoom(providers, {
    service,
    date: params.date,
    start: params.startTime,
    end: endTime,
    ignoreAppointmentId: params.ignoreAppointmentId,
  });
  if (!room) {
    throw new SlotUnavailableError('No free room for this time');
  }

  if (
    hasConflict(providers, {
      date: params.date,
      doctorId: doctor.id,
      roomId: room.id,
      start: params.startTime,
      end: endTime,
      ignoreAppointmentId: params.ignoreAppointmentId,
    }) === 'room'
  ) {
    throw new SlotUnavailableError('Room is already booked');
  }

  return { service, doctor, room, endTime, durationMinutes };
}

export function listAvailability(
  providers: Providers,
  params: {
    serviceId: number;
    date: string;
    doctorId?: number | null;
    now?: Date;
  },
): TimeSlot[] {
  const service = providers.services.getById(params.serviceId);
  if (!service?.active) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }
  const doctors = params.doctorId
    ? listEligibleDoctors(providers, service.id).filter((doctor) => doctor.id === params.doctorId)
    : listEligibleDoctors(providers, service.id);
  if (params.doctorId && !doctors.length) {
    throw new AppError('Doctor cannot perform this service', 400, 'DOCTOR_NOT_ELIGIBLE');
  }

  const slots: TimeSlot[] = [];
  for (const doctor of doctors) {
    const windows = providers.doctors.listSchedules(doctor.id).filter((row) => row.weekday === weekdayOf(params.date));
    for (const window of windows) {
      for (let start = timeToMinutes(window.start_time); start + service.duration_minutes <= timeToMinutes(window.end_time); start += SLOT_STEP) {
        const startTime = minutesToTime(start);
        try {
          const booked = assertSlotBookable(providers, {
            serviceId: service.id,
            doctorId: doctor.id,
            date: params.date,
            startTime,
            now: params.now,
          });
          slots.push({
            date: params.date,
            start_time: startTime,
            end_time: booked.endTime,
            doctor_id: doctor.id,
            doctor_name: doctor.name,
            room_id: booked.room.id,
            room_name: booked.room.name,
          });
        } catch {
          // skip unavailable
        }
      }
    }
  }
  return slots.sort((a, b) => a.start_time.localeCompare(b.start_time) || a.doctor_name.localeCompare(b.doctor_name));
}

export function pickAnyDoctorSlot(
  providers: Providers,
  params: {
    serviceId: number;
    date: string;
    startTime: string;
    now?: Date;
    ignoreAppointmentId?: number;
  },
) {
  const doctors = listEligibleDoctors(providers, params.serviceId);
  for (const doctor of doctors) {
    try {
      return assertSlotBookable(providers, {
        ...params,
        doctorId: doctor.id,
      });
    } catch {
      // try next doctor
    }
  }
  throw new SlotUnavailableError();
}
