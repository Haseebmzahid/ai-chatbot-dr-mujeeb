import mongoose from "mongoose";
import { ACTIVE_APPOINTMENT_STATUSES, DOCTOR } from "../config/clinic.js";
import { models } from "../models/index.js";
import { getLocation } from "./clinicConfigService.js";
import { validateSlotAvailability } from "./slotService.js";
import { addAuditLog } from "./auditService.js";
import { appointmentCreateSchema, appointmentLookupSchema, appointmentRescheduleSchema, appointmentCancelSchema } from "../utils/validation.js";
import { escapeRegex, makeAppointmentId, makePublicId, maskPhone, normalizePhone } from "../utils/time.js";

function duplicateKeyMessage(error) {
  if (error?.code !== 11000) return null;
  const keys = Object.keys(error.keyPattern || {});
  if (keys.includes("normalizedPhone")) return "This phone number already has an active appointment on this date.";
  if (keys.includes("time")) return "This slot is already booked.";
  return "A conflicting appointment already exists.";
}

async function nextTokenNumber(locationId, date, session) {
  const scope = `token:${locationId}:${date}`;
  const counter = await models.Counter.findOneAndUpdate(
    { scope },
    { $inc: { value: 1 }, $setOnInsert: { counterId: makePublicId("CTR") } },
    { returnDocument: "after", upsert: true, session }
  ).lean();
  return counter.value;
}

