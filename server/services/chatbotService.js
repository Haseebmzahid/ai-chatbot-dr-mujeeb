import { models } from "../models/index.js";
import { listLocations } from "./clinicConfigService.js";
import { cancelAppointment, createAppointment, getAppointmentById, lookupAppointmentSafe, rescheduleAppointment } from "./appointmentService.js";
import { getAvailability, getUpcomingAvailableDates } from "./slotService.js";
import {
  appointmentConfirmation,
  appointmentLookupMessage,
  cancellationConfirmation,
  consentMessage,
  contactReceptionMessage,
  doctorProfileMessage,
  emergencyMessage,
  languagePrompt,
  locationsMessage,
  mainMenu,
  rescheduleConfirmation,
  rirsMessage
} from "./messageTemplates.js";
import { chatMessageSchema, phoneSchema } from "../utils/validation.js";
import { compactText, displayDate, displayTime, makePublicId, normalizePhone } from "../utils/time.js";

function option(label, value) {
  return { label, value };
}

function detectUrdu(text = "") {
  return /[\u0600-\u06FF]/.test(text);
}

function yes(value = "") {
  const text = value.trim().toLowerCase();
  return ["yes", "y", "1", "haan", "han", "ha", "ji", "jee", "جی", "ہاں", "yes continue"].includes(text);
}

function no(value = "") {
  const text = value.trim().toLowerCase();
  return ["no", "n", "2", "nahin", "nahi", "نہیں"].includes(text);
}

function numberChoice(text) {
  const match = String(text || "").trim().match(/^\d+$/);
  return match ? Number(match[0]) : null;
}

export function classifyIntent(input = "") {
  const text = input.toLowerCase().trim();
  const n = numberChoice(text);
  if (n === 1) return "book";
  if (n === 2) return "check";
  if (n === 3) return "reschedule";
  if (n === 4) return "cancel";
  if (n === 5) return "locations";
  if (n === 6) return "rirs";
  if (n === 7) return "profile";
  if (n === 8) return "reception";
  if (n === 9) return "emergency";
  if (n === 10) return "language";

  if (/(book|appointment chahiye|appointment cha|need appointment|new appointment|اپائنٹمنٹ چاہیے|اپائنٹمنٹ بک)/i.test(input)) return "book";
  if (/(check|status|token|my appointment|اپنی اپائنٹمنٹ|چیک)/i.test(input)) return "check";
  if (/(reschedule|change time|time change|change appointment|تبدیل|وقت بدل|وقت تبدیل)/i.test(input)) return "reschedule";
  if (/(cancel|cancel karni|منسوخ|کینسل)/i.test(input)) return "cancel";
  if (/(where|location|timing|hours|clinic|peshawar|dir|doctor kahan|bethte|کہاں|لوکیشن|اوقات|وقت|پشاور|دیر)/i.test(input)) return "locations";
  if (/(rirs|kidney stone|stone surgery|operation cost|pathri|patri|پتھری|خرچ|لاگت|آپریشن)/i.test(input)) return "rirs";
  if (/(doctor profile|doctor details|qualification|ڈاکٹر صاحب|تعارف)/i.test(input)) return "profile";
  if (/(reception|contact|phone|call|رابطہ|ریسیپشن)/i.test(input)) return "reception";
  if (/(emergency|severe pain|fever|bleeding|urine stop|ایمرجنسی|شدید درد|بخار|خون|پیشاب بند)/i.test(input)) return "emergency";
  if (/(language|urdu|english|زبان|اردو)/i.test(input)) return "language";
  return "unknown";
}

