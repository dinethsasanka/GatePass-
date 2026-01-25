const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Request = require("../models/Request");
const Status = require("../models/Status");
const User = require("../models/User");

dotenv.config();

const findVerifierForOutLocation = async (outLocation) => {
  if (!outLocation) return null;
  return User.findOne({
    role: "Pleader",
    isActive: true,
    branches: { $in: [outLocation] },
  }).lean();
};

const pickVerifierServiceNo = async (request, latestStatus) => {
  return (
    latestStatus?.verifyOfficerServiceNumber ||
    latestStatus?.verifyOfficerServiceNo ||
    request?.verifyOfficerServiceNo ||
    (await findVerifierForOutLocation(request?.outLocation))?.serviceNo ||
    null
  );
};

const inferLoadingTime = (request, latestStatus) => {
  return (
    latestStatus?.updatedAt ||
    latestStatus?.createdAt ||
    request?.updatedAt ||
    request?.createdAt ||
    new Date()
  );
};

const shouldBackfill = (request) => {
  const needsVerify = !request?.verifyOfficerServiceNo;
  const loading = request?.loading;
  const needsLoading =
    !loading ||
    !loading.loadingLocation ||
    !loading.loadingTime ||
    !loading.staffType;

  return { needsVerify, needsLoading };
};

const run = async () => {
  const apply = process.argv.includes("--apply");
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  const cursor = Request.find({}).lean().cursor();

  for await (const request of cursor) {
    scanned += 1;
    const { needsVerify, needsLoading } = shouldBackfill(request);
    if (!needsVerify && !needsLoading) {
      skipped += 1;
      continue;
    }

    const latestStatus = await Status.findOne({
      referenceNumber: request.referenceNumber,
    })
      .sort({ updatedAt: -1 })
      .lean();

    const verifierServiceNo = await pickVerifierServiceNo(
      request,
      latestStatus
    );
    const loadingTime = inferLoadingTime(request, latestStatus);

    const updateDoc = {};

    if (needsVerify && verifierServiceNo) {
      updateDoc.verifyOfficerServiceNo = String(verifierServiceNo).trim();
    }

    if (needsLoading) {
      const loading = request.loading || {};
      updateDoc.loading = {
        loadingType: loading.loadingType || "Loading",
        loadingLocation: loading.loadingLocation || request.outLocation || "N/A",
        loadingTime: loading.loadingTime
          ? new Date(loading.loadingTime)
          : new Date(loadingTime),
        staffType: loading.staffType || "SLT",
        staffServiceNo:
          loading.staffServiceNo ||
          (verifierServiceNo ? String(verifierServiceNo).trim() : undefined),
        nonSLTStaffName: loading.nonSLTStaffName,
        nonSLTStaffCompany: loading.nonSLTStaffCompany,
        nonSLTStaffNIC: loading.nonSLTStaffNIC,
        nonSLTStaffContact: loading.nonSLTStaffContact,
        nonSLTStaffEmail: loading.nonSLTStaffEmail,
      };
    }

    if (apply && Object.keys(updateDoc).length > 0) {
      await Request.updateOne({ _id: request._id }, { $set: updateDoc });
      updated += 1;
    }

    if (scanned % 500 === 0) {
      console.log(
        JSON.stringify(
          {
            scanned,
            updated,
            skipped,
          },
          null,
          2
        )
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        apply,
        scanned,
        updated,
        skipped,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Backfill failed:", err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
