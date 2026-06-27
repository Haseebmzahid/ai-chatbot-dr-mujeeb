import { Router } from "express";
import { addAuditLog } from "../services/auditService.js";
import { createBlockedSlot, getAvailability, getUpcomingAvailableDates, listBlockedSlots, removeBlockedSlot } from "../services/slotService.js";
import { blockedSlotSchema, dateSchema } from "../utils/validation.js";

const router = Router();

router.get("/availability", async (req, res, next) => {
  try {
    const locationId = String(req.query.locationId || "");
    const date = dateSchema.parse(req.query.date);
    const availability = await getAvailability({ locationId, date });
    res.json(availability);
  } catch (error) {
    next(error);
  }
});

router.get("/dates", async (req, res, next) => {
  try {
    const locationId = String(req.query.locationId || "");
    const dates = await getUpcomingAvailableDates(locationId, Number(req.query.count || 6));
    res.json({ dates });
  } catch (error) {
    next(error);
  }
});

router.get("/blocked", async (_req, res, next) => {
  try {
    res.json({ blockedSlots: await listBlockedSlots() });
  } catch (error) {
    next(error);
  }
});

router.post("/blocked", async (req, res, next) => {
  try {
    const parsed = blockedSlotSchema.parse(req.body);
    const blockedSlot = await createBlockedSlot(parsed, req.user);
    await addAuditLog({
      actor: req.user,
      action: "Slot blocked",
      module: "Slots",
      targetType: "BlockedSlot",
      targetId: blockedSlot.blockedSlotId,
      metadata: { date: blockedSlot.date, locationId: blockedSlot.locationId },
      req
    });
    res.status(201).json({ blockedSlot });
  } catch (error) {
    next(error);
  }
});

router.delete("/blocked/:blockedSlotId", async (req, res, next) => {
  try {
    const blockedSlot = await removeBlockedSlot(req.params.blockedSlotId);
    await addAuditLog({
      actor: req.user,
      action: "Slot unblocked",
      module: "Slots",
      targetType: "BlockedSlot",
      targetId: req.params.blockedSlotId,
      req
    });
    res.json({ blockedSlot });
  } catch (error) {
    next(error);
  }
});

export default router;
