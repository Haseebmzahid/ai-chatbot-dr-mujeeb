import { z } from "zod";
import { APPOINTMENT_STATUSES, STAFF_ROLES } from "../config/clinic.js";
import { compactText, normalizePhone } from "./time.js";

const text = (max = 160) =>
  z
    .string()
    .trim()
    .transform((value) => compactText(value, max));

export const languageSchema = z.enum(["en", "ur"]).catch("en");

export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine((value) => /^\+\d{10,15}$/.test(value), "Please enter a valid phone number.");

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date.");
export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Please enter a valid time.");
export const objectIdSchema = z.string().trim().min(12).max(40);

export const appointmentCreateSchema = z
  .object({
    fullName: text(100).refine((value) => value.length >= 2, "Patient name is required."),
    phone: phoneSchema,
    age: z.coerce.number().int().min(1).max(120),
    gender: z.enum(["Male", "Female", "Other"]),
    city: text(80).refine((value) => value.length >= 2, "City is required."),
    reasonForVisit: text(500).refine((value) => value.length >= 3, "Reason for visit is required."),
    locationId: z.string().trim().min(1).max(80),
    date: dateSchema,
    time: timeSchema,
    language: languageSchema.optional(),
    source: z.enum(["WhatsApp", "WhatsApp Cloud API", "Reception", "Patient Web Chat"]).optional(),
    consentAccepted: z.coerce.boolean().refine(Boolean, "Patient consent is required.")
  })
  .strict();

export const appointmentLookupSchema = z
  .object({
    appointmentId: z.string().trim().min(6).max(40),
    phone: phoneSchema
  })
  .strict();

export const appointmentRescheduleSchema = z
  .object({
    appointmentId: z.string().trim().min(6).max(40),
    phone: phoneSchema,
    locationId: z.string().trim().min(1).max(80),
    date: dateSchema,
    time: timeSchema,
    language: languageSchema.optional()
  })
  .strict();

export const appointmentCancelSchema = z
  .object({
    appointmentId: z.string().trim().min(6).max(40),
    phone: phoneSchema,
    reason: text(250).refine((value) => value.length >= 2, "Cancellation reason is required."),
    language: languageSchema.optional()
  })
  .strict();

export const adminStatusSchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUSES),
    reason: text(250).optional()
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(256)
  })
  .strict();

export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/\d/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");

export const bootstrapSchema = z
  .object({
    token: z.string().min(16),
    name: text(100).refine((value) => value.length >= 2),
    email: z.string().trim().toLowerCase().email(),
    password: passwordSchema
  })
  .strict();

export const userCreateSchema = z
  .object({
    name: text(100).refine((value) => value.length >= 2),
    email: z.string().trim().toLowerCase().email(),
    password: passwordSchema,
    role: z.enum(STAFF_ROLES),
    status: z.enum(["Active", "Inactive"]).default("Active")
  })
  .strict();

export const userUpdateSchema = z
  .object({
    name: text(100).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    password: passwordSchema.optional(),
    role: z.enum(STAFF_ROLES).optional(),
    status: z.enum(["Active", "Inactive"]).optional()
  })
  .strict();

export const locationSchema = z
  .object({
    nameEn: text(120),
    nameUr: text(120),
    addressEn: text(250),
    addressUr: text(250),
    city: text(80),
    phone: text(40).optional(),
    googleMapLink: z.string().trim().url().or(z.literal("")).optional(),
    active: z.coerce.boolean().optional()
  })
  .strict();

export const scheduleSchema = z
  .object({
    workingDays: z.array(z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])).min(1).max(7),
    openingTime: timeSchema,
    closingTime: timeSchema,
    breakStart: timeSchema.or(z.literal("")).optional(),
    breakEnd: timeSchema.or(z.literal("")).optional(),
    slotDurationMinutes: z.coerce.number().int().min(5).max(120),
    dailyLimit: z.coerce.number().int().min(1).max(200),
    active: z.coerce.boolean().optional()
  })
  .strict();

export const blockedSlotSchema = z
  .object({
    locationId: z.string().trim().min(1).max(80),
    date: dateSchema,
    startTime: timeSchema.or(z.literal("")).optional(),
    endTime: timeSchema.or(z.literal("")).optional(),
    fullDay: z.coerce.boolean().default(false),
    reason: text(250).refine((value) => value.length >= 2, "Reason is required.")
  })
  .strict();

export const chatMessageSchema = z
  .object({
    phone: phoneSchema,
    message: text(1000),
    language: languageSchema.optional()
  })
  .strict();

export function parseOrThrow(schema, input) {
  return schema.parse(input);
}
