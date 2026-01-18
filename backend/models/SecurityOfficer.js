// backend/models/SecurityOfficer.js
const mongoose = require("mongoose");

// Normalize branch names consistently (Option A)
function normBranch(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

const SecurityOfficerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    employeeNumber: { type: String, required: true, trim: true, index: true },

    // Human-readable branch names (same style as PLeaders)
    branches: { type: [String], default: [] },

    // Normalized version for matching
    branchesNorm: { type: [String], default: [], index: true },
  },
  { timestamps: true },
);

function syncBranchesNorm(doc) {
  const b = Array.isArray(doc.branches) ? doc.branches : [];
  const normed = b.map(normBranch).filter(Boolean);

  // de-duplicate while keeping order
  const seen = new Set();
  doc.branchesNorm = normed.filter((x) =>
    seen.has(x) ? false : (seen.add(x), true),
  );
}

// On save()
SecurityOfficerSchema.pre("save", function (next) {
  syncBranchesNorm(this);
  next();
});

// On findOneAndUpdate / updateOne / updateMany
async function syncOnUpdate(next) {
  const update = this.getUpdate() || {};

  // If update uses pipeline, we can’t reliably inspect it here
  if (Array.isArray(update)) return next();

  const $set = update.$set || {};
  const $unset = update.$unset || {};

  const newBranches = Object.prototype.hasOwnProperty.call(update, "branches")
    ? update.branches
    : Object.prototype.hasOwnProperty.call($set, "branches")
      ? $set.branches
      : undefined;

  if (newBranches !== undefined) {
    const b = Array.isArray(newBranches) ? newBranches : [];
    const normed = b.map(normBranch).filter(Boolean);

    const seen = new Set();
    const dedup = normed.filter((x) =>
      seen.has(x) ? false : (seen.add(x), true),
    );

    update.$set = { ...(update.$set || {}), branchesNorm: dedup };
  }

  const branchesUnset =
    Object.prototype.hasOwnProperty.call($unset, "branches") ||
    Object.prototype.hasOwnProperty.call($unset, "branchesNorm");

  if (branchesUnset) {
    update.$set = { ...(update.$set || {}), branchesNorm: [] };
  }

  this.setUpdate(update);
  next();
}

SecurityOfficerSchema.pre("findOneAndUpdate", syncOnUpdate);
SecurityOfficerSchema.pre("updateOne", syncOnUpdate);
SecurityOfficerSchema.pre("updateMany", syncOnUpdate);

// Collection name: adjust if your Mongo collection is named differently.
// If your actual collection is "SecurityOfficers", keep as below:
module.exports = mongoose.model(
  
  "SecurityOfficers",
  SecurityOfficerSchema
);

module.exports.normBranch = normBranch;