async function getSession(normalizedPhone, hintedLanguage) {
  console.log("[Chatbot Debug DB Read] Querying ChatSession for phone:", normalizedPhone);
  let session = await models.ChatSession.findOne({ normalizedPhone });
  if (!session) {
    console.log("[Chatbot Debug DB Write] Creating new ChatSession for phone:", normalizedPhone);
    session = await models.ChatSession.create({
      chatSessionId: makePublicId("CHT"),
      normalizedPhone,
      language: hintedLanguage || "en",
      step: "language",
      draft: {},
      lastMessageAt: new Date()
    });
  } else {
    console.log("[Chatbot Debug DB Read] Found ChatSession:", {
      chatSessionId: session.chatSessionId,
      step: session.step,
      draft: session.draft,
      lastMessageAt: session.lastMessageAt
    });
  }
  return session;
}

async function saveSession(session, updates) {
  console.log("[Chatbot Debug DB Write] Saving ChatSession updates:", updates, "for phone:", session.normalizedPhone);
  Object.assign(session, updates, { lastMessageAt: new Date() });
  session.markModified("draft");
  await session.save();
  console.log("[Chatbot Debug DB Write] ChatSession saved successfully. Current step is now:", session.step);
  return session;
}

async function resetToMenu(session, language = session.language) {
  await saveSession(session, { language, step: "menu", draft: {} });
  return { text: mainMenu(language), options: menuOptions(language), language };
}

function menuOptions(language = "en") {
  return language === "ur"
    ? [
        option("اپائنٹمنٹ بک کریں", "1"),
        option("اپائنٹمنٹ چیک کریں", "2"),
        option("اپائنٹمنٹ تبدیل کریں", "3"),
        option("اپائنٹمنٹ منسوخ کریں", "4"),
        option("لوکیشنز اور اوقات", "5"),
        option("RIRS معلومات", "6")
      ]
    : [
        option("Book Appointment", "1"),
        option("Check My Appointment", "2"),
        option("Reschedule Appointment", "3"),
        option("Cancel Appointment", "4"),
        option("Locations & Timings", "5"),
        option("RIRS Info", "6")
      ];
}

async function locationOptions(language = "en") {
  const locations = await listLocations({ activeOnly: true });
  const lines = locations.map((location, index) => `${index + 1}. ${language === "ur" ? location.nameUr : location.nameEn}, ${location.city}`);
  return {
    locations,
    text: language === "ur" ? `براہِ کرم کلینک منتخب کریں:\n\n${lines.join("\n")}` : `Please select clinic location:\n\n${lines.join("\n")}`,
    options: locations.map((location, index) => option(`${index + 1}. ${language === "ur" ? location.nameUr : location.nameEn}`, String(index + 1)))
  };
}

function pickByNumberOrValue(value, items, idKey) {
  const n = numberChoice(value);
  if (n && items[n - 1]) return items[n - 1];
  const lower = value.toLowerCase().trim();
  return items.find((item) => String(item[idKey] || item.date || item.time).toLowerCase() === lower);
}

async function askDates(session, locationId, nextStep) {
  const language = session.language;
  const dates = await getUpcomingAvailableDates(locationId, 6);
  if (!dates.length) {
    await saveSession(session, { step: "menu", draft: {} });
    return {
      text: language === "ur" ? "اس کلینک کے لیے فی الحال کوئی دستیاب تاریخ نہیں ملی۔ براہِ کرم ریسیپشن سے رابطہ کریں۔" : "No available date was found for this clinic. Please contact reception.",
      options: menuOptions(language),
      language
    };
  }

  const lines = dates.map((item, index) => `${index + 1}. ${displayDate(item.date, language)} (${item.day})`);
  session.draft = { ...session.draft, dateOptions: dates };
  await saveSession(session, { step: nextStep, draft: session.draft });

  return {
    text: language === "ur" ? `دستیاب تاریخ منتخب کریں:\n\n${lines.join("\n")}` : `Please select an available date:\n\n${lines.join("\n")}`,
    options: dates.map((item, index) => option(`${index + 1}. ${displayDate(item.date, language)}`, String(index + 1))),
    language
  };
}

