const PLeaders = require("../models/PLeader");
const SecurityOfficers = require("../models/SecurityOfficer");

// normalize helper (must match how branchesNorm was created)
const norm = (s) =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

async function findAuthoritiesForLocation(locationName) {
  if (!locationName) {
    return { pleaders: [], security: [] };
  }

  const locNorm = norm(locationName);

  // ✅ use branchesNorm (array) for exact match
  const pleaders = await PLeaders.find({
    branchesNorm: locNorm,
  })
    .select({ employeeNumber: 1 })
    .lean();

  const security = await SecurityOfficers.find({
    branchesNorm: locNorm,
  })
    .select({ employeeNumber: 1 })
    .lean();

  return {
    pleaders: pleaders.map((p) => String(p.employeeNumber).trim()),
    security: security.map((s) => String(s.employeeNumber).trim()),
  };
}

module.exports = { findAuthoritiesForLocation };
