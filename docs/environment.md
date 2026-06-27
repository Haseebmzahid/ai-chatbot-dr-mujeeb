# Environment

Copy `.env.example` to `.env` and add private values.

Critical values:

- `NODE_ENV`
- `PORT`
- `APP_BASE_URL`
- `CLIENT_BASE_URL`
- `API_BASE_URL`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `COOKIE_SECRET`
- `ADMIN_BOOTSTRAP_TOKEN`
- `CORS_ALLOWED_ORIGINS`
- `LOG_LEVEL`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `TRUST_PROXY`

WhatsApp values:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`
- `WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMATION`
- `WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER`
- `WHATSAPP_TEMPLATE_RESCHEDULE_CONFIRMATION`
- `WHATSAPP_TEMPLATE_CANCELLATION_CONFIRMATION`

Production rules:

- Use HTTPS URLs for `APP_BASE_URL` and `CLIENT_BASE_URL`.
- Do not commit `.env`.
- Keep Meta tokens on the backend only.
- Use exact allowed origins; do not use wildcard CORS in production.
- Create the first Super Admin through the one-time setup flow.
- Use approved utility template names that match the Meta template body variables.
- Leave WhatsApp values blank until the real WhatsApp Business Account and approved phone number are ready.
