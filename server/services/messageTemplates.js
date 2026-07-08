import { DOCTOR } from "../config/clinic.js";
import { displayDate, displayTime, maskPhone } from "../utils/time.js";

export function isUrdu(language = "en") {
  return language === "ur";
}

export function languagePrompt() {
  return [
    "Welcome to Dr. Mujeeb Ur Rehman's WhatsApp Appointment Assistant. Please select an option.",
    "",
    "ڈاکٹر مجیب الرحمٰن کے واٹس ایپ اپائنٹمنٹ اسسٹنٹ میں خوش آمدید۔ براہِ کرم ایک آپشن منتخب کریں۔",
    "",
    "1. English",
    "2. اردو"
  ].join("\n");
}

export function mainMenu(language = "en") {
  if (isUrdu(language)) {
    return [
      "براہِ کرم ایک آپشن منتخب کریں:",
      "",
      "1. RIRS / گردے کی پتھری کی معلومات",
      "2. کلینک لوکیشنز اور اوقات",
      "3. اپائنٹمنٹ تبدیل کریں",
      "4. اپائنٹمنٹ منسوخ کریں",
      "5. اپنی اپائنٹمنٹ چیک کریں",
      "6. اپائنٹمنٹ بک کریں",
      "7. ڈاکٹر صاحب کا تعارف",
      "8. ریسیپشن سے رابطہ کریں",
      "9. ایمرجنسی رہنمائی",
      "10. زبان تبدیل کریں"
    ].join("\n");
  }

  return [
    "Please select an option:",
    "",
    "1. RIRS / Kidney Stone Surgery Info",
    "2. Clinic Locations & Timings",
    "3. Reschedule Appointment",
    "4. Cancel Appointment",
    "5. Check My Appointment",
    "6. Book Appointment",
    "7. Doctor Profile",
    "8. Contact Reception",
    "9. Emergency Guidance",
    "10. Change Language"
  ].join("\n");
}

export function consentMessage(language = "en") {
  if (isUrdu(language)) {
    return "اپائنٹمنٹ بک کرنے کے لیے ہم آپ کا نام، فون نمبر، اپائنٹمنٹ کی تفصیلات اور وزٹ کی وجہ کلینک ریکارڈ کے لیے محفوظ کریں گے۔ جاری رکھنے کے لیے Yes لکھیں۔";
  }
  return "To book your appointment, we will save your name, phone number, appointment details, and reason for visit for clinic appointment management. Please reply Yes to continue.";
}

export function locationsMessage(language = "en") {
  if (isUrdu(language)) {
    return [
      "ڈاکٹر مجیب الرحمٰن دو مقامات پر مریض دیکھتے ہیں:",
      "",
      "1. الحبیب جنرل ہسپتال",
      "   معیار جندول، دیر لوئر، خیبر پختونخوا",
      "   پیر تا جمعہ",
      "   صبح 9:00 بجے تا شام 5:00 بجے",
      "",
      "2. محمد میڈیکل کمپلیکس",
      "   نزد سوئی گیس دفتر، فیز 5، حیات آباد، پشاور",
      "   صرف ہفتہ",
      "   دوپہر 12:00 بجے تا شام 7:00 بجے",
      "",
      `اپائنٹمنٹ کے لیے رابطہ: \u2066${DOCTOR.contact}\u2069`
    ].join("\n");
  }

  return [
    "Dr. Mujeeb Ur Rehman sees patients at two locations:",
    "",
    "1. Al Habib General Hospital",
    "   Mayar Jandol, Lower Dir, Khyber Pakhtunkhwa",
    "   Monday to Friday",
    "   9:00 AM to 5:00 PM",
    "",
    "2. Muhammad Medical Complex",
    "   Near Sui Gas Office, Phase 5, Hayatabad, Peshawar",
    "   Saturday only",
    "   12:00 PM to 7:00 PM",
    "",
    `Appointment Contact: ${DOCTOR.contact}`
  ].join("\n");
}

export function doctorProfileMessage(language = "en") {
  if (isUrdu(language)) {
    return [
      DOCTOR.nameUr,
      DOCTOR.qualificationsEn,
      DOCTOR.specialtyUr,
      "",
      "ڈاکٹر صاحب گردے کی پتھری، پیشاب کے مسائل، پروسٹیٹ، مثانے کے مسائل اور اینڈو یورولوجی سے متعلق مریض دیکھتے ہیں۔",
      "",
      `اپائنٹمنٹ کے لیے رابطہ: \u2066${DOCTOR.contact}\u2069`
    ].join("\n");
  }

  return [
    DOCTOR.nameEn,
    DOCTOR.qualificationsEn,
    DOCTOR.specialtyEn,
    "",
    "He deals with urology-related concerns including kidney stones, urinary problems, prostate issues, bladder-related concerns, and endo-urology procedures.",
    "",
    `For appointment: ${DOCTOR.contact}`
  ].join("\n");
}

export function rirsMessage(language = "en") {
  if (isUrdu(language)) {
    return [
      "RIRS یعنی Retrograde Intrarenal Surgery گردے کی پتھری نکالنے کا ایک جدید اور بغیر کٹ کے آپریشن ہے۔ اس سرجری کی قیمت عموماً 170,000 روپے سے 280,000 روپے کے درمیان ہو سکتی ہے، تاہم حتمی قیمت پتھری کے سائز، تعداد، سختی، مقام، مریض کی حالت اور سرجری کی پیچیدگی پر منحصر ہوتی ہے۔",
      "",
      "صرف آن لائن پیغامات یا رپورٹس کی بنیاد پر حتمی مشورہ یا حتمی لاگت بتانا ممکن نہیں۔ درست تشخیص، علاج کے انتخاب اور اخراجات کے لیے براہِ کرم کلینک میں تشریف لائیں تاکہ ڈاکٹر صاحب معائنہ اور رپورٹس کا تفصیلی جائزہ لے سکیں۔",
      "",
      `اپائنٹمنٹ کے لیے رابطہ: \u2066${DOCTOR.contact}\u2069`
    ].join("\n");
  }

  return [
    "RIRS, Retrograde Intrarenal Surgery, is a modern no-cut procedure used for kidney stone treatment. The estimated cost usually ranges from PKR 170,000 to PKR 280,000. Final cost depends on stone size, number, hardness, location, patient condition, reports, and surgical complexity.",
    "",
    `A final opinion, treatment decision, and exact cost can only be given after clinic examination and report review. Please book an appointment or contact reception at ${DOCTOR.contact}.`
  ].join("\n");
}

