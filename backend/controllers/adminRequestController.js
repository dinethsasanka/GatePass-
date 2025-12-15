const Status = require("../models/Status");
const Request = require("../models/Request");

// map numeric codes to labels
const STATUS_LABEL = { 1: "Pending", 2: "Approved", 3: "Rejected" };

// utility: safe normalize code or label
function codeToLabel(v) {
  if (v == null) return null;
  return STATUS_LABEL[v] || String(v);
}

// normalize one Status doc into multiple stage rows
function explodeStages(s) {
  const rows = [];
  const r = s.request || {};

  // Executive
  rows.push({
    referenceNumber: s.referenceNumber,
    stage: "Executive",
    statusCode: s.executiveOfficerStatus ?? null,
    status: codeToLabel(s.executiveOfficerStatus),
    updatedAt: s.updatedAt || s.createdAt,
    request: r,
    actors: {
      executive: String(s.executiveOfficerServiceNo || "") || null,
      verify: null,
      pleader: null,
      receive: null,
    },
  });

  // Verify (note: field sometimes named verifyOfficerServiceNumber in FE)
  rows.push({
    referenceNumber: s.referenceNumber,
    stage: "Verify",
    statusCode: s.verifyOfficerStatus ?? null,
    status: codeToLabel(s.verifyOfficerStatus),
    updatedAt: s.updatedAt || s.createdAt,
    request: r,
    actors: {
      executive: null,
      verify:
        String(
          s.verifyOfficerServiceNo || s.verifyOfficerServiceNumber || ""
        ) || null,
      pleader: null,
      receive: null,
    },
  });

  // Petrol Leader
  rows.push({
    referenceNumber: s.referenceNumber,
    stage: "Petrol Leader",
    statusCode: s.pleaderStatus ?? null,
    status: codeToLabel(s.pleaderStatus),
    updatedAt: s.updatedAt || s.createdAt,
    request: r,
    actors: {
      executive: null,
      verify: null,
      pleader: String(s.pleaderServiceNo || "") || null,
      receive: null,
    },
  });

  // Receive
  rows.push({
    referenceNumber: s.referenceNumber,
    stage: "Receive",
    statusCode: s.receiveStatus ?? null,
    status: codeToLabel(s.receiveStatus),
    updatedAt: s.updatedAt || s.createdAt,
    request: r,
    actors: {
      executive: null,
      verify: null,
      pleader: null,
      receive:
        String(
          s.recieveOfficerServiceNo ||
            s.recieveOfficerServiceNumber ||
            s.receiveOfficerServiceNo ||
            ""
        ) || null,
    },
  });

  return rows;
}

// build filter for list endpoint
function buildStageFilter(stage, statusLabel) {
  if (!stage && !statusLabel) return {};

  const labelToCode = { pending: 1, approved: 2, rejected: 3 };
  const code = statusLabel
    ? labelToCode[String(statusLabel).toLowerCase()]
    : null;

  const fieldByStage = {
    executive: "executiveOfficerStatus",
    verify: "verifyOfficerStatus",
    pleader: "pleaderStatus",
    receive: "receiveStatus",
  };

  const stg = stage ? String(stage).toLowerCase() : null;

  if (stg && code) return { [fieldByStage[stg]]: code };
  if (stg) return { [fieldByStage[stg]]: { $in: [1, 2, 3] } };
  if (code) {
    // search any stage column matching code
    return {
      $or: [
        { executiveOfficerStatus: code },
        { verifyOfficerStatus: code },
        { pleaderStatus: code },
        { receiveStatus: code },
      ],
    };
  }
  return {};
}

exports.listAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "50", 10), 1),
      200
    );
    const skip = (page - 1) * limit;

    const stage = req.query.stage; // executive|verify|pleader|receive (optional)
    const status = req.query.status; // pending|approved|rejected (optional)
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const baseFilter = buildStageFilter(stage, status);

    const dateFilter =
      from || to
        ? {
            updatedAt: {
              ...(from ? { $gte: from } : {}),
              ...(to ? { $lte: to } : {}),
            },
          }
        : {};

    const filter = { ...baseFilter, ...dateFilter };

    const [rows, total] = await Promise.all([
      Status.find(filter)
        .populate("request")
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Status.countDocuments(filter),
    ]);

    const exploded = rows.flatMap(explodeStages);

    // If stage/status filter was applied, keep only matching stage/status in exploded
    const keepStage = stage ? String(stage).toLowerCase() : null;
    const keepStatus = status ? String(status).toLowerCase() : null;

    const filteredExploded = exploded.filter((row) => {
      const okStage =
        !keepStage ||
        (keepStage === "executive" && row.stage === "Executive") ||
        (keepStage === "verify" && row.stage === "Verify") ||
        (keepStage === "pleader" && row.stage === "Petrol Leader") ||
        (keepStage === "receive" && row.stage === "Receive");

      const okStatus =
        !keepStatus || String(row.status || "").toLowerCase() === keepStatus;

      return okStage && okStatus;
    });

    // sort newest-first
    filteredExploded.sort(
      (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    );

    return res.json({
      total,
      page,
      limit,
      rows: filteredExploded,
    });
  } catch (err) {
    console.error("admin listAll error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.byReference = async (req, res) => {
  try {
    const { referenceNumber } = req.params;

    const latest = await Status.findOne({ referenceNumber })
      .populate("request")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    if (!latest) {
      return res.json({ referenceNumber, rows: [] });
    }

    const rows = explodeStages(latest);

    return res.json({
      referenceNumber,
      rows,
    });
  } catch (err) {
    console.error("admin byReference error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