async function askSlots(session, locationId, date, nextStep) {
  const language = session.language;
  const availability = await getAvailability({ locationId, date, includeUnavailable: false });
  const slots = availability.availableSlots;
  if (!slots.length) {
    return askDates(session, locationId, nextStep === "book_time" ? "book_date" : "reschedule_date");
  }

  const lines = slots.map((slot, index) => `${index + 1}. ${displayTime(slot.time, language)}`);
  session.draft = { ...session.draft, slotOptions: slots };
  await saveSession(session, { step: nextStep, draft: session.draft });

  return {
    text: language === "ur" ? `دستیاب وقت منتخب کریں:\n\n${lines.join("\n")}` : `Please select an available time slot:\n\n${lines.join("\n")}`,
    options: slots.map((slot, index) => option(`${index + 1}. ${displayTime(slot.time, language)}`, String(index + 1))),
    language
  };
}

async function staticReply(session, text) {
  const language = session.language;
  await saveSession(session, { step: "menu", draft: {} });
  return { text: `${text}\n\n${mainMenu(language)}`, options: menuOptions(language), language };
}

function ask(language, en, ur) {
  return language === "ur" ? ur : en;
}

async function handleMenu(session, value) {
  const language = session.language;
  const intent = classifyIntent(value);

  if (intent === "book") {
    await saveSession(session, { step: "book_consent", draft: {} });
    return { text: consentMessage(language), language };
  }
  if (intent === "check") {
    await saveSession(session, { step: "check_id", draft: {} });
    return { text: ask(language, "Please enter your appointment ID.", "براہِ کرم اپائنٹمنٹ آئی ڈی لکھیں۔"), language };
  }
  if (intent === "reschedule") {
    await saveSession(session, { step: "reschedule_id", draft: {} });
    return { text: ask(language, "Please enter your appointment ID.", "براہِ کرم اپائنٹمنٹ آئی ڈی لکھیں۔"), language };
  }
  if (intent === "cancel") {
    await saveSession(session, { step: "cancel_id", draft: {} });
    return { text: ask(language, "Please enter your appointment ID.", "براہِ کرم اپائنٹمنٹ آئی ڈی لکھیں۔"), language };
  }
  if (intent === "locations") return staticReply(session, locationsMessage(language));
  if (intent === "rirs") return staticReply(session, rirsMessage(language));
  if (intent === "profile") return staticReply(session, doctorProfileMessage(language));
  if (intent === "reception") return staticReply(session, contactReceptionMessage(language));
  if (intent === "emergency") return staticReply(session, emergencyMessage(language));
  if (intent === "language") {
    await saveSession(session, { step: "language", draft: {} });
    return { text: languagePrompt(), language };
  }

  return {
    text: `${ask(language, "Please choose one option so I can help you properly.", "براہِ کرم ایک آپشن منتخب کریں تاکہ میں آپ کی بہتر رہنمائی کر سکوں۔")}\n\n${mainMenu(language)}`,
    options: menuOptions(language),
    language
  };
}

