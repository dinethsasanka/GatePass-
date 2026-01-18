// backend/utils/locationResolver.js
const ErpLocation = require("../models/ErpLocation");

// normalize location names (same idea as branchesNorm)
const norm = (s) =>
  String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

/**
 * Resolve a location input into a consistent fingerscan location name.
 *
 * Accepts:
 * - already-a-name: "RTOM GALLE"  -> returns "RTOM GALLE"
 * - an ERP locationId/code: "A001" -> looks up ErpLocation.locationId and returns fingerscanLocation
 */
async function resolveLocationName(input) {
  if (!input) return "";

  const raw = String(input).trim();
  if (!raw) return "";

  // If it already looks like a real location name (contains space), just normalize it
  if (raw.includes(" ")) return norm(raw);

  // Otherwise, try ERP location mapping by locationId
  const doc = await ErpLocation.findOne({ locationId: raw })
    .select({ fingerscanLocation: 1 })
    .lean();

  if (doc?.fingerscanLocation) return norm(doc.fingerscanLocation);

  // fallback: treat it as name anyway
  return norm(raw);
}

module.exports = { resolveLocationName, norm };
