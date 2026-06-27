import mongoose from "mongoose";
import { APPOINTMENT_STATUSES, STAFF_ROLES } from "../config/clinic.js";

const schemaOptions = {
  timestamps: true,
  versionKey: false
};

const publicId = {
  type: String,
  required: true,
  unique: true,
  index: true,
  trim: true
};

export const UserSchema = new mongoose.Schema(
  {
    userId: publicId,
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: STAFF_ROLES, required: true, index: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLoginAt: Date
  },
  schemaOptions
);

export const ClinicLocationSchema = new mongoose.Schema(
  {
    locationId: publicId,
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    nameEn: { type: String, required: true, trim: true },
    nameUr: { type: String, required: true, trim: true },
    addressEn: { type: String, required: true, trim: true },
    addressUr: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true },
    googleMapLink: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true }
  },
  schemaOptions
);

export const ScheduleRuleSchema = new mongoose.Schema(
  {
    ruleId: publicId,
    locationId: { type: String, required: true, index: true },
    workingDays: [{ type: String, required: true }],
    openingTime: { type: String, required: true },
    closingTime: { type: String, required: true },
    breakStart: { type: String, default: "" },
    breakEnd: { type: String, default: "" },
    slotDurationMinutes: { type: Number, default: 15 },
    dailyLimit: { type: Number, default: 32 },
    timezone: { type: String, default: "Asia/Karachi" },
    active: { type: Boolean, default: true, index: true }
  },
  schemaOptions
);

ScheduleRuleSchema.index({ locationId: 1, active: 1 });

export const BlockedSlotSchema = new mongoose.Schema(
  {
    blockedSlotId: publicId,
    locationId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    fullDay: { type: Boolean, default: false, index: true },
    reason: { type: String, required: true, trim: true },
    createdBy: { type: String, default: "System" },
    active: { type: Boolean, default: true, index: true }
  },
  schemaOptions
);

BlockedSlotSchema.index({ locationId: 1, date: 1, active: 1 });

export const PatientSchema = new mongoose.Schema(
  {
    patientId: publicId,
    fullName: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    normalizedPhone: { type: String, required: true, trim: true, index: true },
    age: { type: Number, min: 1, max: 120 },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    city: { type: String, trim: true },
    reasonForVisit: { type: String, trim: true, maxlength: 500 },
    consentAccepted: { type: Boolean, default: false },
    consentAcceptedAt: Date
  },
  schemaOptions
);

PatientSchema.index({ normalizedPhone: 1 }, { unique: true });

export const AppointmentSchema = new mongoose.Schema(
  {
    appointmentId: publicId,
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    normalizedPhone: { type: String, required: true, trim: true, index: true },
    age: { type: Number, min: 1, max: 120 },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    city: { type: String, trim: true },
    locationId: { type: String, required: true, index: true },
    locationNameEn: { type: String, required: true },
    locationNameUr: { type: String, required: true },
    doctorName: { type: String, default: "Dr. Mujeeb Ur Rehman" },
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    tokenNumber: { type: Number, required: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "Booked", index: true },
    reasonForVisit: { type: String, trim: true, maxlength: 500 },
    source: {
      type: String,
      enum: ["WhatsApp", "WhatsApp Cloud API", "Reception", "Patient Web Chat"],
      default: "WhatsApp",
      index: true
    },
    cancelledReason: { type: String, trim: true },
    cancelledAt: Date,
    cancelledBy: String,
    rescheduleHistory: [
      {
        fromLocationId: String,
        fromDate: String,
        fromTime: String,
        fromTokenNumber: Number,
        toLocationId: String,
        toDate: String,
        toTime: String,
        toTokenNumber: Number,
        changedAt: Date,
        changedBy: String
      }
    ]
  },
  schemaOptions
);

AppointmentSchema.index(
  { locationId: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["Booked", "Rescheduled"] } }
  }
);
AppointmentSchema.index(
  { normalizedPhone: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["Booked", "Rescheduled"] } }
  }
);
AppointmentSchema.index(
  { locationId: 1, date: 1, tokenNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["Booked", "Rescheduled"] } }
  }
);
AppointmentSchema.index({ patientName: "text", normalizedPhone: "text", appointmentId: "text" });