async function handleBooking(session, value) {
  const language = session.language;
  const draft = session.draft || {};

  if (session.step === "book_consent") {
    console.log("[Chatbot Debug handleBooking] book_consent evaluation: value =", JSON.stringify(value), "yes(value) =", yes(value), "no(value) =", no(value));
    if (!yes(value)) {
      if (no(value)) {
        console.log("[Chatbot Debug handleBooking] User selected NO. Resetting to menu.");
        return resetToMenu(session, language);
      }
      console.log("[Chatbot Debug handleBooking] User input not recognized as yes or no. Repeating consent prompt.");
      return { text: consentMessage(language), language };
    }
    console.log("[Chatbot Debug handleBooking] User selected YES. Advancing to book_name.");
    await saveSession(session, { step: "book_name", draft: { consentAccepted: true } });
    return { text: ask(language, "Please enter patient full name.", "براہِ کرم مریض کا مکمل نام لکھیں۔"), language };
  }
  if (session.step === "book_name") {
    draft.fullName = compactText(value, 100);
    if (draft.fullName.length < 2) return { text: ask(language, "Please enter the complete patient name.", "براہِ کرم مکمل نام لکھیں۔"), language };
    await saveSession(session, { step: "book_phone", draft });
    return { text: ask(language, "Please enter phone number.", "براہِ کرم فون نمبر لکھیں۔"), language };
  }
  if (session.step === "book_phone") {
    try {
      draft.phone = phoneSchema.parse(value);
    } catch {
      return { text: ask(language, "Please enter a valid phone number, for example 0300-8585508.", "براہِ کرم درست فون نمبر لکھیں، مثال 0300-8585508۔"), language };
    }
    await saveSession(session, { step: "book_age", draft });
    return { text: ask(language, "Please enter patient age.", "براہِ کرم مریض کی عمر لکھیں۔"), language };
  }
  if (session.step === "book_age") {
    const age = Number(value);
    if (!Number.isInteger(age) || age < 1 || age > 120) return { text: ask(language, "Please enter a valid age between 1 and 120.", "براہِ کرم 1 سے 120 کے درمیان درست عمر لکھیں۔"), language };
    draft.age = age;
    await saveSession(session, { step: "book_gender", draft });
    return {
      text: ask(language, "Please select gender:\n1. Male\n2. Female\n3. Other", "براہِ کرم جنس منتخب کریں:\n1. مرد\n2. خاتون\n3. دیگر"),
      options: [option("1. Male", "1"), option("2. Female", "2"), option("3. Other", "3")],
      language
    };
  }
  if (session.step === "book_gender") {
    const map = { 1: "Male", 2: "Female", 3: "Other", male: "Male", female: "Female", other: "Other" };
    const gender = map[value.toLowerCase().trim()];
    if (!gender) return { text: ask(language, "Please select gender using 1, 2, or 3.", "براہِ کرم 1، 2 یا 3 سے جنس منتخب کریں۔"), language };
    draft.gender = gender;
    await saveSession(session, { step: "book_city", draft });
    return { text: ask(language, "Please enter city.", "براہِ کرم شہر کا نام لکھیں۔"), language };
  }
  if (session.step === "book_city") {
    draft.city = compactText(value, 80);
    if (draft.city.length < 2) return { text: ask(language, "Please enter city.", "براہِ کرم شہر کا نام لکھیں۔"), language };
    await saveSession(session, { step: "book_reason", draft });
    return { text: ask(language, "Please briefly describe the reason for visit.", "براہِ کرم وزٹ کی وجہ مختصر لکھیں۔"), language };
  }
  if (session.step === "book_reason") {
    draft.reasonForVisit = compactText(value, 500);
    if (draft.reasonForVisit.length < 3) return { text: ask(language, "Please write a short reason for visit.", "براہِ کرم وزٹ کی مختصر وجہ لکھیں۔"), language };
    const locations = await locationOptions(language);
    draft.locationOptions = locations.locations;
    await saveSession(session, { step: "book_location", draft });
    return { text: locations.text, options: locations.options, language };
  }
  if (session.step === "book_location") {
    const location = pickByNumberOrValue(value, draft.locationOptions || [], "locationId");
    if (!location) {
      const locations = await locationOptions(language);
      return { text: locations.text, options: locations.options, language };
    }
    draft.locationId = location.locationId;
    draft.locationNameEn = location.nameEn;
    draft.locationNameUr = location.nameUr;
    await saveSession(session, { step: "book_date", draft });
    return askDates(session, location.locationId, "book_date");
  }
  if (session.step === "book_date") {
    const picked = pickByNumberOrValue(value, draft.dateOptions || [], "date");
    if (!picked) return askDates(session, draft.locationId, "book_date");
    draft.date = picked.date;
    await saveSession(session, { step: "book_time", draft });
    return askSlots(session, draft.locationId, draft.date, "book_time");
  }
  if (session.step === "book_time") {
    const picked = pickByNumberOrValue(value, draft.slotOptions || [], "time");
    if (!picked) return askSlots(session, draft.locationId, draft.date, "book_time");
    draft.time = picked.time;
    await saveSession(session, { step: "book_confirm", draft });
    return {
      text: ask(
        language,
        `Please confirm appointment:\n\nPatient: ${draft.fullName}\nLocation: ${draft.locationNameEn}\nDate: ${displayDate(draft.date, language)}\nTime: ${displayTime(draft.time, language)}\n\n1. Confirm\n2. Cancel`,
        `براہِ کرم اپائنٹمنٹ کی تصدیق کریں:\n\nمریض: ${draft.fullName}\nلوکیشن: ${draft.locationNameUr}\nتاریخ: ${displayDate(draft.date, language)}\nوقت: ${displayTime(draft.time, language)}\n\n1. تصدیق\n2. منسوخ`
      ),
      options: [option("1. Confirm", "1"), option("2. Cancel", "2")],
      language
    };
  }
  if (session.step === "book_confirm") {
    if (!yes(value)) return resetToMenu(session, language);
    const appointment = await createAppointment(
      {
        fullName: draft.fullName,
        phone: draft.phone,
        age: draft.age,
        gender: draft.gender,
        city: draft.city,
        reasonForVisit: draft.reasonForVisit,
        locationId: draft.locationId,
        date: draft.date,
        time: draft.time,
        language,
        source: "WhatsApp",
        consentAccepted: true
      },
      { userId: "Patient", role: "Patient" }
    );
    await saveSession(session, { step: "menu", draft: {} });
    return { text: `${appointmentConfirmation(appointment, language)}\n\n${mainMenu(language)}`, options: menuOptions(language), language, appointment };
  }

  return resetToMenu(session, language);
}

