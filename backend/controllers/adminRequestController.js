const Status = require("../models/Status");
const Request = require("../models/Request");

// map numeric codes to labels
const STATUS_LABEL = { 1: "Pending", 2: "Approved", 3: "Rejected" };

// utility: safe normalize code or label
function codeToLabel(v) {
  if (v == null) return null;
  return STATUS_LABEL[v] || String(v);
}

// Combine all Status docs for a single reference into per-stage summary
function buildStageTimeline(statusDocs) {
  if (!Array.isArray(statusDocs) || statusDocs.length === 0) return null;

  // Oldest → newest by time
  const sorted = [...statusDocs].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return aTime - bTime;
  });

  const baseRequest =
    sorted[sorted.length - 1].request || sorted[0].request || null;

  const timeline = {
    referenceNumber: sorted[0].referenceNumber,
    request: baseRequest,
    executive: { statusCode: null, serviceNo: null, updatedAt: null },
    verify: { statusCode: null, serviceNo: null, updatedAt: null },
    pleader: { statusCode: null, serviceNo: null, updatedAt: null },
    receive: { statusCode: null, serviceNo: null, updatedAt: null },
  };

  sorted.forEach((s) => {
    const ts = s.updatedAt || s.createdAt;

    // Executive stage
    if (s.executiveOfficerStatus != null) {
      timeline.executive.statusCode = s.executiveOfficerStatus;
      timeline.executive.updatedAt = ts;
      if (s.executiveOfficerServiceNo) {
        timeline.executive.serviceNo = String(s.executiveOfficerServiceNo);
      }
    }

    // Verify stage
    if (s.verifyOfficerStatus != null) {
      timeline.verify.statusCode = s.verifyOfficerStatus;
      timeline.verify.updatedAt = ts;
      const svc = s.verifyOfficerServiceNumber || s.verifyOfficerServiceNo;
      if (svc) {
        timeline.verify.serviceNo = String(svc);
      }
    }

    // Pleader / Dispatch stage – inferred from beforeStatus / afterStatus
    // 7 = Pleader Pending, 8 = Pleader Approved, 9 = Pleader Rejected
    // Pleader / Dispatch stage
    // Prefer explicit pleaderStatus / pleaderServiceNo if present
    if (s.pleaderStatus != null) {
      timeline.pleader.statusCode = s.pleaderStatus;
      timeline.pleader.updatedAt = ts;

      if (s.pleaderServiceNo) {
        timeline.pleader.serviceNo = String(s.pleaderServiceNo);
      }
    } else if (
      // Fallback for old rows that only use beforeStatus/afterStatus
      s.beforeStatus === 7 ||
      s.afterStatus === 7 ||
      s.afterStatus === 8 ||
      s.afterStatus === 9
    ) {
      let pleaderCode = null;
      if (s.afterStatus === 8) pleaderCode = 2; // Approved
      else if (s.afterStatus === 9) pleaderCode = 3; // Rejected;
      // If you ever store a pure "pending" Pleader row, map to 1 here.

      if (pleaderCode != null) {
        timeline.pleader.statusCode = pleaderCode;
        timeline.pleader.updatedAt = ts;
        // serviceNo will stay null for old data, which is fine
      }
    }

    // Receive stage – real field on Status schema
    if (s.recieveOfficerStatus != null) {
      timeline.receive.statusCode = s.recieveOfficerStatus;
      timeline.receive.updatedAt = ts;
      const recSvc =
        s.recieveOfficerServiceNumber ||
        s.recieveOfficerServiceNo ||
        s.receiveOfficerServiceNo;
      if (recSvc) {
        timeline.receive.serviceNo = String(recSvc);
      }
    }
  });

  return timeline;
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

    // Get ALL Status docs for this reference (Executive, Verify, Pleader, Receiver)
    const statuses = await Status.find({ referenceNumber })
      .populate("request")
      .sort({ createdAt: 1, updatedAt: 1 })
      .lean();

    if (!statuses || statuses.length === 0) {
      return res.json({ referenceNumber, rows: [] });
    }

    const timeline = buildStageTimeline(statuses);
    if (!timeline) {
      return res.json({ referenceNumber, rows: [] });
    }

    const rows = [
      {
        referenceNumber: timeline.referenceNumber,
        stage: "Executive",
        statusCode: timeline.executive.statusCode,
        status: codeToLabel(timeline.executive.statusCode),
        updatedAt: timeline.executive.updatedAt,
        request: timeline.request,
        actors: {
          executive: timeline.executive.serviceNo || null,
          verify: null,
          pleader: null,
          receive: null,
        },
      },
      {
        referenceNumber: timeline.referenceNumber,
        stage: "Verify",
        statusCode: timeline.verify.statusCode,
        status: codeToLabel(timeline.verify.statusCode),
        updatedAt: timeline.verify.updatedAt,
        request: timeline.request,
        actors: {
          executive: null,
          verify: timeline.verify.serviceNo || null,
          pleader: null,
          receive: null,
        },
      },
      {
        referenceNumber: timeline.referenceNumber,
        stage: "Petrol Leader",
        statusCode: timeline.pleader.statusCode,
        status: codeToLabel(timeline.pleader.statusCode),
        updatedAt: timeline.pleader.updatedAt,
        request: timeline.request,
        actors: {
          executive: null,
          verify: null,
          pleader: timeline.pleader.serviceNo || null,
          receive: null,
        },
      },
      {
        referenceNumber: timeline.referenceNumber,
        stage: "Receive",
        statusCode: timeline.receive.statusCode,
        status: codeToLabel(timeline.receive.statusCode),
        updatedAt: timeline.receive.updatedAt,
        request: timeline.request,
        actors: {
          executive: null,
          verify: null,
          pleader: null,
          receive: timeline.receive.serviceNo || null,
        },
      },
    ];

    return res.json({ referenceNumber, rows });
  } catch (err) {
    console.error("admin byReference error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