export function emergencyMessage(language = "en") {
  if (isUrdu(language)) {
    return "اگر شدید درد، تیز بخار، پیشاب بند ہونا، زیادہ خون آنا یا کوئی ایمرجنسی علامات ہوں تو فوراً قریبی ایمرجنسی ڈیپارٹمنٹ جائیں یا کلینک سے رابطہ کریں۔";
  }
  return "If you have severe pain, high fever, inability to pass urine, heavy bleeding, or emergency symptoms, please visit the nearest emergency department immediately or contact the clinic.";
}

export function contactReceptionMessage(language = "en") {
  return isUrdu(language)
    ? `ریسیپشن سے رابطہ کے لیے کال کریں: \u2066${DOCTOR.contact}\u2069`
    : `Please contact reception at ${DOCTOR.contact}.`;
}

export function appointmentConfirmation(appointment, language = "en") {
  const location = isUrdu(language) ? appointment.locationNameUr : appointment.locationNameEn;
  if (isUrdu(language)) {
    return [
      "آپ کی اپائنٹمنٹ کامیابی سے بک ہو گئی ہے۔",
      "",
      `ڈاکٹر: ${DOCTOR.nameUr}`,
      `تخصص: ${DOCTOR.specialtyUr}`,
      `تاریخ: ${displayDate(appointment.date, language)}`,
      `وقت: ${displayTime(appointment.time, language)}`,
      `لوکیشن: ${location}`,
      `ٹوکن نمبر: ${appointment.tokenNumber}`,
      `اپائنٹمنٹ آئی ڈی: ${appointment.appointmentId}`,
      `رابطہ نمبر: \u2066${DOCTOR.contact}\u2069`,
      "",
      "براہِ کرم اپائنٹمنٹ کے وقت سے 10 سے 15 منٹ پہلے تشریف لائیں اور اپنی سابقہ رپورٹس، الٹراساؤنڈ، CT scan، نسخے اور لیب ٹیسٹ ساتھ لائیں۔"
    ].join("\n");
  }

  return [
    "Your appointment has been booked successfully.",
    "",
    `Doctor: ${DOCTOR.nameEn}`,
    `Specialty: ${DOCTOR.specialtyEn}`,
    `Date: ${displayDate(appointment.date, language)}`,
    `Time: ${displayTime(appointment.time, language)}`,
    `Location: ${location}`,
    `Token No: ${appointment.tokenNumber}`,
    `Appointment ID: ${appointment.appointmentId}`,
    `Contact: ${DOCTOR.contact}`,
    "",
    "Please arrive 10-15 minutes before your appointment time and bring your previous reports, ultrasound, CT scan, prescriptions, and lab tests if available."
  ].join("\n");
}

export function appointmentLookupMessage(appointment, language = "en") {
  const location = isUrdu(language) ? appointment.locationNameUr : appointment.locationNameEn;
  if (isUrdu(language)) {
    return [
      "آپ کی اپائنٹمنٹ کی تفصیلات:",
      "",
      `ڈاکٹر: ${DOCTOR.nameUr}`,
      `تاریخ: ${displayDate(appointment.date, language)}`,
      `وقت: ${displayTime(appointment.time, language)}`,
      `لوکیشن: ${location}`,
      `سٹیٹس: ${appointment.status}`,
      `ٹوکن نمبر: ${appointment.tokenNumber}`,
      "",
      `فون: \u2066${appointment.maskedPhone || maskPhone(appointment.normalizedPhone || appointment.phone)}\u2069`
    ].join("\n");
  }

  return [
    "Your appointment details:",
    "",
    `Doctor: ${DOCTOR.nameEn}`,
    `Date: ${displayDate(appointment.date, language)}`,
    `Time: ${displayTime(appointment.time, language)}`,
    `Location: ${location}`,
    `Status: ${appointment.status}`,
    `Token No: ${appointment.tokenNumber}`,
    "",
    `Phone: ${appointment.maskedPhone || maskPhone(appointment.normalizedPhone || appointment.phone)}`
  ].join("\n");
}

export function rescheduleConfirmation(appointment, language = "en") {
  return isUrdu(language)
    ? `آپ کی اپائنٹمنٹ تبدیل ہو گئی ہے۔\n\n${appointmentConfirmation(appointment, language)}`
    : `Your appointment has been rescheduled.\n\n${appointmentConfirmation(appointment, language)}`;
}

export function cancellationConfirmation(appointment, language = "en") {
  if (isUrdu(language)) {
    return `آپ کی اپائنٹمنٹ منسوخ کر دی گئی ہے۔\n\nاپائنٹمنٹ آئی ڈی: ${appointment.appointmentId}\nتاریخ: ${displayDate(appointment.date, language)}\nوقت: ${displayTime(appointment.time, language)}`;
  }
  return `Your appointment has been cancelled.\n\nAppointment ID: ${appointment.appointmentId}\nDate: ${displayDate(appointment.date, language)}\nTime: ${displayTime(appointment.time, language)}`;
}