async function verifyAppointment(session, id, phone) {
  const appointment = await lookupAppointmentSafe({ appointmentId: id, phone });
  if (!appointment) {
    const language = session.language;
    return {
      error: true,
      reply: {
        text: ask(language, "Appointment was not found. Please check both appointment ID and phone number.", "اپائنٹمنٹ نہیں ملی۔ براہِ کرم اپائنٹمنٹ آئی ڈی اور فون نمبر دونوں چیک کریں۔"),
        language
      }
    };
  }
  return { appointment };
}

async function handleCheck(session, value) {
  const language = session.language;
  const draft = session.draft || {};
  if (session.step === "check_id") {
    draft.appointmentId = compactText(value, 40);
    await saveSession(session, { step: "check_phone", draft });
    return { text: ask(language, "Please enter the phone number used for booking.", "براہِ کرم وہ فون نمبر لکھیں جس سے بکنگ کی گئی تھی۔"), language };
  }
  const verified = await verifyAppointment(session, draft.appointmentId, value);
  await saveSession(session, { step: "menu", draft: {} });
  if (verified.error) return { ...verified.reply, text: `${verified.reply.text}\n\n${mainMenu(language)}`, options: menuOptions(language) };
  return { text: `${appointmentLookupMessage(verified.appointment, language)}\n\n${mainMenu(language)}`, options: menuOptions(language), language };
}

