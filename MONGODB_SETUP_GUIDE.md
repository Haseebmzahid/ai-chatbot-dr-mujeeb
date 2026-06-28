# MongoDB Setup & Deployment Guide

This guide describes how to configure, set up, and deploy the MongoDB database for **Dr. Mujeeb Ur Rehman's WhatsApp AI Appointment Chatbot**.

## 1. MongoDB Atlas Cluster Creation

To run this application in production, you must set up a MongoDB Atlas cluster:

1. **Sign Up / Log In**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. **Create a Project**: Create a new project (e.g., `DrMujeeb-Chatbot`).
3. **Deploy a Database**:
   - Choose the **M10/M30 (Dedicated)** or **M0 (Shared/Free Tier)** depending on workload.
   - Choose your preferred cloud provider (e.g., AWS) and region (e.g., `ap-south-1` or `eu-west-1` close to Pakistan/Asia/Karachi timezone if possible).
   - Click **Create**.
4. **Configure Database Access (Security)**:
   - Create a database user (e.g., `drmujeeb_admin`).
   - Securely generate or write a password (e.g., `Hazy-786`).
   - Save these credentials.
5. **Configure Network Access (Firewall)**:
   - Whitelist the IP addresses of your application server/hosting provider (e.g., Render, AWS EC2, Heroku, or DigitalOcean).
   - If hosting on a platform with dynamic IPs, you may need to allow access from anywhere (`0.0.0.0/0`) and strictly rely on strong credential authentication.
6. **Get Connection String**:
   - In the Atlas Dashboard, go to **Database** -> click **Connect**.
   - Select **Drivers** (Node.js).
   - Copy the connection string. It will look like this:
     ```text
     mongodb+srv://drmujeeb_admin:<password>@drmujeeb.cdsm0ba.mongodb.net/drmujeeb?retryWrites=true&w=majority&appName=DrMujeeb
     ```

## 2. Database Name

The database name is specified directly in the connection URI path segment before the query parameters.
- Recommended database name: `drmujeeb`
- Connection URI: `...mongodb.net/drmujeeb?retryWrites=...`

## 3. Required Collections

The application uses **Mongoose** to interact with the database. When the application starts up, Mongoose automatically initializes and creates the following collections:

1. `users`: Stores admin and receptionist login credentials, roles, status, and lock status.
2. `cliniclocations`: Stores active/inactive clinic locations, addresses, and contacts.
3. `schedulerules`: Stores working days, timings, slots, and limits for each location.
4. `blockedslots`: Stores slots manually blocked by staff for holidays, emergency leave, etc.
5. `patients`: Stores patient profiles, ages, genders, and opt-in consent dates.
6. `appointments`: Stores booked, rescheduled, cancelled appointments, and rescheduling history.
7. `messagelogs`: Logs inbound/outbound WhatsApp messages, templates, and delivery statuses.
8. `auditlogs`: Audits staff operations (e.g., user creations, rescheduling, slot blocking).
9. `whatsappconsents`: Manages patient opt-in / opt-out preferences and delivery failure counts.
10. `webhookevents`: Prevents duplicate webhook processing by recording event provider IDs.
11. `chatsessions`: Stores the conversational step-by-step state of patients chatting with the WhatsApp bot.
12. `counters`: Generates incremental token numbers for appointments per clinic and date.

## 4. Required Indexes

Mongoose automatically builds the necessary indexes at startup. The index specifications are as follows:

