# Dr. Mujeeb Ur Rehman WhatsApp AI Appointment Chatbot

A secure bilingual WhatsApp AI appointment chatbot for Dr. Mujeeb Ur Rehman. The product handles real patient appointment conversations through a WhatsApp-style flow, stores appointments in MongoDB, sends messages through the official Meta WhatsApp Cloud API, and gives authorized staff a small internal control panel.

This is not full clinic software, a hospital ERP, a prescription system, a finance system, or an analytics product.

## Doctor Details

| Item | Details |
| --- | --- |
| Doctor | Dr. Mujeeb Ur Rehman |
| Urdu name | ڈاکٹر مجیب الرحمٰن |
| Qualifications | MBBS, FCPS, MRCS (Edin-UK), Endo-Urology Fellowship |
| Specialty | Consultant Urologist / Endo-Urologist |
| Contact | 0300-8585508 |

## Clinic Locations

| Location | Address | Timing |
| --- | --- | --- |
| Al Habib General Hospital | Mayar Jandol, Lower Dir, Khyber Pakhtunkhwa | Monday to Friday, 9:00 AM to 5:00 PM |
| Muhammad Medical Complex | Near Sui Gas Office, Phase 5, Hayatabad, Peshawar | Saturday only, 12:00 PM to 7:00 PM |

Sunday is closed unless authorized staff changes the schedule.

## Product Scope

Included modules:

- WhatsApp chatbot flow.
- Patient appointment booking.
- Appointment lookup using appointment ID and phone number together.
- Appointment reschedule and cancellation.
- Clinic location and timing replies.
- Doctor profile replies.
- Safe RIRS and kidney stone surgery information.
- Emergency guidance replies.
- Official WhatsApp Cloud API webhook and sender.
- MongoDB appointment database.
- Staff login and first Super Admin setup.
- Today's appointments, all appointments, manual appointment entry, and appointment actions.
- Clinic timing/location settings.
- Blocked dates and slots.
- WhatsApp message logs.
- Security, audit logs, and deployment setup.

Excluded by design:

- Large dashboards, charts, CRM, prescriptions, finance reports, marketing tools, and hospital ERP wording.
- Preset staff accounts, patient records, appointment records, message logs, reports, or chart records.
- Any unofficial WhatsApp automation.

The only startup data is the real clinic location and timing configuration for Dr. Mujeeb Ur Rehman.

## Chatbot Features

- English and Urdu language selection.
- Appointment booking with consent, patient details, location, date, slot, and final confirmation.
- Appointment lookup by appointment ID and phone number.
- Reschedule and cancellation flows.
- Location-wise timing replies for Lower Dir and Peshawar.
- Doctor profile replies.
- Safe RIRS and kidney stone surgery information with an estimated PKR 170,000 to PKR 280,000 range.
- Emergency guidance that directs patients to emergency care.
- Natural intent mapping for English, Urdu, and Roman Urdu appointment messages.
- WhatsApp webhook verification, incoming messages, outgoing replies, status tracking, and message logs.

The chatbot does not diagnose, prescribe medicine, interpret reports as final advice, guarantee costs, or replace a clinic consultation.

## Internal Control Panel

The staff panel is intentionally small:

- Staff login.
- One-time first Super Admin setup.
- Today's appointments.
- All appointments with search and status actions.
- Manual appointment entry for reception calls.
- Reschedule, cancel, visited, and no-show actions.
- Clinic locations and timing rules.
- Blocked dates and slots.
- WhatsApp logs and API status.
- Settings.
- Staff users for Super Admin only.

There is no public staff signup and no default staff account.

## WhatsApp Cloud API

This project uses the official Meta WhatsApp Cloud API only.