async function handleReschedule(session, value) {
  const language = session.language;
  const draft = session.draft || {};
  if (session.step === "reschedule_id") {
    draft.appointmentId = compactText(value, 40);
    await saveSession(session, { step: "reschedule_phone", draft });
    return { text: ask(language, "Please enter the phone number used for booking.", "براہِ کرم وہ فون نمبر لکھیں جس سے بکنگ کی گئی تھی۔"), language };
  }
  if (session.step === "reschedule_phone") {
    const verified = await verifyAppointment(session, draft.appointmentId, value);
    if (verified.error) return verified.reply;
    const full = await getAppointmentById(verified.appointment.appointmentId);
    if (!["Booked", "Rescheduled"].includes(full.status)) {
      await saveSession(session, { step: "menu", draft: {} });
      return { text: `${ask(language, "This appointment is not active and cannot be rescheduled.", "یہ اپائنٹمنٹ فعال نہیں، اس لیے تبدیل نہیں ہو سکتی۔")}\n\n${mainMenu(language)}`, options: menuOptions(language), language };
    }
    draft.phone = phoneSchema.parse(value);
    draft.currentAppointment = full;
    const locations = await locationOptions(language);
    draft.locationOptions = locations.locations;
    await saveSession(session, { step: "reschedule_location", draft });
    return { text: locations.text, options: locations.options, language };
  }
  if (session.step === "reschedule_location") {
    const location = pickByNumberOrValue(value, draft.locationOptions || [], "locationId");
    if (!location) {
      const locations = await locationOptions(language);
      return { text: locations.text, options: locations.options, language };
    }
    draft.locationId = location.locationId;
    draft.locationNameEn = location.nameEn;
    draft.locationNameUr = location.nameUr;
    await saveSession(session, { step: "reschedule_date", draft });
    return askDates(session, location.locationId, "reschedule_date");
  }
  if (session.step === "reschedule_date") {
    const picked = pickByNumberOrValue(value, draft.dateOptions || [], "date");
    if (!picked) return askDates(session, draft.locationId, "reschedule_date");
    draft.date = picked.date;
    await saveSession(session, { step: "reschedule_time", draft });
    return askSlots(session, draft.locationId, draft.date, "reschedule_time");
  }
  if (session.step === "reschedule_time") {
    const picked = pickByNumberOrValue(value, draft.slotOptions || [], "time");
    if (!picked) return askSlots(session, draft.locationId, draft.date, "reschedule_time");
    draft.time = picked.time;
    await saveSession(session, { step: "reschedule_confirm", draft });
    return {
      text: ask(
        language,
        `Confirm new appointment time?\n\nLocation: ${draft.locationNameEn}\nDate: ${displayDate(draft.date, language)}\nTime: ${displayTime(draft.time, language)}\n\n1. Confirm\n2. Cancel`,
        `کیا نیا وقت کنفرم ہے؟\n\nلوکیشن: ${draft.locationNameUr}\nتاریخ: ${displayDate(draft.date, language)}\nوقت: ${displayTime(draft.time, language)}\n\n1. تصدیق\n2. منسوخ`
      ),
      options: [option("1. Confirm", "1"), option("2. Cancel", "2")],
      language
    };
  }
  if (session.step === "reschedule_confirm") {
    if (!yes(value)) return resetToMenu(session, language);
    const appointment = await rescheduleAppointment(
      {
        appointmentId: draft.appointmentId,
        phone: draft.phone,
        locationId: draft.locationId,
        date: draft.date,
        time: draft.time,
        language
      },
      { userId: "Patient", role: "Patient" }
    );
    await saveSession(session, { step: "menu", draft: {} });
    return { text: `${rescheduleConfirmation(appointment, language)}\n\n${mainMenu(language)}`, options: menuOptions(language), language, appointment };
  }
  return resetToMenu(session, language);
}

async function handleCancel(session, value) {
  const language = session.language;
  const draft = session.draft || {};
  if (session.step === "cancel_id") {
    draft.appointmentId = compactText(value, 40);
    await saveSession(session, { step: "cancel_phone", draft });
    return { text: ask(language, "Please enter the phone number used for booking.", "براہِ کرم وہ فون نمبر لکھیں جس سے بکنگ کی گئی تھی۔"), language };
  }
  if (session.step === "cancel_phone") {
    const verified = await verifyAppointment(session, draft.appointmentId, value);
    if (verified.error) return verified.reply;
    draft.phone = phoneSchema.parse(value);
    await saveSession(session, { step: "cancel_reason", draft });
    return { text: ask(language, "Please write a short cancellation reason.", "براہِ کرم منسوخی کی مختصر وجہ لکھیں۔"), language };
  }
  if (session.step === "cancel_reason") {
    draft.reason = compactText(value, 250);
    if (draft.reason.length < 2) return { text: ask(language, "Please write a cancellation reason.", "براہِ کرم منسوخی کی وجہ لکھیں۔"), language };
    await saveSession(session, { step: "cancel_confirm", draft });
    return {
      text: ask(language, "Are you sure you want to cancel this appointment?\n\n1. Yes, cancel\n2. No", "کیا آپ واقعی یہ اپائنٹمنٹ منسوخ کرنا چاہتے ہیں؟\n\n1. جی ہاں، منسوخ کریں\n2. نہیں"),
      options: [option("1. Yes, cancel", "1"), option("2. No", "2")],
      language
    };
  }
  if (session.step === "cancel_confirm") {
    if (!yes(value)) return resetToMenu(session, language);
    const appointment = await cancelAppointment(
      {
        appointmentId: draft.appointmentId,
        phone: draft.phone,
        reason: draft.reason,
        language
      },
      { userId: "Patient", role: "Patient" }
    );
    await saveSession(session, { step: "menu", draft: {} });
    return { text: `${cancellationConfirmation(appointment, language)}\n\n${mainMenu(language)}`, options: menuOptions(language), language, appointment };
  }
  return resetToMenu(session, language);
}