| Collection | Index Fields | Properties | Purpose |
| :--- | :--- | :--- | :--- |
| **users** | `userId: 1` | Unique | Public ID Lookup |
| | `email: 1` | Unique, Case-insensitive | Login Identifier |
| | `role: 1` | Index | Role-based Authorization |
| | `status: 1` | Index | Active State Filtering |
| **cliniclocations**| `locationId: 1` | Unique | Public ID Lookup |
| | `slug: 1` | Unique | URL Slug Mapping |
| | `city: 1` | Index | City-based Filtering |
| | `active: 1` | Index | Filtering Active Clinics |
| **schedulerules** | `ruleId: 1` | Unique | Public ID Lookup |
| | `locationId: 1` | Index | Clinic Schedule Mapping |
| | `active: 1` | Index | Active Rules Filtering |
| | `locationId: 1, active: 1` | Compound | Active Clinic Schedule Query |
| **blockedslots** | `blockedSlotId: 1` | Unique | Public ID Lookup |
| | `locationId: 1` | Index | Location Lookup |
| | `date: 1` | Index | Date Lookup |
| | `fullDay: 1` | Index | Full Day Block Filtering |
| | `active: 1` | Index | Active State Lookup |
| | `locationId: 1, date: 1, active: 1` | Compound | Active Slot Verification |
| **patients** | `patientId: 1` | Unique | Public ID Lookup |
| | `fullName: 1` | Index | Patient Searching |
| | `normalizedPhone: 1` | Unique | Patient Phone Lookup |
| **appointments** | `appointmentId: 1` | Unique | Public ID Lookup |
| | `patientId: 1` | Index | Patient History Lookup |
| | `normalizedPhone: 1`| Index | Patient Booking Lookup |
| | `locationId: 1` | Index | Location Reporting |
| | `date: 1` | Index | Date Schedule Query |
| | `status: 1` | Index | Status Filtering |
| | `source: 1` | Index | Analytics / Channel |
| | `locationId: 1, date: 1, time: 1` | Unique, Partial (status in Booked/Rescheduled) | Prevents Double Booking same time slot |
| | `normalizedPhone: 1, date: 1` | Unique, Partial (status in Booked/Rescheduled) | Prevents Patient from Booking twice on same day |
| | `locationId: 1, date: 1, tokenNumber: 1`| Unique, Partial (status in Booked/Rescheduled) | Prevents Duplicate Token Number Allocation |
| | `patientName: "text", normalizedPhone: "text", appointmentId: "text"` | Text Index | Staff Search Bar Queries |
| **messagelogs** | `messageLogId: 1` | Unique | Public ID Lookup |
| | `phone: 1`, `normalizedPhone: 1` | Index | Log Lookup by Phone |
| | `appointmentId: 1` | Index | Message History |
| | `messageType: 1`, `direction: 1` | Index | Status Filtering |
| | `status: 1` | Index | Delivery Reporting |
| | `providerMessageId: 1` | Unique, Partial (providerMessageId not empty) | Prevents Duplicate Delivery Logs |
| | `createdAt: -1` | Index | Logs sorting |
| **auditlogs** | `auditLogId: 1` | Unique | Public ID Lookup |
| | `actorUserId: 1` | Index | Actor Audits |
| | `action: 1`, `module: 1` | Index | Activity Filtering |
| | `targetId: 1` | Index | Target Audits |
| | `createdAt: -1` | Index | Logs sorting |
| **whatsappconsents**| `consentId: 1` | Unique | Public ID Lookup |
| | `normalizedPhone: 1` | Unique | Opt-In Lookup |
| | `nonEssentialOptOut: 1` | Index | Marketing Filters |
| **webhookevents** | `eventId: 1` | Unique | Public ID Lookup |
| | `provider: 1`, `providerEventId: 1` | Unique Compound | Prevents Duplicate Webhook Events Processing |
| **chatsessions** | `chatSessionId: 1` | Unique | Public ID Lookup |
| | `normalizedPhone: 1` | Unique | Chat Flow State Mapping |
| **counters** | `counterId: 1` | Unique | Public ID Lookup |
| | `scope: 1` | Unique | Incremental Scopes |

## 5. Required Environment Variables

Add these to your production hosting platform configuration or `.env` file:

```env
# MongoDB Atlas Database URI
MONGODB_URI=mongodb+srv://drmujeeb_admin:YOUR_DATABASE_PASSWORD@drmujeeb.cdsm0ba.mongodb.net/drmujeeb?retryWrites=true&w=majority&appName=DrMujeeb

# Optional Performance settings
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=1
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
MONGODB_CONNECT_RETRIES=3
```
