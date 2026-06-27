import { Router } from "express";
import { DEFAULT_LOCATIONS, DOCTOR, SYSTEM_COPY } from "../config/clinic.js";
import { addAuditLog } from "../services/auditService.js";
import { listLocations, listSchedules, updateSchedule, upsertLocation } from "../services/clinicConfigService.js";
import { getWhatsAppQualitySnapshot, getWhatsAppStatus } from "../services/whatsappService.js";
import { locationSchema, scheduleSchema } from "../utils/validation.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    res.json({
      product: SYSTEM_COPY,
      doctor: DOCTOR,
      defaults: DEFAULT_LOCATIONS.map(({ schedule, ...location }) => ({ ...location, schedule })),
      locations: await listLocations(),
      schedules: await listSchedules(),
      whatsapp: {
        ...getWhatsAppStatus(),
        quality: await getWhatsAppQualitySnapshot()
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/locations", async (_req, res, next) => {
  try {
    res.json({ locations: await listLocations() });
  } catch (error) {
    next(error);
  }
});

router.post("/locations", async (req, res, next) => {
  try {
    const parsed = locationSchema.parse(req.body);
    const location = await upsertLocation("", parsed);
    await addAuditLog({ actor: req.user, action: "Clinic location changed", module: "Settings", targetType: "ClinicLocation", targetId: location.locationId, req });
    res.status(201).json({ location });
  } catch (error) {
    next(error);
  }
});

router.put("/locations/:locationId", async (req, res, next) => {
  try {
    const parsed = locationSchema.partial().parse(req.body);
    const location = await upsertLocation(req.params.locationId, parsed);
    await addAuditLog({ actor: req.user, action: "Clinic location changed", module: "Settings", targetType: "ClinicLocation", targetId: req.params.locationId, req });
    res.json({ location });
  } catch (error) {
    next(error);
  }
});

router.get("/schedules", async (_req, res, next) => {
  try {
    res.json({ schedules: await listSchedules() });
  } catch (error) {
    next(error);
  }
});

router.put("/schedules/:locationId", async (req, res, next) => {
  try {
    const parsed = scheduleSchema.parse(req.body);
    const schedule = await updateSchedule(req.params.locationId, parsed);
    await addAuditLog({ actor: req.user, action: "Clinic timing changed", module: "Settings", targetType: "ScheduleRule", targetId: req.params.locationId, req });
    res.json({ schedule });
  } catch (error) {
    next(error);
  }
});

export default router;
