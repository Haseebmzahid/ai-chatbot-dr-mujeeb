import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  KeyRound,
  Languages,
  ListChecks,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle
} from "lucide-react";
import { displayDate, displayLongDate, displayTime, statusClass, todayIso } from "./lib/format.js";

const PRODUCT = "Dr. Mujeeb Ur Rehman WhatsApp AI Appointment Chatbot";
const DOCTOR = "Dr. Mujeeb Ur Rehman";
const CONTACT = "0300-8585508";

const initialData = {
  settings: null,
  appointments: [],
  blockedSlots: [],
  messageLogs: [],
  users: []
};

const navItems = [
  { id: "today", label: "Today's Appointments", icon: Calendar },
  { id: "appointments", label: "All Appointments", icon: ListChecks },
  { id: "add", label: "Add Appointment", icon: Plus },
  { id: "locations", label: "Locations & Timings", icon: MapPin },
  { id: "blocked", label: "Blocked Slots", icon: Ban },
  { id: "logs", label: "WhatsApp Logs", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "users", label: "Staff Users", icon: Users, superOnly: true }
];

function isRtl(language) {
  return language === "ur";
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function isValidPhone(value) {
  const normalized = normalizePhone(value);
  return /^(\+?\d{10,15}|03\d{9})$/.test(normalized);
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJson(response) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(payload?.message || payload || "Request failed.");
    error.details = payload?.details;
    throw error;
  }
  return payload;
}

function EmptyState({ children = "No appointments yet. New WhatsApp bookings will appear here." }) {
  return <div className="empty-state">{children}</div>;
}

function Field({ label, children }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

function Badge({ status }) {
  return <span className={`status-badge ${statusClass(status)}`}>{status || "-"}</span>;
}

export default function App() {
  const isPatientChat = ["/patient-chat", "/whatsapp-chat"].includes(window.location.pathname);
  if (isPatientChat) return <PatientChat />;
  return <AdminApp />;
}

function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem("muj_chatbot_token") || "");
  const [user, setUser] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [view, setView] = useState("today");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const api = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`/api${path}`, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token)
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      return readJson(response);
    },
    [token]
  );

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    const results = await Promise.allSettled([
      api("/settings"),
      api("/appointments"),
      api("/slots/blocked"),
      api("/whatsapp/logs"),
      user?.role === "Super Admin" ? api("/users") : Promise.resolve({ users: [] })
    ]);
    const value = (index, fallback) => (results[index].status === "fulfilled" ? results[index].value : fallback);
    const settings = value(0, {});
    setData({
      settings: settings.product ? settings : null,
      appointments: value(1, {}).appointments || [],
      blockedSlots: value(2, {}).blockedSlots || [],
      messageLogs: value(3, {}).messageLogs || [],
      users: value(4, {}).users || []
    });
  }, [api, token, user?.role]);

  useEffect(() => {
    async function boot() {
      try {
        const statusResponse = await fetch("/api/auth/bootstrap/status");
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setSetupRequired(Boolean(status.setupRequired));
        }
        if (token) {
          const me = await api("/auth/me");
          setUser(me.user);
        }
      } catch {
        localStorage.removeItem("muj_chatbot_token");
        setToken("");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [api, token]);

  useEffect(() => {
    if (user) loadData();
  }, [loadData, user]);

  const login = async (body) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await readJson(response);
    localStorage.setItem("muj_chatbot_token", payload.token);
    setToken(payload.token);
    setUser(payload.user);
    setSetupRequired(false);
    flash(`Signed in as ${payload.user.role}.`);
  };

  const bootstrap = async (body) => {
    const response = await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await readJson(response);
    localStorage.setItem("muj_chatbot_token", payload.token);
    setToken(payload.token);
    setUser(payload.user);
    setSetupRequired(false);
    flash("First Super Admin created.");
  };

  const logout = () => {
    localStorage.removeItem("muj_chatbot_token");
    setToken("");
    setUser(null);
    setData(initialData);
  };

  if (loading) return <LoadingScreen />;
  if (!token || !user) {
    return setupRequired ? <BootstrapScreen onSubmit={bootstrap} /> : <LoginScreen onSubmit={login} />;
  }

  const allowedNav = navItems.filter((item) => !item.superOnly || user.role === "Super Admin");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <MessageCircle size={24} />
          </div>
          <div>
            <strong>{DOCTOR}</strong>
            <span>WhatsApp appointment assistant</span>
          </div>
        </div>
        <nav className="nav-list">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <a className="ghost-link" href="/patient-chat">
          <MessageCircle size={16} />
          Patient chat
        </a>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{PRODUCT}</p>
            <h1>{allowedNav.find((item) => item.id === view)?.label || PRODUCT}</h1>
            <p>{DOCTOR} · {CONTACT}</p>
          </div>
          <div className="topbar-actions">
            {notice && <div className="toast">{notice}</div>}
            <div className="user-pill">
              <span className="avatar small">{user.name?.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </div>
            </div>
            <button className="icon-button" title="Refresh" onClick={loadData}>
              <RefreshCw size={18} />
            </button>
            <button className="icon-button" title="Logout" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <section className="content">
          {view === "today" && <TodayView appointments={data.appointments} />}
          {view === "appointments" && <AppointmentsView appointments={data.appointments} api={api} refresh={loadData} flash={flash} />}
          {view === "add" && <AddAppointmentView settings={data.settings} api={api} refresh={loadData} flash={flash} />}
          {view === "locations" && <LocationsView settings={data.settings} api={api} refresh={loadData} flash={flash} />}
          {view === "blocked" && <BlockedSlotsView settings={data.settings} blockedSlots={data.blockedSlots} api={api} refresh={loadData} flash={flash} />}
          {view === "logs" && <WhatsAppLogsView settings={data.settings} messageLogs={data.messageLogs} api={api} refresh={loadData} flash={flash} />}
          {view === "settings" && <SettingsView settings={data.settings} />}
          {view === "users" && <UsersView users={data.users} api={api} refresh={loadData} flash={flash} />}
        </section>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="loader-panel">
      <RefreshCw className="spin" />
      Loading appointment chatbot...
    </main>
  );
}

