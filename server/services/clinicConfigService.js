import { DEFAULT_LOCATIONS, DOCTOR } from "../config/clinic.js";
import { models } from "../models/index.js";
import { makePublicId } from "../utils/time.js";

export async function ensureClinicConfiguration() {
  await Promise.all(Object.values(models).map((model) => model.init()));

  for (const item of DEFAULT_LOCATIONS) {
    let location = await models.ClinicLocation.findOne({ slug: item.slug });
    if (!location) {
      location = await models.ClinicLocation.create({
        locationId: makePublicId("LOC"),
        slug: item.slug,
        nameEn: item.nameEn,
        nameUr: item.nameUr,
        addressEn: item.addressEn,
        addressUr: item.addressUr,
        city: item.city,
        phone: item.phone,
        googleMapLink: item.googleMapLink,
        active: item.active
      });
    }

    const existingRule = await models.ScheduleRule.findOne({ locationId: location.locationId });
    if (!existingRule) {
      await models.ScheduleRule.create({
        ruleId: makePublicId("SCH"),
        locationId: location.locationId,
        ...item.schedule
      });
    }
  }
}

export async function listLocations({ activeOnly = false } = {}) {
  const query = activeOnly ? { active: true } : {};
  return models.ClinicLocation.find(query).sort({ createdAt: 1 }).lean();
}

export async function getLocation(locationId) {
  return models.ClinicLocation.findOne({ locationId, active: true }).lean();
}

export async function upsertLocation(locationId, payload) {
  if (locationId) {
    return models.ClinicLocation.findOneAndUpdate({ locationId }, payload, { returnDocument: "after" }).lean();
  }
  return models.ClinicLocation.create({
    locationId: makePublicId("LOC"),
    slug: payload.slug || makePublicId("clinic").toLowerCase(),
    ...payload
  });
}

export async function listSchedules() {
  return models.ScheduleRule.find({ active: true }).sort({ createdAt: 1 }).lean();
}

export async function getScheduleForLocation(locationId) {
  return models.ScheduleRule.findOne({ locationId, active: true }).lean();
}

export async function updateSchedule(locationId, payload) {
  return models.ScheduleRule.findOneAndUpdate(
    { locationId },
    { ...payload, locationId, timezone: payload.timezone || "Asia/Karachi" },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  ).lean();
}

export function doctorProfile() {
  return DOCTOR;
}
