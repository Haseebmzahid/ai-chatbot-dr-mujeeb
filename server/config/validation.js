const REQUIRED_ALWAYS = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "COOKIE_SECRET",
  "ADMIN_BOOTSTRAP_TOKEN"
];

const WHATSAPP_KEYS = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "META_APP_SECRET",
  "WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMATION",
  "WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER",
  "WHATSAPP_TEMPLATE_RESCHEDULE_CONFIRMATION",
  "WHATSAPP_TEMPLATE_CANCELLATION_CONFIRMATION"
];

function looksMissing(value = "") {
  return !value || value.includes("replace") || value.includes("change-me") || value.includes("<");
}

function longEnoughSecret(key, value = "") {
  if (!key.includes("SECRET") && key !== "COOKIE_SECRET" && key !== "ADMIN_BOOTSTRAP_TOKEN") return true;
  return value.length >= 32;
}

export function whatsappConfigured(env = process.env) {
  return WHATSAPP_KEYS.every((key) => !looksMissing(env[key] || ""));
}

export function validateEnvironment(env = process.env) {
  const errors = [];
  const warnings = [];
  const production = env.NODE_ENV === "production";

  REQUIRED_ALWAYS.forEach((key) => {
    const value = env[key] || "";
    if (looksMissing(value)) {
      if (production) errors.push(`${key} is required.`);
      else warnings.push(`${key} is not configured yet. Using a local development fallback.`);
    } else if (production && !longEnoughSecret(key, value)) {
      errors.push(`${key} must be at least 32 characters.`);
    }
  });

  if (production && env.APP_BASE_URL && !env.APP_BASE_URL.startsWith("https://")) {
    errors.push("APP_BASE_URL must use HTTPS in production.");
  }

  if (production && env.CLIENT_BASE_URL && !env.CLIENT_BASE_URL.startsWith("https://")) {
    errors.push("CLIENT_BASE_URL must use HTTPS in production.");
  }

  if (production && env.CORS_ALLOWED_ORIGINS && env.CORS_ALLOWED_ORIGINS === "*") {
    errors.push("CORS_ALLOWED_ORIGINS must be restricted in production.");
  }

  if (!whatsappConfigured(env)) {
    warnings.push("WhatsApp is not configured yet. The API will log skipped messages and will not report delivery.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checkedAt: new Date().toISOString(),
    whatsappConfigured: whatsappConfigured(env)
  };
}