function LoginScreen({ onSubmit }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand-mark">
          <MessageCircle size={34} />
        </div>
        <p className="eyebrow">Secure staff access</p>
        <h1>{PRODUCT}</h1>
        <p>Use this panel only for appointments, locations, timings, blocked slots, staff users, and WhatsApp logs.</p>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <div className="login-card-title">
          <LockKeyhole />
          <div>
            <h2>Staff Login</h2>
            <p>No public staff signup is available.</p>
          </div>
        </div>
        <Field label="Email">
          <input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </Field>
        <Field label="Password">
          <input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        </Field>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button">
          <ShieldCheck size={18} />
          Sign In
        </button>
      </form>
    </main>
  );
}

function BootstrapScreen({ onSubmit }) {
  const [form, setForm] = useState({ token: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand-mark">
          <KeyRound size={34} />
        </div>
        <p className="eyebrow">One-time setup</p>
        <h1>Create the first Super Admin</h1>
        <p>This setup works only before any Super Admin exists and requires the private bootstrap token.</p>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <Field label="Bootstrap Token">
          <input value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} required />
        </Field>
        <Field label="Full Name">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </Field>
        <Field label="Strong Password">
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        </Field>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button">
          <ShieldCheck size={18} />
          Create Super Admin
        </button>
      </form>
    </main>
  );
}