export const MessageLogSchema = new mongoose.Schema(
  {
    messageLogId: publicId,
    phone: { type: String, trim: true, index: true },
    normalizedPhone: { type: String, trim: true, index: true },
    appointmentId: { type: String, trim: true, index: true },
    messageType: { type: String, trim: true, index: true },
    messageBody: { type: String, trim: true },
    direction: { type: String, enum: ["Incoming", "Outgoing", "Status"], index: true },
    status: { type: String, trim: true, index: true },
    providerMessageId: { type: String, trim: true, index: true },
    error: { type: String, trim: true },
    retryCount: { type: Number, default: 0 },
    rawPayload: mongoose.Schema.Types.Mixed
  },
  schemaOptions
);

MessageLogSchema.index({ createdAt: -1 });
MessageLogSchema.index(
  { providerMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerMessageId: { $type: "string", $gt: "" } }
  }
);

export const AuditLogSchema = new mongoose.Schema(
  {
    auditLogId: publicId,
    actorUserId: { type: String, default: "System", index: true },
    actorRole: { type: String, default: "System" },
    action: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    targetType: { type: String, trim: true },
    targetId: { type: String, trim: true, index: true },
    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

AuditLogSchema.index({ createdAt: -1 });

export const WhatsAppConsentSchema = new mongoose.Schema(
  {
    consentId: publicId,
    phone: { type: String, required: true, trim: true },
    normalizedPhone: { type: String, required: true, trim: true, index: true },
    optedIn: { type: Boolean, default: true },
    source: { type: String, trim: true },
    language: { type: String, enum: ["en", "ur"], default: "en" },
    nonEssentialOptOut: { type: Boolean, default: false, index: true },
    failureCount: { type: Number, default: 0 },
    lastOptInAt: Date,
    lastOptOutAt: Date,
    lastFailureAt: Date,
    lastMessageAt: Date
  },
  schemaOptions
);

WhatsAppConsentSchema.index({ normalizedPhone: 1 }, { unique: true });

export const WebhookEventSchema = new mongoose.Schema(
  {
    eventId: publicId,
    provider: { type: String, required: true, index: true },
    providerEventId: { type: String, required: true, index: true },
    eventType: { type: String, trim: true },
    processedAt: { type: Date, default: Date.now }
  },
  { timestamps: false, versionKey: false }
);

WebhookEventSchema.index({ provider: 1, providerEventId: 1 }, { unique: true });

export const ChatSessionSchema = new mongoose.Schema(
  {
    chatSessionId: publicId,
    normalizedPhone: { type: String, required: true, unique: true, index: true },
    language: { type: String, enum: ["en", "ur"], default: "en" },
    step: { type: String, default: "language" },
    draft: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastMessageAt: Date
  },
  schemaOptions
);

export const CounterSchema = new mongoose.Schema(
  {
    counterId: publicId,
    scope: { type: String, required: true, unique: true, index: true },
    value: { type: Number, default: 0 }
  },
  schemaOptions
);

export const models = {
  User: mongoose.models.User || mongoose.model("User", UserSchema),
  ClinicLocation: mongoose.models.ClinicLocation || mongoose.model("ClinicLocation", ClinicLocationSchema),
  ScheduleRule: mongoose.models.ScheduleRule || mongoose.model("ScheduleRule", ScheduleRuleSchema),
  BlockedSlot: mongoose.models.BlockedSlot || mongoose.model("BlockedSlot", BlockedSlotSchema),
  Patient: mongoose.models.Patient || mongoose.model("Patient", PatientSchema),
  Appointment: mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema),
  MessageLog: mongoose.models.MessageLog || mongoose.model("MessageLog", MessageLogSchema),
  AuditLog: mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema),
  WhatsAppConsent: mongoose.models.WhatsAppConsent || mongoose.model("WhatsAppConsent", WhatsAppConsentSchema),
  WebhookEvent: mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", WebhookEventSchema),
  ChatSession: mongoose.models.ChatSession || mongoose.model("ChatSession", ChatSessionSchema),
  Counter: mongoose.models.Counter || mongoose.model("Counter", CounterSchema)
};
