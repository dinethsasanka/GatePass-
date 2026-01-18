// backend/utils/locationRouting.js
const PLeaders = require("../models/PLeaders");
const SecurityOfficers = require("../models/SecurityOfficers");

// Normalize location string (must match how branches are stored)
const norm = (s) =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

async function findAuthoritiesForLocation(locationName) {
  if (!locationName) {
    return { pleaders: [], security: [] };
  }

  const loc = norm(locationName);

  // branches is an ARRAY, so direct equality works (no regex needed)
  const pleaderDocs = await PLeaders.find({ branches: loc })
    .select("employeeNumber")
    .lean();

  const securityDocs = await SecurityOfficers.find({ branches: loc })
    .select("employeeNumber")
    .lean();

  return {
    pleaders: pleaderDocs.map((p) => String(p.employeeNumber)),
    security: securityDocs.map((s) => String(s.employeeNumber)),
  };
}

module.exports = { findAuthoritiesForLocation };