function TodayView({ appointments }) {
  const today = todayIso();
  const todaysAppointments = appointments.filter((appointment) => appointment.date === today);
  const active = todaysAppointments.filter((appointment) => ["Booked", "Rescheduled"].includes(appointment.status));
  const visited = todaysAppointments.filter((appointment) => appointment.status === "Visited");
  const cancelled = todaysAppointments.filter((appointment) => appointment.status === "Cancelled");

  return (
    <div className="page-stack">
      <div className="stat-grid">
        <Stat icon={Calendar} label="Today's active appointments" value={active.length} />
        <Stat icon={CheckCircle2} label="Visited" value={visited.length} tone="green" />
        <Stat icon={XCircle} label="Cancelled" value={cancelled.length} tone="red" />
        <Stat icon={Phone} label="Appointment contact" value={CONTACT} tone="blue" />
      </div>
      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <h2>Today's Appointments</h2>
            <p>Only real bookings saved in MongoDB appear here.</p>
          </div>
        </div>
        <AppointmentTable appointments={todaysAppointments} />
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = "" }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-icon">
        <Icon size={21} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AppointmentsView({ appointments, api, refresh, flash }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [reschedule, setReschedule] = useState(null);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return appointments.filter((appointment) => {
      const haystack = [appointment.appointmentId, appointment.patientName, appointment.normalizedPhone, appointment.date, appointment.locationNameEn].join(" ").toLowerCase();
      return (!needle || haystack.includes(needle)) && (!status || appointment.status === status);
    });
  }, [appointments, q, status]);

  const markStatus = async (appointment, nextStatus) => {
    await api(`/appointments/${appointment.appointmentId}/status`, { method: "POST", body: { status: nextStatus } });
    await refresh();
    flash(`Appointment marked ${nextStatus}.`);
  };

  const cancel = async (appointment) => {
    const reason = window.prompt("Cancellation reason");
    if (!reason) return;
    await api("/appointments/cancel", {
      method: "POST",
      body: {
        appointmentId: appointment.appointmentId,
        phone: appointment.normalizedPhone,
        reason
      }
    });
    await refresh();
    flash("Appointment cancelled.");
  };

  return (
    <div className="page-stack">
      <section className="toolbar-panel">
        <div className="search-field">
          <Search size={17} />
          <input value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search appointment ID, name, phone, date, or location" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {["Booked", "Rescheduled", "Visited", "No-Show", "Cancelled"].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </section>
      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <h2>Appointments</h2>
            <p>{filtered.length} record(s)</p>
          </div>
        </div>
        <AppointmentTable
          appointments={filtered}
          actions={(appointment) => (
            <>
              <button title="Reschedule" onClick={() => setReschedule(appointment)}>
                <RefreshCw size={15} />
              </button>
              <button title="Visited" onClick={() => markStatus(appointment, "Visited")}>
                <CheckCircle2 size={15} />
              </button>
              <button title="No-show" onClick={() => markStatus(appointment, "No-Show")}>
                <XCircle size={15} />
              </button>
              <button title="Cancel" onClick={() => cancel(appointment)}>
                <Ban size={15} />
              </button>
            </>
          )}
        />
      </section>
      {reschedule && <RescheduleModal appointment={reschedule} api={api} refresh={refresh} flash={flash} onClose={() => setReschedule(null)} />}
    </div>
  );
}

function AppointmentTable({ appointments, actions }) {
  if (!appointments.length) return <EmptyState />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>ID</th>
            <th>Date</th>
            <th>Time</th>
            <th>Location</th>
            <th>Token</th>
            <th>Status</th>
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.appointmentId}>
              <td>
                <strong>{appointment.patientName}</strong>
                <small>{appointment.maskedPhone || appointment.normalizedPhone}</small>
              </td>
              <td>{appointment.appointmentId}</td>
              <td>{displayDate(appointment.date)}</td>
              <td>{displayTime(appointment.time)}</td>
              <td>{appointment.locationNameEn}</td>
              <td>#{appointment.tokenNumber}</td>
              <td>
                <Badge status={appointment.status} />
              </td>
              {actions && <td className="row-actions">{actions(appointment)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddAppointmentView({ settings, api, refresh, flash }) {
  const locations = settings?.locations || [];
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    age: "",
    gender: "Male",
    city: "",
    reasonForVisit: "",
    locationId: "",
    date: todayIso(),
    time: "",
    source: "Reception"
  });
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.locationId && locations[0]) setForm((current) => ({ ...current, locationId: locations[0].locationId }));
  }, [form.locationId, locations]);

  useEffect(() => {
    async function loadSlots() {
      if (!form.locationId || !form.date) return;
      try {
        const availability = await api(`/slots/availability?locationId=${encodeURIComponent(form.locationId)}&date=${encodeURIComponent(form.date)}`);
        setSlots(availability.availableSlots || []);
        setForm((current) => ({ ...current, time: availability.availableSlots?.[0]?.time || "" }));
      } catch {
        setSlots([]);
      }
    }
    loadSlots();
  }, [api, form.date, form.locationId]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api("/appointments", { method: "POST", body: { ...form, age: Number(form.age), consentAccepted: true } });
      setForm({ ...form, fullName: "", phone: "", age: "", city: "", reasonForVisit: "" });
      await refresh();
      flash("Appointment booked. WhatsApp status is shown in message logs.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="panel wide">
      <div className="panel-heading">
        <div>
          <h2>Manual Appointment</h2>
          <p>Use this when a patient calls reception.</p>
        </div>
      </div>
      <AppointmentForm form={form} setForm={setForm} locations={locations} slots={slots} onSubmit={submit} error={error} />
    </section>
  );
}