function publicAppointment(appointment) {
  if (!appointment) return null;
  const item = typeof appointment.toObject === "function" ? appointment.toObject() : appointment;
  return {
    appointmentId: item.appointmentId,
    patientName: item.patientName,
    maskedPhone: maskPhone(item.normalizedPhone || item.phone),
    age: item.age,
    gender: item.gender,
    city: item.city,
    locationId: item.locationId,
    locationNameEn: item.locationNameEn,
    locationNameUr: item.locationNameUr,
    doctorName: item.doctorName,
    date: item.date,
    time: item.time,
    tokenNumber: item.tokenNumber,
    status: item.status,
    source: item.source,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

export function toPublicAppointment(appointment) {
  return publicAppointment(appointment);
}

export async function listAppointments(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.date) query.date = filters.date;
  if (filters.locationId) query.locationId = filters.locationId;
  if (filters.q) {
    const q = escapeRegex(filters.q);
    query.$or = [
      { appointmentId: { $regex: q, $options: "i" } },
      { patientName: { $regex: q, $options: "i" } },
      { normalizedPhone: { $regex: q, $options: "i" } },
      { date: { $regex: q, $options: "i" } }
    ];
  }
  return models.Appointment.find(query).sort({ date: -1, time: -1 }).limit(Math.min(Number(filters.limit || 500), 1000)).lean();
}

export async function getAppointmentById(appointmentId) {
  return models.Appointment.findOne({ appointmentId }).lean();
}

export async function lookupAppointmentSafe(payload) {
  const parsed = appointmentLookupSchema.parse(payload);
  const appointment = await models.Appointment.findOne({
    appointmentId: { $regex: `^${escapeRegex(parsed.appointmentId)}$`, $options: "i" },
    normalizedPhone: parsed.phone
  }).lean();
  return publicAppointment(appointment);
}

export async function createAppointment(input, actor = null, req = null) {
  const parsed = appointmentCreateSchema.parse(input);
  const normalizedPhone = normalizePhone(parsed.phone);
  const location = await getLocation(parsed.locationId);
  if (!location) {
    const error = new Error("Clinic location was not found.");
    error.status = 404;
    throw error;
  }

  await validateSlotAvailability({
    locationId: parsed.locationId,
    date: parsed.date,
    time: parsed.time,
    phone: normalizedPhone
  });

  const session = await mongoose.startSession();
  try {
    let appointment;
    await session.withTransaction(async () => {
      const existingPatient = await models.Patient.findOne({ normalizedPhone }).session(session);
      let patient = existingPatient;
      if (patient) {
        patient = await models.Patient.findOneAndUpdate(
          { normalizedPhone },
          {
            fullName: parsed.fullName,
            phone: parsed.phone,
            age: parsed.age,
            gender: parsed.gender,
            city: parsed.city,
            reasonForVisit: parsed.reasonForVisit,
            consentAccepted: true,
            consentAcceptedAt: patient.consentAcceptedAt || new Date()
          },
          { returnDocument: "after", session }
        );
      } else {
        patient = await models.Patient.create(
          [
            {
              patientId: makePublicId("PAT"),
              fullName: parsed.fullName,
              phone: parsed.phone,
              normalizedPhone,
              age: parsed.age,
              gender: parsed.gender,
              city: parsed.city,
              reasonForVisit: parsed.reasonForVisit,
              consentAccepted: true,
              consentAcceptedAt: new Date()
            }
          ],
          { session }
        ).then((items) => items[0]);
      }

      const consentedAt = new Date();
      await models.WhatsAppConsent.findOneAndUpdate(
        { normalizedPhone },
        {
          $set: {
            phone: parsed.phone,
            normalizedPhone,
            optedIn: true,
            source: parsed.source || "WhatsApp",
            language: parsed.language || "en",
            lastOptInAt: consentedAt,
            lastMessageAt: consentedAt
          },
          $setOnInsert: {
            consentId: makePublicId("CNS"),
            nonEssentialOptOut: false,
            failureCount: 0
          }
        },
        { returnDocument: "after", upsert: true, session }
      );

      const tokenNumber = await nextTokenNumber(parsed.locationId, parsed.date, session);
      appointment = await models.Appointment.create(
        [
          {
            appointmentId: makeAppointmentId(),
            patientId: patient.patientId,
            patientName: parsed.fullName,
            phone: parsed.phone,
            normalizedPhone,
            age: parsed.age,
            gender: parsed.gender,
            city: parsed.city,
            locationId: parsed.locationId,
            locationNameEn: location.nameEn,
            locationNameUr: location.nameUr,
            doctorName: DOCTOR.nameEn,
            date: parsed.date,
            time: parsed.time,
            tokenNumber,
            status: "Booked",
            reasonForVisit: parsed.reasonForVisit,
            source: parsed.source || "WhatsApp"
          }
        ],
        { session }
      ).then((items) => items[0]);
    });

    await addAuditLog({
      actor,
      action: "Appointment created",
      module: "Appointments",
      targetType: "Appointment",
      targetId: appointment.appointmentId,
      metadata: { source: appointment.source, date: appointment.date, locationId: appointment.locationId },
      req
    });

    return appointment.toObject();
  } catch (error) {
    const message = duplicateKeyMessage(error);
    if (message) {
      const conflict = new Error(message);
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function rescheduleAppointment(input, actor = null, req = null) {
  const parsed = appointmentRescheduleSchema.parse(input);
  const normalizedPhone = normalizePhone(parsed.phone);
  const appointment = await models.Appointment.findOne({ appointmentId: parsed.appointmentId, normalizedPhone });
  if (!appointment) {
    const error = new Error("Appointment was not found for the provided ID and phone number.");
    error.status = 404;
    throw error;
  }
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
    const error = new Error("This appointment cannot be rescheduled because it is not active.");
    error.status = 409;
    throw error;
  }

  const location = await getLocation(parsed.locationId);
  if (!location) {
    const error = new Error("Clinic location was not found.");
    error.status = 404;
    throw error;
  }

  await validateSlotAvailability({
    locationId: parsed.locationId,
    date: parsed.date,
    time: parsed.time,
    phone: normalizedPhone,
    excludeAppointmentId: appointment.appointmentId
  });

  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      const tokenNumber = await nextTokenNumber(parsed.locationId, parsed.date, session);
      updated = await models.Appointment.findOneAndUpdate(
        {
          appointmentId: parsed.appointmentId,
          normalizedPhone,
          status: { $in: ACTIVE_APPOINTMENT_STATUSES }
        },
        {
          locationId: parsed.locationId,
          locationNameEn: location.nameEn,
          locationNameUr: location.nameUr,
          date: parsed.date,
          time: parsed.time,
          tokenNumber,
          status: "Rescheduled",
          $push: {
            rescheduleHistory: {
              fromLocationId: appointment.locationId,
              fromDate: appointment.date,
              fromTime: appointment.time,
              fromTokenNumber: appointment.tokenNumber,
              toLocationId: parsed.locationId,
              toDate: parsed.date,
              toTime: parsed.time,
              toTokenNumber: tokenNumber,
              changedAt: new Date(),
              changedBy: actor?.userId || actor?.id || "Patient"
            }
          }
        },
        { returnDocument: "after", session }
      );
    });

    await addAuditLog({
      actor,
      action: "Appointment rescheduled",
      module: "Appointments",
      targetType: "Appointment",
      targetId: updated.appointmentId,
      metadata: { date: updated.date, time: updated.time, locationId: updated.locationId },
      req
    });

    return updated.toObject();
  } catch (error) {
    const message = duplicateKeyMessage(error);
    if (message) {
      const conflict = new Error(message);
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function cancelAppointment(input, actor = null, req = null) {
  const parsed = appointmentCancelSchema.parse(input);
  const normalizedPhone = normalizePhone(parsed.phone);
  const appointment = await models.Appointment.findOneAndUpdate(
    {
      appointmentId: parsed.appointmentId,
      normalizedPhone,
      status: { $in: ACTIVE_APPOINTMENT_STATUSES }
    },
    {
      status: "Cancelled",
      cancelledReason: parsed.reason,
      cancelledAt: new Date(),
      cancelledBy: actor?.userId || actor?.id || "Patient"
    },
    { returnDocument: "after" }
  ).lean();

  if (!appointment) {
    const error = new Error("Active appointment was not found for the provided ID and phone number.");
    error.status = 404;
    throw error;
  }

  await addAuditLog({
    actor,
    action: "Appointment cancelled",
    module: "Appointments",
    targetType: "Appointment",
    targetId: appointment.appointmentId,
    metadata: { reason: parsed.reason },
    req
  });

  return appointment;
}

export async function updateAppointmentStatus(appointmentId, status, actor = null, req = null) {
  const updates = { status };
  if (status === "Cancelled") {
    updates.cancelledAt = new Date();
    updates.cancelledBy = actor?.userId || actor?.id || "Staff";
  }

  const appointment = await models.Appointment.findOneAndUpdate({ appointmentId }, updates, { returnDocument: "after" }).lean();
  if (!appointment) {
    const error = new Error("Appointment was not found.");
    error.status = 404;
    throw error;
  }

  await addAuditLog({
    actor,
    action: `Appointment marked ${status}`,
    module: "Appointments",
    targetType: "Appointment",
    targetId: appointment.appointmentId,
    req
  });

  return appointment;
}
