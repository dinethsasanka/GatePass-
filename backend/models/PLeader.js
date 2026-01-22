// backend/models/PLeader.js
const mongoose = require("mongoose");

// Normalize branch names consistently
function normBranch(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

const PLeaderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // IMPORTANT: matches your MongoDB field
    employeeNumber: { type: String, required: true, trim: true, index: true },

    branches: { type: [String], default: [] },

    // Normalized copy for matching
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
PLeaderSchema.pre("save", function (next) {
  syncBranchesNorm(this);
  next();
});

// On findOneAndUpdate / updateOne / updateMany
async function syncOnUpdate(next) {
  const update = this.getUpdate() || {};

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

PLeaderSchema.pre("findOneAndUpdate", syncOnUpdate);
PLeaderSchema.pre("updateOne", syncOnUpdate);
PLeaderSchema.pre("updateMany", syncOnUpdate);

// IMPORTANT:
// model name: "PLeader" (code reference)
// collection name: "PLeaders" (your real Mongo collection)
const PLeader = mongoose.model("PLeader", PLeaderSchema, "PLeaders");

PLeader.normBranch = normBranch;

module.exports = PLeader;