Required live values:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`
- `WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMATION`
- `WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER`
- `WHATSAPP_TEMPLATE_RESCHEDULE_CONFIRMATION`
- `WHATSAPP_TEMPLATE_CANCELLATION_CONFIRMATION`

Meta webhook callback URL:

```text
https://your-domain.example/api/whatsapp/webhook
```

Webhook behavior:

- `GET /api/whatsapp/webhook` verifies the Meta challenge using `WHATSAPP_VERIFY_TOKEN`.
- `POST /api/whatsapp/webhook` verifies `X-Hub-Signature-256` using `META_APP_SECRET` when configured.
- Incoming messages are deduplicated by provider message ID.
- Delivery, read, and failed statuses update message logs.
- The webhook returns quickly after validation and processes conversation work asynchronously.
- Replies are sent through Meta Graph API only when credentials are complete.

If WhatsApp credentials are absent, outgoing attempts are logged as `not_configured` and the API returns `WhatsApp is not configured yet`. It never reports delivery unless Meta accepts the request.

## WhatsApp Safety Rules

Implemented safeguards:

- Official WhatsApp Cloud API only.
- Consent is recorded before appointment messages are sent.
- Patients can opt out of non-essential messages with STOP, unsubscribe, بند, or equivalent short commands.
- Operational appointment confirmations, reminders, reschedule confirmations, and cancellation confirmations are separated from manual reception messages.
- Free-form messages are sent only inside the 24-hour customer service window.
- Approved utility templates are used outside the service window when a template name is configured.
- Retry attempts are limited and use exponential backoff.
- Sending pauses for non-essential messages after repeated delivery failures.
- Non-essential sends are throttled per patient and globally.
- Bulk broadcasts and marketing campaigns are not part of this system.
- Staff can see local failure-rate warnings and should also monitor WhatsApp Manager quality rating.

Template bodies and variable order in Meta must match the approved templates configured in `.env`.

## Privacy

- Patient data is not exposed publicly.
- Appointment lookup requires appointment ID and phone number.
- Patient phone numbers are masked in patient-facing lookup replies.
- Internal notes, diagnoses, prescriptions, and staff-only details are not sent through WhatsApp.
- The chatbot asks only for appointment information needed by reception.
- CNIC, passport, payment card, and final medical decision data are not requested in WhatsApp.
- Tokens and secrets remain backend environment variables.
- Sensitive staff actions are written to audit logs.

## Environment Setup

Create `.env` from `.env.example` and fill real private values:

```bash
cp .env.example .env
```

Required runtime values:

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
- `CORS_ALLOWED_ORIGINS`
- `ADMIN_BOOTSTRAP_TOKEN`
- `LOG_LEVEL`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `TRUST_PROXY`

Use long random values for JWT, cookie, and bootstrap secrets. In production, `APP_BASE_URL` and `CLIENT_BASE_URL` must use HTTPS and `CORS_ALLOWED_ORIGINS` must contain exact origins.

For local development, the server can start without a prefilled MongoDB URI or auth secrets. It will generate ephemeral secrets and boot in a degraded mode if `MONGODB_URI` is omitted.

## First Admin Setup

1. Start the server with MongoDB and `ADMIN_BOOTSTRAP_TOKEN` configured.
2. Open the staff panel.
3. If no Super Admin exists, the setup screen appears.
4. Enter the bootstrap token, name, email, and a strong password.
5. Setup is disabled automatically after the first Super Admin is created.

There is no public staff signup.

## Run Locally

Install dependencies:

```bash
npm install
```

Run API and Vite client:

```bash
npm run dev
```

Patient chat:

```text
http://localhost:5173/patient-chat
```

Staff panel:

```text
http://localhost:5173/
```

## Production Build

```bash
npm run build
npm start
```

The Express server serves `dist/` after `npm run build`.

## MongoDB

Use MongoDB Atlas or a secured MongoDB server. MongoDB is required for the real application flow; the app has no local in-memory production behavior. The app creates required indexes on startup and writes only real clinic configuration plus records created through real setup and real user actions.

When `NODE_ENV` is not `production`, the server can still boot without `MONGODB_URI`, but database-backed API routes will return `503` until a real MongoDB URI is provided. That is intended for local development only.

Important database behavior:

- Atomic appointment creation.
- Unique active slot protection.
- Duplicate active same-day phone booking protection.
- Location-wise daily token generation.
- Reschedule history.
- Message-log provider ID idempotency.
- Audit logs for sensitive staff actions.

## Health Endpoint

`GET /api/health` returns a safe readiness shape:

- `status`
- `product`
- `version`
- `environment`
- `mongoConnected`
- `whatsappConfigured`
- `configurationOk`
- `uptimeSeconds`

It does not return secrets, connection strings, access tokens, stack traces, or patient data.

## Testing

```bash
npm test
npm run check:dummy-content
npm run build
```

The content scan checks retained source/docs for old doctor names, unwanted generated records, old credential wording, non-production storage wording, and prohibited appointment-content terms.

## Deployment Steps

1. Provision MongoDB Atlas or a secured MongoDB server and set `MONGODB_URI`.
2. Set long random JWT, cookie, and bootstrap secrets.
3. Configure `CORS_ALLOWED_ORIGINS` with the exact production origin.
4. Configure HTTPS and set `TRUST_PROXY` for the proxy in front of Node.
5. Build the frontend with `npm run build`.
6. Run the Node server with PM2, Render, Railway, or another Node host.
7. Confirm `/api/health` reports MongoDB ready.
8. Create the first Super Admin.
9. Add real Meta WhatsApp Cloud API credentials and approved utility template names.
10. Set the Meta webhook URL to `/api/whatsapp/webhook`.
11. Test booking, lookup, reschedule, cancellation, WhatsApp logs, opt-out, and message status updates before launch.

## Backup, Restore, And Logs

- Schedule MongoDB Atlas backups or run the provided MongoDB backup scripts from a secured operator machine.
- Test restore into a separate database before relying on backups.
- Keep `.env` out of backups that move outside the server trust boundary.
- Rotate application logs through the host, PM2, or container platform.
- Review WhatsApp failed-message logs and Meta quality status during launch week.

## Troubleshooting

- `WhatsApp is not configured yet`: add all required Meta values and approved template names.
- Meta webhook returns 403: confirm `WHATSAPP_VERIFY_TOKEN` and `META_APP_SECRET`.
- Messages show `outside_service_window`: configure approved utility templates or wait for the patient to message again.
- Messages show `opted_out`: the patient has opted out of non-essential WhatsApp messages.
- Messages show `delivery_hold`: repeated delivery failures paused non-essential sends for that patient.
- MongoDB connection fails: verify network access, Atlas allowlist, username, password, and database URI.
- Login fails after repeated attempts: wait for the lockout period or update the user from a secured database session.

## Launch Checklist

- [ ] MongoDB Atlas or secured MongoDB is connected.
- [ ] `/api/health` shows `mongoConnected: true`.
- [ ] HTTPS is enabled.
- [ ] CORS contains exact production origins.
- [ ] First Super Admin is created.
- [ ] Lower Dir slots work Monday to Friday only.
- [ ] Peshawar slots work Saturday only.
- [ ] Sunday remains closed unless staff changes schedules.
- [ ] Past dates and past times are blocked.
- [ ] Duplicate active same-day phone bookings are blocked.
- [ ] Double booking of one slot is blocked.
- [ ] Appointment lookup requires appointment ID and phone number.
- [ ] WhatsApp webhook verification succeeds.
- [ ] Meta signature verification succeeds.
- [ ] Approved utility templates are configured.
- [ ] STOP/unsubscribe handling is tested.
- [ ] Failed delivery status updates appear in logs.
- [ ] Staff can see professional empty states before real records exist.
- [ ] `npm test` passes.
- [ ] `npm run check:dummy-content` passes.
- [ ] `npm run build` passes.

## Useful Commands

```bash
npm run dev
npm run build
npm start
npm test
npm run check:dummy-content
```