function AppointmentForm({ form, setForm, locations, slots, onSubmit, error }) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <Field label="Patient Full Name">
        <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
      </Field>
      <Field label="Phone Number">
        <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
      </Field>
      <Field label="Age">
        <input type="number" min="1" max="120" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} required />
      </Field>
      <Field label="Gender">
        <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>
      </Field>
      <Field label="City">
        <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required />
      </Field>
      <Field label="Clinic Location">
        <select value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })} required>
          {locations.map((location) => (
            <option key={location.locationId} value={location.locationId}>
              {location.nameEn}, {location.city}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Preferred Date">
        <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
      </Field>
      <Field label="Available Time Slot">
        <select value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required>
          {slots.map((slot) => (
            <option key={slot.time} value={slot.time}>
              {displayTime(slot.time)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Reason for Visit">
        <textarea value={form.reasonForVisit} onChange={(event) => setForm({ ...form, reasonForVisit: event.target.value })} rows={4} required />
      </Field>
      {error && <p className="form-error full">{error}</p>}
      <button className="primary-button full">
        <Save size={17} />
        Book Appointment
      </button>
    </form>
  );
}

function RescheduleModal({ appointment, api, refresh, flash, onClose }) {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    appointmentId: appointment.appointmentId,
    phone: appointment.normalizedPhone || "",
    locationId: appointment.locationId,
    date: appointment.date,
    time: appointment.time
  });
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/settings").then(setSettings).catch(() => {});
  }, [api]);

  useEffect(() => {
    if (!form.locationId || !form.date) return;
    api(`/slots/availability?locationId=${encodeURIComponent(form.locationId)}&date=${encodeURIComponent(form.date)}`)
      .then((availability) => setSlots(availability.availableSlots || []))
      .catch(() => setSlots([]));
  }, [api, form.date, form.locationId]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api("/appointments/reschedule", { method: "POST", body: form });
      await refresh();
      flash("Appointment rescheduled.");
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title="Reschedule Appointment" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Appointment ID">
          <input value={form.appointmentId} readOnly />
        </Field>
        <Field label="Phone">
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
        </Field>
        <Field label="Location">
          <select value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })}>
            {(settings?.locations || []).map((location) => (
              <option key={location.locationId} value={location.locationId}>
                {location.nameEn}, {location.city}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        </Field>
        <Field label="Time">
          <select value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })}>
            {slots.map((slot) => (
              <option key={slot.time} value={slot.time}>
                {displayTime(slot.time)}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="form-error full">{error}</p>}
        <button className="primary-button full">Save Reschedule</button>
      </form>
    </Modal>
  );
}

function LocationsView({ settings, api, refresh, flash }) {
  const locations = settings?.locations || [];
  const schedules = settings?.schedules || [];

  return (
    <div className="page-grid">
      {locations.map((location) => (
        <LocationCard key={location.locationId} location={location} schedule={schedules.find((item) => item.locationId === location.locationId)} api={api} refresh={refresh} flash={flash} />
      ))}
    </div>
  );
}

