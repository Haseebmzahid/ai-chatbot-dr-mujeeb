import { TIMEZONE } from "../config/clinic.js";
import { models } from "../models/index.js";
import { getLocation, getScheduleForLocation } from "./clinicConfigService.js";
import { addDaysIso, currentTimeHHMM, dayName, fromMinutes, isPastDate, toMinutes, todayIso } from "../utils/time.js";

function isWithinBlockedRange(time, block) {
  if (!block.active) return false;
  if (block.fullDay) return true;
  if (!block.startTime || !block.endTime) return false;
  const slot = toMinutes(time);
  return slot >= toMinutes(block.startTime) && slot < toMinutes(block.endTime);
}

function isDuringBreak(time, schedule) {
  if (!schedule.breakStart || !schedule.breakEnd) return false;
  const slot = toMinutes(time);
  return slot >= toMinutes(schedule.breakStart) && slot < toMinutes(schedule.breakEnd);
}

export function generateScheduleSlots(schedule, date = todayIso()) {
  if (!schedule?.active) return [];
  if (!schedule.workingDays.includes(dayName(date))) return [];

  const opening = toMinutes(schedule.openingTime);
  const closing = toMinutes(schedule.closingTime);
  const duration = Number(schedule.slotDurationMinutes || 15);
  const limit = Number(schedule.dailyLimit || 200);
  const slots = [];

  for (let cursor = opening; cursor + duration <= closing && slots.length < limit; cursor += duration) {
    const time = fromMinutes(cursor);
    if (!isDuringBreak(time, schedule)) slots.push(time);
  }

  return slots;
}

export async function getAvailability({ locationId, date, includeUnavailable = true, excludeAppointmentId = "" }) {
  const location = await getLocation(locationId);
  if (!location) {
    const error = new Error("Clinic location was not found.");
    error.status = 404;
    throw error;
  }

  const schedule = await getScheduleForLocation(locationId);
  const baseSlots = generateScheduleSlots(schedule, date);
  const blocks = await models.BlockedSlot.find({ locationId, date, active: true }).lean();
  const booked = await models.Appointment.find({
    appointmentId: { $ne: excludeAppointmentId },
    locationId,
    date,
    status: { $in: ["Booked", "Rescheduled"] }
  }).lean();

  const bookedByTime = new Map(booked.map((appointment) => [appointment.time, appointment]));
  const today = todayIso(schedule?.timezone || TIMEZONE);
  const now = currentTimeHHMM(schedule?.timezone || TIMEZONE);

  const slots = baseSlots.map((time) => {
    const blocked = blocks.find((block) => isWithinBlockedRange(time, block));
    const bookedAppointment = bookedByTime.get(time);
    const past = date < today || (date === today && toMinutes(time) <= toMinutes(now));
    const available = !blocked && !bookedAppointment && !past;
    let reason = "";
    if (past) reason = "Past time";
    if (blocked) reason = blocked.reason || "Blocked";
    if (bookedAppointment) reason = "Already booked";

    return {
      time,
      available,
      status: available ? "Available" : bookedAppointment ? "Booked" : blocked ? "Blocked" : "Unavailable",
      reason
    };
  });

  return {
    location,
    schedule,
    date,
    closed: baseSlots.length === 0 || blocks.some((block) => block.fullDay),
    slots: includeUnavailable ? slots : slots.filter((slot) => slot.available),
    availableSlots: slots.filter((slot) => slot.available)
  };
}

export async function validateSlotAvailability({ locationId, date, time, phone = "", excludeAppointmentId = "" }) {
  if (isPastDate(date)) {
    const error = new Error("Past date booking is not allowed.");
    error.status = 422;
    throw error;
  }

  const availability = await getAvailability({ locationId, date, excludeAppointmentId });
  if (!availability.schedule?.workingDays.includes(dayName(date))) {
    const error = new Error("Selected clinic is not available on this date.");
    error.status = 422;
    throw error;
  }

  const slot = availability.slots.find((item) => item.time === time);
  if (!slot) {
    const error = new Error("Selected time is outside clinic timing.");
    error.status = 422;
    throw error;
  }

  if (!slot.available) {
    const error = new Error(slot.reason || "Selected slot is not available.");
    error.status = 409;
    throw error;
  }

  if (phone) {
    const duplicate = await models.Appointment.findOne({
      appointmentId: { $ne: excludeAppointmentId },
      normalizedPhone: phone,
      date,
      status: { $in: ["Booked", "Rescheduled"] }
    }).lean();

    if (duplicate) {
      const error = new Error("This phone number already has an active appointment on this date.");
      error.status = 409;
      throw error;
    }
  }

  return slot;
}

export async function getUpcomingAvailableDates(locationId, count = 6, startDate = todayIso()) {
  const dates = [];
  let cursor = startDate;
  let guard = 0;

  while (dates.length < count && guard < 90) {
    const availability = await getAvailability({ locationId, date: cursor, includeUnavailable: false });
    if (availability.availableSlots.length > 0) {
      dates.push({
        date: cursor,
        day: dayName(cursor),
        firstTime: availability.availableSlots[0].time
      });
    }
    cursor = addDaysIso(cursor, 1);
    guard += 1;
  }

  return dates;
}

export async function createBlockedSlot(payload, actor) {
  const block = await models.BlockedSlot.create({
    blockedSlotId: `BLK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    ...payload,
    createdBy: actor?.userId || actor?.id || "System",
    active: true
  });
  return block.toObject();
}

export async function listBlockedSlots() {
  return models.BlockedSlot.find({ active: true }).sort({ date: -1, startTime: 1 }).lean();
}

export async function removeBlockedSlot(blockedSlotId) {
  return models.BlockedSlot.findOneAndUpdate({ blockedSlotId }, { active: false }, { returnDocument: "after" }).lean();
}
