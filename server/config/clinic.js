export const TIMEZONE = "Asia/Karachi";

export const DOCTOR = {
  nameEn: "Dr. Mujeeb Ur Rehman",
  nameUr: "ڈاکٹر مجیب الرحمٰن",
  qualificationsEn: "MBBS, FCPS, MRCS (Edin-UK), Endo-Urology Fellowship",
  qualificationsShort: "MBBS FCPS MRCS (UK) F.Endo Urology",
  specialtyEn: "Consultant Urologist / Endo-Urologist",
  specialtyUr: "کنسلٹنٹ یورولوجسٹ / اینڈو یورولوجسٹ",
  contact: "0300-8585508"
};

export const DEFAULT_LOCATIONS = [
  {
    slug: "al-habib-lower-dir",
    nameEn: "Al Habib General Hospital",
    nameUr: "الحبیب جنرل ہسپتال",
    addressEn: "Mayar Jandol, Lower Dir, Khyber Pakhtunkhwa",
    addressUr: "معیار جندول، دیر لوئر، خیبر پختونخوا",
    city: "Lower Dir",
    phone: DOCTOR.contact,
    googleMapLink: "",
    active: true,
    schedule: {
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      openingTime: "09:00",
      closingTime: "17:00",
      breakStart: "",
      breakEnd: "",
      slotDurationMinutes: 15,
      dailyLimit: 32,
      timezone: TIMEZONE,
      active: true
    }
  },
  {
    slug: "muhammad-medical-peshawar",
    nameEn: "Muhammad Medical Complex",
    nameUr: "محمد میڈیکل کمپلیکس",
    addressEn: "Near Sui Gas Office, Phase 5, Hayatabad, Peshawar",
    addressUr: "نزد سوئی گیس دفتر، فیز 5، حیات آباد، پشاور",
    city: "Peshawar",
    phone: DOCTOR.contact,
    googleMapLink: "",
    active: true,
    schedule: {
      workingDays: ["Saturday"],
      openingTime: "12:00",
      closingTime: "19:00",
      breakStart: "",
      breakEnd: "",
      slotDurationMinutes: 15,
      dailyLimit: 28,
      timezone: TIMEZONE,
      active: true
    }
  }
];

export const ACTIVE_APPOINTMENT_STATUSES = ["Booked", "Rescheduled"];
export const CLOSED_APPOINTMENT_STATUSES = ["Cancelled", "Visited", "No-Show"];
export const APPOINTMENT_STATUSES = [...ACTIVE_APPOINTMENT_STATUSES, ...CLOSED_APPOINTMENT_STATUSES];
export const STAFF_ROLES = ["Super Admin", "Receptionist"];

export const SYSTEM_COPY = {
  productName: "Dr. Mujeeb Ur Rehman WhatsApp AI Appointment Chatbot",
  contact: DOCTOR.contact
};