function LocationCard({ location, schedule, api, refresh, flash }) {
  const [form, setForm] = useState(() => ({
    workingDays: schedule?.workingDays || [],
    openingTime: schedule?.openingTime || "09:00",
    closingTime: schedule?.closingTime || "17:00",
    breakStart: schedule?.breakStart || "",
    breakEnd: schedule?.breakEnd || "",
    slotDurationMinutes: schedule?.slotDurationMinutes || 15,
    dailyLimit: schedule?.dailyLimit || 32,
    active: schedule?.active ?? true
  }));
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const toggleDay = (day) => {
    setForm((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day) ? current.workingDays.filter((item) => item !== day) : [...current.workingDays, day]
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    await api(`/settings/schedules/${location.locationId}`, { method: "PUT", body: form });
    await refresh();
    flash("Clinic timing updated.");
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{location.nameEn}</h2>
          <p>{location.addressEn}</p>
        </div>
      </div>
      <form className="form-grid single" onSubmit={submit}>
        <div className="day-toggle-grid">
          {days.map((day) => (
            <button key={day} type="button" className={form.workingDays.includes(day) ? "selected" : ""} onClick={() => toggleDay(day)}>
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        <Field label="Opening Time">
          <input type="time" value={form.openingTime} onChange={(event) => setForm({ ...form, openingTime: event.target.value })} />
        </Field>
        <Field label="Closing Time">
          <input type="time" value={form.closingTime} onChange={(event) => setForm({ ...form, closingTime: event.target.value })} />
        </Field>
        <Field label="Slot Duration Minutes">
          <input type="number" min="5" max="120" value={form.slotDurationMinutes} onChange={(event) => setForm({ ...form, slotDurationMinutes: Number(event.target.value) })} />
        </Field>
        <Field label="Daily Limit">
          <input type="number" min="1" max="200" value={form.dailyLimit} onChange={(event) => setForm({ ...form, dailyLimit: Number(event.target.value) })} />
        </Field>
        <button className="primary-button">
          <Save size={17} />
          Save Timing
        </button>
      </form>
    </section>
  );
}

function BlockedSlotsView({ settings, blockedSlots, api, refresh, flash }) {
  const locations = settings?.locations || [];
  const [form, setForm] = useState({ locationId: "", date: todayIso(), startTime: "", endTime: "", fullDay: true, reason: "" });

  useEffect(() => {
    if (!form.locationId && locations[0]) setForm((current) => ({ ...current, locationId: locations[0].locationId }));
  }, [form.locationId, locations]);

  const submit = async (event) => {
    event.preventDefault();
    await api("/slots/blocked", { method: "POST", body: form });
    setForm({ ...form, reason: "" });
    await refresh();
    flash("Date or slot blocked.");
  };

  const remove = async (blockedSlot) => {
    await api(`/slots/blocked/${blockedSlot.blockedSlotId}`, { method: "DELETE" });
    await refresh();
    flash("Block removed.");
  };

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Block Date or Slot</h2>
            <p>Bookings are denied for blocked dates and time ranges.</p>
          </div>
        </div>
        <form className="form-grid single" onSubmit={submit}>
          <Field label="Location">
            <select value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })}>
              {locations.map((location) => (
                <option key={location.locationId} value={location.locationId}>
                  {location.nameEn}, {location.city}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </Field>
          <label className="check-row">
            <input type="checkbox" checked={form.fullDay} onChange={(event) => setForm({ ...form, fullDay: event.target.checked })} />
            Full day
          </label>
          {!form.fullDay && (
            <>
              <Field label="Start Time">
                <input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
              </Field>
              <Field label="End Time">
                <input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
              </Field>
            </>
          )}
          <Field label="Reason">
            <input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required />
          </Field>
          <button className="primary-button">
            <Ban size={17} />
            Block
          </button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Active Blocks</h2>
        </div>
        <div className="block-list">
          {!blockedSlots.length && <EmptyState>No blocked dates or slots.</EmptyState>}
          {blockedSlots.map((blockedSlot) => (
            <div className="block-item" key={blockedSlot.blockedSlotId}>
              <div>
                <strong>{displayDate(blockedSlot.date)}</strong>
                <small>{blockedSlot.fullDay ? "Full day" : `${displayTime(blockedSlot.startTime)} - ${displayTime(blockedSlot.endTime)}`} · {blockedSlot.reason}</small>
              </div>
              <button className="ghost-button" onClick={() => remove(blockedSlot)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function WhatsAppLogsView({ settings, messageLogs, api, refresh, flash }) {
  const whatsapp = settings?.whatsapp;
  const [manual, setManual] = useState({ phone: "", message: "" });

  const submit = async (event) => {
    event.preventDefault();
    const result = await api("/whatsapp/send", { method: "POST", body: manual });
    setManual({ phone: "", message: "" });
    await refresh();
    flash(result.whatsapp?.sent ? "WhatsApp message sent." : result.whatsapp?.message || result.whatsapp?.error || "WhatsApp message was not sent.");
  };

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>WhatsApp API Status</h2>
            <p>{whatsapp?.configured ? "Connected to WhatsApp Cloud API credentials." : "WhatsApp is not configured yet."}</p>
            {whatsapp?.quality?.warning && <p className="form-error">{whatsapp.quality.warning}</p>}
          </div>
          <Badge status={whatsapp?.configured ? "Configured" : "Not Configured"} />
        </div>
        <form className="form-grid single" onSubmit={submit}>
          <Field label="Phone">
            <input value={manual.phone} onChange={(event) => setManual({ ...manual, phone: event.target.value })} required />
          </Field>
          <Field label="Message">
            <textarea value={manual.message} onChange={(event) => setManual({ ...manual, message: event.target.value })} rows={4} required />
          </Field>
          <button className="primary-button">
            <Send size={17} />
            Send
          </button>
        </form>
      </section>
      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <h2>Message Logs</h2>
            <p>Provider IDs, delivery statuses, and failures are stored here.</p>
          </div>
        </div>
        {!messageLogs.length ? (
          <EmptyState>No WhatsApp messages logged yet.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Direction</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Message</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {messageLogs.map((log) => (
                  <tr key={log.messageLogId}>
                    <td>{log.direction}</td>
                    <td>{log.normalizedPhone}</td>
                    <td>{log.messageType}</td>
                    <td>{log.status}</td>
                    <td className="reason-cell">{log.error || log.messageBody}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsView({ settings }) {
  const whatsapp = settings?.whatsapp;
  return (
    <div className="page-grid">
      <section className="panel">
        <h2>Doctor Details</h2>
        <DetailGrid
          items={[
            ["Doctor", "Dr. Mujeeb Ur Rehman"],
            ["Qualifications", "MBBS, FCPS, MRCS (Edin-UK), Endo-Urology Fellowship"],
            ["Specialty", "Consultant Urologist / Endo-Urologist"],
            ["Contact", CONTACT]
          ]}
        />
      </section>
      <section className="panel">
        <h2>WhatsApp Cloud API</h2>
        <DetailGrid
          items={[
            ["Status", whatsapp?.configured ? "Configured" : "WhatsApp is not configured yet"],
            ["Phone Number ID", whatsapp?.phoneNumberId || "-"],
            ["Business Account ID", whatsapp?.businessAccountId || "-"],
            ["Template: Appointment", whatsapp?.templates?.appointmentConfirmation ? "Configured" : "Missing"],
            ["Template: Reminder", whatsapp?.templates?.appointmentReminder ? "Configured" : "Missing"]
          ]}
        />
      </section>
    </div>
  );
}

function UsersView({ users, api, refresh, flash }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "Receptionist", status: "Active" });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api("/users", { method: "POST", body: form });
      setForm({ name: "", email: "", password: "", role: "Receptionist", status: "Active" });
      await refresh();
      flash("Staff user created.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Create Staff User</h2>
            <p>Only Super Admins can manage staff users.</p>
          </div>
        </div>
        <form className="form-grid single" onSubmit={submit}>
          <Field label="Name">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </Field>
          <Field label="Password">
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option>Receptionist</option>
              <option>Super Admin</option>
            </select>
          </Field>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button">
            <UserPlus size={17} />
            Create User
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Staff Users</h2>
        {!users.length ? (
          <EmptyState>No staff users found.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.userId}>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.role}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PatientChat() {
  const [language, setLanguage] = useState(() => localStorage.getItem("muj_chat_language") || "en");
  const [phone, setPhone] = useState("");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: "welcome",
      from: "bot",
      text: [
        "Welcome to Dr. Mujeeb Ur Rehman's WhatsApp Appointment Assistant. Please select an option.",
        "",
        "ڈاکٹر مجیب الرحمٰن کے واٹس ایپ اپائنٹمنٹ اسسٹنٹ میں خوش آمدید۔ براہِ کرم ایک آپشن منتخب کریں۔",
        "",
        "1. English",
        "2. اردو"
      ].join("\n"),
      timestamp: new Date().toISOString()
    }
  ]);

  useEffect(() => {
    localStorage.setItem("muj_chat_language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl(language) ? "rtl" : "ltr";
  }, [language]);

  const addMessage = (message) => setMessages((current) => [...current, { id: `${Date.now()}-${Math.random()}`, timestamp: new Date().toISOString(), ...message }]);

  const send = async (value) => {
    const message = String(value || input).trim();
    if (!message) return;
    if (!isValidPhone(phone)) {
      addMessage({ from: "bot", text: "Please enter your WhatsApp phone number first.", type: "error" });
      return;
    }
    setInput("");
    addMessage({ from: "patient", text: message });
    setTyping(true);
    try {
      const response = await fetch("/api/public/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message, language })
      });
      const payload = await readJson(response);
      if (payload.reply?.language) setLanguage(payload.reply.language);
      addMessage({ from: "bot", text: payload.reply.text, options: payload.reply.options || [] });
    } catch (err) {
      addMessage({ from: "bot", text: err.message, type: "error" });
    } finally {
      setTyping(false);
    }
  };

  return (
    <main className="patient-chat-page">
      <header className="patient-chat-top">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <MessageCircle size={24} />
          </div>
          <div>
            <strong>{DOCTOR}</strong>
            <span>WhatsApp appointment assistant</span>
          </div>
        </div>
        <div className="patient-top-actions">
          <LanguageSwitch language={language} setLanguage={setLanguage} />
          <a href="/" className="ghost-link">
            Staff Login
          </a>
        </div>
      </header>
      <section className="phone-shell">
        <header className="chat-header">
          <div className="chat-avatar">
            <MessageCircle size={20} />
          </div>
          <div>
            <strong>{DOCTOR}</strong>
            <small>Appointment assistant</small>
          </div>
          <span className="chat-status-dot">Online</span>
        </header>
        <div className="chat-phone-input">
          <Phone size={16} />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Your WhatsApp number" />
          <span className={isValidPhone(phone) ? "phone-valid" : "phone-invalid"}>{isValidPhone(phone) ? "Ready" : "Phone"}</span>
        </div>
        <div className="chat-thread">
          {messages.map((message) => (
            <div key={message.id} className={`chat-message ${message.from} ${message.type || ""}`}>
              <p>{message.text}</p>
              {message.options?.length > 0 && (
                <div className="chat-options">
                  {message.options.map((item) => (
                    <button key={`${message.id}-${item.value}`} type="button" onClick={() => send(item.value)}>
                      <span className="quick-icon">
                        <MessageCircle size={15} />
                      </span>
                      <strong>{item.label}</strong>
                    </button>
                  ))}
                </div>
              )}
              <time>{new Date(message.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
            </div>
          ))}
          {typing && (
            <div className="chat-message bot typing">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
        <form className="chat-compose" onSubmit={(event) => { event.preventDefault(); send(); }}>
          <input value={input} onChange={(event) => setInput(event.target.value)} aria-label={language === "ur" ? "پیغام لکھیں" : "Type a message"} />
          <button className="send-button">
            <Send size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}

function LanguageSwitch({ language, setLanguage }) {
  return (
    <div className="language-selector compact">
      <span className="language-label">
        <Languages size={16} />
        Language
      </span>
      <div className="language-options">
        <button className={language === "en" ? "active" : ""} type="button" onClick={() => setLanguage("en")}>
          English
        </button>
        <button className={language === "ur" ? "active" : ""} type="button" onClick={() => setLanguage("ur")}>
          اردو
        </button>
      </div>
    </div>
  );
}

function DetailGrid({ items }) {
  return (
    <dl className="detail-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}>
            <XCircle size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
