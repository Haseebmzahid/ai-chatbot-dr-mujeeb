import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { classifyIntent } from "../server/services/chatbotService.js";
import { generateScheduleSlots } from "../server/services/slotService.js";
import { validateEnvironment, whatsappConfigured } from "../server/config/validation.js";
import {
  appointmentTemplateComponents,
  isInsideServiceWindow,
  isOptInMessage,
  isOptOutMessage,
  isRetryableWhatsAppStatus,
  templateNameForMessageType,
  verifyMetaSignature
} from "../server/services/whatsappService.js";
import { maskPhone, normalizePhone } from "../server/utils/time.js";

test("intent mapping understands English, Urdu, and Roman Urdu", () => {
  assert.equal(classifyIntent("I need appointment"), "book");
  assert.equal(classifyIntent("appointment cancel karni hai"), "cancel");
  assert.equal(classifyIntent("Peshawar timing"), "locations");
  assert.equal(classifyIntent("RIRS ka cost"), "rirs");
  assert.equal(classifyIntent("اپائنٹمنٹ منسوخ کرنی ہے"), "cancel");
});

test("Lower Dir schedule generates Monday slots and blocks Saturday", () => {
  const schedule = {
    active: true,
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    openingTime: "09:00",
    closingTime: "17:00",
    slotDurationMinutes: 15,
    dailyLimit: 32
  };
  assert.equal(generateScheduleSlots(schedule, "2026-06-29").length, 32);
  assert.equal(generateScheduleSlots(schedule, "2026-06-27").length, 0);
});

test("Peshawar schedule generates Saturday slots and blocks weekdays", () => {
  const schedule = {
    active: true,
    workingDays: ["Saturday"],
    openingTime: "12:00",
    closingTime: "19:00",
    slotDurationMinutes: 15,
    dailyLimit: 28
  };
  assert.equal(generateScheduleSlots(schedule, "2026-06-27").length, 28);
  assert.equal(generateScheduleSlots(schedule, "2026-06-29").length, 0);
});

test("phone numbers normalize and mask safely", () => {
  assert.equal(normalizePhone("0300-8585508"), "+923008585508");
  assert.equal(maskPhone("0300-8585508"), "+923****508");
});

test("environment validation requires MongoDB and strong secrets", () => {
  const result = validateEnvironment({
    NODE_ENV: "production",
    APP_BASE_URL: "https://clinic.example",
    CLIENT_BASE_URL: "https://clinic.example",
    CORS_ALLOWED_ORIGINS: "https://clinic.example",
    MONGODB_URI: "",
    JWT_ACCESS_SECRET: "short",
    JWT_REFRESH_SECRET: "",
    COOKIE_SECRET: "",
    ADMIN_BOOTSTRAP_TOKEN: ""
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /MONGODB_URI/);
  assert.equal(whatsappConfigured({}), false);
});

test("WhatsApp opt-out and opt-in commands are explicit", () => {
  assert.equal(isOptOutMessage("STOP"), true);
  assert.equal(isOptOutMessage("unsubscribe"), true);
  assert.equal(isOptOutMessage("بند"), true);
  assert.equal(isOptOutMessage("appointment cancel karni hai"), false);
  assert.equal(isOptInMessage("START"), true);
  assert.equal(isOptInMessage("yes"), true);
});

test("WhatsApp service window and retry helpers are policy-safe", () => {
  const now = new Date("2026-06-27T12:00:00.000Z");
  assert.equal(isInsideServiceWindow("2026-06-26T13:00:00.000Z", now), true);
  assert.equal(isInsideServiceWindow("2026-06-26T11:59:00.000Z", now), false);
  assert.equal(isRetryableWhatsAppStatus(429), true);
  assert.equal(isRetryableWhatsAppStatus(400), false);
});

test("WhatsApp template names and components are derived safely", () => {
  const previous = process.env.WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMATION;
  process.env.WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMATION = "appointment_confirmation_v1";
  assert.equal(templateNameForMessageType("appointment_confirmation"), "appointment_confirmation_v1");
  if (previous === undefined) delete process.env.WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMATION;
  else process.env.WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMATION = previous;

  const components = appointmentTemplateComponents({
    doctorName: "Dr. Mujeeb Ur Rehman",
    date: "2026-06-29",
    time: "09:00",
    locationNameEn: "Al Habib General Hospital",
    tokenNumber: 1,
    appointmentId: "APT-123"
  });
  assert.equal(components[0].type, "body");
  assert.equal(components[0].parameters.length, 7);
});

test("Meta webhook signature verification rejects invalid signatures", () => {
  const previous = process.env.META_APP_SECRET;
  process.env.META_APP_SECRET = "a".repeat(32);
  const rawBody = Buffer.from(JSON.stringify({ object: "whatsapp_business_account" }));
  const signature = `sha256=${crypto.createHmac("sha256", process.env.META_APP_SECRET).update(rawBody).digest("hex")}`;

  assert.equal(verifyMetaSignature({ headers: { "x-hub-signature-256": signature }, rawBody }), true);
  assert.equal(verifyMetaSignature({ headers: { "x-hub-signature-256": "sha256=bad" }, rawBody }), false);

  if (previous === undefined) delete process.env.META_APP_SECRET;
  else process.env.META_APP_SECRET = previous;
});