export async function handleChatMessage(input, context = {}) {
  const parsed = chatMessageSchema.parse(input);
  const normalizedPhone = normalizePhone(parsed.phone);
  const hintedLanguage = parsed.language || (detectUrdu(parsed.message) ? "ur" : "en");
  
  console.log("[Chatbot Debug] Entering handleChatMessage for phone:", normalizedPhone, "with message:", JSON.stringify(parsed.message));
  
  const session = await getSession(normalizedPhone, hintedLanguage);
  console.log("[Chatbot Debug State Before]", { step: session.step, draft: session.draft });
  
  const value = compactText(parsed.message, 1000);

  let reply;
  if (/^(hi|hello|start|menu|0|السلام|سلام)$/i.test(value)) {
    console.log("[Chatbot Debug] Message matches menu reset pattern");
    await saveSession(session, { step: session.step === "language" ? "language" : "menu", language: session.language || hintedLanguage, draft: {} });
    if (session.step === "language") reply = { text: languagePrompt(), language: session.language };
    else reply = await resetToMenu(session, session.language);
  } else if (session.step === "language") {
    console.log("[Chatbot Debug] Processing language step");
    const language = value.trim() === "2" || /urdu|اردو/i.test(value) ? "ur" : value.trim() === "1" || /english/i.test(value) ? "en" : null;
    if (!language) reply = { text: languagePrompt(), language: hintedLanguage };
    else reply = await resetToMenu(session, language);
  } else {
    try {
      if (session.step.startsWith("book_")) {
        console.log("[Chatbot Debug] Delegating to handleBooking");
        reply = await handleBooking(session, value);
      } else if (session.step.startsWith("check_")) {
        console.log("[Chatbot Debug] Delegating to handleCheck");
        reply = await handleCheck(session, value);
      } else if (session.step.startsWith("reschedule_")) {
        console.log("[Chatbot Debug] Delegating to handleReschedule");
        reply = await handleReschedule(session, value);
      } else if (session.step.startsWith("cancel_")) {
        console.log("[Chatbot Debug] Delegating to handleCancel");
        reply = await handleCancel(session, value);
      } else {
        console.log("[Chatbot Debug] Delegating to handleMenu");
        reply = await handleMenu(session, value);
      }
    } catch (error) {
      console.error("[Chatbot Debug Error]", error);
      await saveSession(session, { step: "menu", draft: {} });
      reply = {
        text: `${error.message || ask(session.language, "Something went wrong. Please try again.", "کچھ غلط ہو گیا۔ براہِ کرم دوبارہ کوشش کریں۔")}\n\n${mainMenu(session.language)}`,
        options: menuOptions(session.language),
        language: session.language,
        error: context.includeErrors ? error.message : undefined
      };
    }
  }

  // Fetch the fresh state from DB to see if the session was successfully saved and updated
  const freshSession = await models.ChatSession.findOne({ normalizedPhone });
  console.log("[Chatbot Debug State After]", { step: freshSession?.step, draft: freshSession?.draft });
  
  return reply;
}
