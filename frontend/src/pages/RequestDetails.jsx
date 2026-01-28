import React, { useState, useEffect, useMemo } from "react";
import {
  getAdminRequests,
  getAdminRequestsByRef,
} from "../services/adminRequestService.js";
import { useToast } from "../components/ToastProvider.jsx";
import {
  FaSearch,
  FaSync,
  FaInfoCircle,
  FaEye,
  FaBoxOpen,
  FaUser,
  FaMapMarkerAlt,
  FaUserCheck,
  FaTimes,
  FaTruck,
  FaFilePdf,
} from "react-icons/fa";
import {
  getImageUrlSync,
  searchReceiverByServiceNo,
  searchEmployeeByServiceNo,
  getGatePassRequest,
} from "../services/RequestService.js";
import { jsPDF } from "jspdf";
import logoUrl from "../assets/SLTMobitel_Logo.png";
import { searchSenderByServiceNo } from "../services/RequestService.js";

const STAGE_ORDER = ["Executive", "Verify", "Petrol Leader", "Receive"];

const normalize = (v) => (v || "").toString().trim().toLowerCase();

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const getStatusClass = (status = "") => {
  const baseStyles =
    "inline-block px-3 py-1.5 rounded-full text-xl font-semibold leading-none";

  if (status.includes("Pending"))
    return `${baseStyles} bg-amber-100 text-amber-800`;

  if (status.includes("Approved"))
    return `${baseStyles} bg-emerald-100 text-emerald-800`;

  if (status.includes("Rejected"))
    return `${baseStyles} bg-rose-100 text-rose-800`;

  return `${baseStyles} bg-gray-100 text-gray-800`;
};

//  PDF-only status class helper (DO NOT use Tailwind here)
const getPdfStatusClass = (status = "") => {
  if (status.includes("Approved")) return "status status-approved";
  if (status.includes("Rejected")) return "status status-rejected";
  return "status status-pending";
};

const mapErpEmployeeToReceiver = (employee, fallbackServiceNo) => {
  if (!employee) return null;

  return {
    name: `${employee.employeeTitle || ""} ${
      employee.employeeFirstName || ""
    } ${employee.employeeSurname || ""}`.trim(),
    serviceNo: employee.employeeNo || fallbackServiceNo || "N/A",
    designation: employee.designation || "-",
    section: employee.empSection || "-",
    group: employee.empGroup || "-",
    contactNo: employee.mobileNo || "-",
  };
};

// ----------------------------------------------------
// Image Viewer Modal
// ----------------------------------------------------
const ImageViewerModal = ({ images, isOpen, onClose, itemDescription }) => {
  const [imageUrls, setImageUrls] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (images && images.length > 0) {
      setLoading(true);

      const urls = images
        .slice(0, 5)
        .map((img) => getImageUrlSync(img))
        .filter(Boolean);

      setImageUrls(urls);
      setLoading(false);
    } else {
      setImageUrls([]);
      setLoading(false);
    }
  }, [images]);

  if (!isOpen) return null;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-gray-700">
        <div className="relative">
          <div className="h-80 md:h-96 overflow-hidden relative bg-black">
            {imageUrls.length > 0 && (
              <img
                src={imageUrls[activeIndex]}
                alt={`${itemDescription} ${activeIndex + 1}`}
                className="w-full h-full object-contain"
              />
            )}

            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all"
                >
                  ‹
                </button>

                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all"
                >
                  ›
                </button>
              </>
            )}

            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {imageUrls.length > 0
                ? `${activeIndex + 1} / ${imageUrls.length}`
                : "0 / 0"}
            </div>
          </div>

          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">
                {itemDescription}
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-white/80 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 flex justify-center gap-2 bg-gray-900">
          {imageUrls.map((url, index) => (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-16 h-16 rounded-lg overflow-hidden cursor-pointer transition-all transform hover:scale-105 ${
                index === activeIndex
                  ? "ring-2 ring-blue-500 scale-105"
                  : "opacity-70"
              }`}
            >
              <img
                src={url}
                alt={`${itemDescription} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const getOfficerStatusLabel = (stage, statusCode) => {
  if (!statusCode) return "Pending";

  switch (stage) {
    case "Executive":
      if (statusCode === 3) return "Rejected";
      if (statusCode >= 2) return "Approved";
      return "Pending";

    case "Verify": // sender-side pleader
      if (statusCode === 6) return "Rejected";
      if (statusCode >= 5) return "Approved";
      return "Pending";

    case "PetrolLeader": // receiver-side pleader
      if (statusCode === 9) return "Rejected";
      if (statusCode >= 8) return "Approved";
      return "Pending";

    case "Receive":
      if (statusCode === 12) return "Rejected";
      if (statusCode >= 11) return "Approved";
      return "Pending";

    default:
      return "Pending";
  }
};

// ----------------------------------------------------
// Request Details Modal
// ----------------------------------------------------
const RequestDetailsModal = ({
  isOpen,
  onClose,
  request,
  user,
  receiver,
  transporterDetails,
  fullRequest,
  fullRequestLoading,
}) => {
  const { showToast } = useToast();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedDESCRIPTIONImages, setSelectedDESCRIPTIONImages] = useState(
    [],
  );
  const [selecteditemDescription, setSelecteditemDescription] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!isOpen || !request) return null;

  const handleViewImages = (item) => {
    setSelectedDESCRIPTIONImages(item.itemPhotos || []);
    setSelecteditemDescription(item.itemDescription || "");
    setIsImageModalOpen(true);
  };

  // helper: treat statusCode 2/3 as completed
  const isCompleted = (statusCode) => statusCode === 2 || statusCode === 3;

  // Build all officer details (executive, verify, pleaders, receiver) and call printReport
  const handleGenerateAdminPdf = async () => {
    try {
      setPdfLoading(true);

      // 1) Get admin rows for this reference (includes stage + actors)
      const admin = await getAdminRequestsByRef(request.referenceNumber);
      const rowsByRef = Array.isArray(admin.rows) ? admin.rows : [];
      const statusDetails = admin.statusDetails || {};
      const baseRequest = rowsByRef[0]?.request || request || {};
      const statusCode = baseRequest.status;

      console.log("ADMIN REF DATA", admin);
      console.log("ROWS BY REF", rowsByRef);
      console.log(
        "ROW STAGES + ACTORS",
        rowsByRef.map((r) => ({ stage: r.stage, actors: r.actors })),
      );
      console.log("STATUS DETAILS", statusDetails);

      // helper: row for a given stage
      const getStageRow = (stageName) =>
        rowsByRef.find((r) => r.stage === stageName) || {};

      // helper: pull *some* service number out of row.actors,
      const extractServiceNo = (row) => {
        if (!row || !row.actors) return null;

        const stack = Object.values(row.actors);

        while (stack.length) {
          const value = stack.pop();

          // direct serviceNo string
          if (typeof value === "string") {
            return value;
          }

          // nested object (very common in your backend)
          if (value && typeof value === "object") {
            Object.values(value).forEach((v) => stack.push(v));
          }
        }

        return null;
      };

      // 2) Work out service numbers for each role

      // Executive
      const execSvc =
        statusDetails.executiveOfficerServiceNo ||
        baseRequest.executiveOfficerServiceNo ||
        extractServiceNo(getStageRow("Executive"));

      // Sender-side pleader (Verify stage)
      const verifySvc =
        statusDetails.verifyOfficerServiceNo ||
        extractServiceNo(getStageRow("Verify"));

      // Receiver-side pleader (Petrol Leader stage)
      const pleaderSvc =
        statusDetails.petrolLeaderServiceNo ||
        extractServiceNo(getStageRow("Petrol Leader"));

      // Final receiver officer (Receive stage / receiverServiceNo)
      const receiverOfficerSvc =
        statusDetails.recieveOfficerServiceNo ||
        statusDetails.recieveOfficerServiceNumber ||
        baseRequest.receiverServiceNo ||
        extractServiceNo(getStageRow("Receive"));

      const getEmployee = async (svc) => {
        if (!svc) return null;
        try {
          return await searchReceiverByServiceNo(svc);
        } catch {
          return null;
        }
      };
      console.log("VERIFY STAGE ACTORS:", getStageRow("Verify")?.actors);
      console.log("PETROL STAGE ACTORS:", getStageRow("Petrol Leader")?.actors);
      console.log("VERIFY SVC:", verifySvc);
      console.log("PETROL SVC:", pleaderSvc);

      const [
        executiveOfficerData,
        verifyOfficerData,
        pleaderOfficerData,
        receiverOfficerData,
      ] = await Promise.all([
        getEmployee(execSvc),
        getEmployee(verifySvc),
        getEmployee(pleaderSvc),
        getEmployee(receiverOfficerSvc),
      ]);

      // 4) Build uniform officer objects with "N/A" fallbacks
      const buildOfficer = (data, svc) => ({
        serviceNo: data?.serviceNo || svc || "N/A",
        name: data?.name || "N/A",
        section: data?.section || "N/A",
        group: data?.group || "N/A",
        designation: data?.designation || "N/A",
        contactNo: data?.contactNo || "N/A",
      });

      const senderDetails = {
        serviceNo: user?.serviceNo || baseRequest.employeeServiceNo || "N/A",
        name: user?.name || "N/A",
        section: user?.section || "N/A",
        group: user?.group || "N/A",
        designation: user?.designation || "N/A",
        contactNo: user?.contactNo || "N/A",
      };

      const receiverDetails = request.isNonSltPlace
        ? {
            name: request.receiverName || "N/A",
            nic: request.receiverNIC || "N/A",
            contactNo: request.receiverContact || "N/A",
            companyName: request.companyName || "N/A",
          }
        : {
            serviceNo:
              receiver?.serviceNo || baseRequest.receiverServiceNo || "N/A",
            name: receiver?.name || "N/A",
            section: receiver?.section || "N/A",
            group: receiver?.group || "N/A",
            designation: receiver?.designation || "N/A",
            contactNo: receiver?.contactNo || "N/A",
          };

      const reportData = {
        refNo: baseRequest.referenceNumber || request.referenceNumber,

        senderDetails,
        receiverDetails,

        outLocation: baseRequest.outLocation,
        inLocation: baseRequest.inLocation,
        items: baseRequest.items || [],
        transportData: baseRequest.transport || {},
        requestDetails: baseRequest,
        statusDetails,

        executiveOfficerData: {
          ...buildOfficer(executiveOfficerData, execSvc),
          approvalStatus: getOfficerStatusLabel("Executive", statusCode),
        },

        verifyOfficerData: {
          ...buildOfficer(verifyOfficerData, verifySvc),
          approvalStatus: getOfficerStatusLabel("Verify", statusCode),
        },

        pleaderOfficerData: {
          ...buildOfficer(pleaderOfficerData, pleaderSvc),
          approvalStatus: getOfficerStatusLabel("PetrolLeader", statusCode),
        },

        receiverOfficerData: {
          ...buildOfficer(receiverOfficerData, receiverOfficerSvc),
          approvalStatus: getOfficerStatusLabel("Receive", statusCode),
        },
      };

      console.log("PRINT REPORT DATA", reportData);
      console.log("EXECUTIVE OFFICER DATA", reportData.executiveOfficerData);
      console.log("VERIFY OFFICER DATA", reportData.verifyOfficerData);
      console.log("PLEADER OFFICER DATA", reportData.pleaderOfficerData);
      console.log("RECEIVER OFFICER DATA", reportData.receiverOfficerData);

      // 5) Actually render the PDF
      printReport(reportData);
      showToast("PDF generated successfully!", "success");
    } catch (err) {
      console.error("Failed to generate admin PDF:", err);
      showToast(
        "Failed to generate PDF: " + (err.message || "Unknown error"),
        "error",
      );
    } finally {
      setPdfLoading(false);
    }
  };

  // ------------- PRINT REPORT (single data object) -------------
  const printReport = (reportData) => {
    try {
      const data = reportData || {};

      console.log("PRINT REPORT DATA", data);
      console.log("EXECUTIVE OFFICER DATA", data.executiveOfficerData);
      console.log("VERIFY OFFICER DATA", data.verifyOfficerData);
      console.log("SENDER PLEADER DATA", data.senderPleaderData);
      console.log("RECEIVER PLEADER DATA", data.receiverPleaderData);

      // Core request = the Mongo document (outLocation, inLocation, items, loading, etc.)
      const coreReq = data.requestDetails || data;

      const transport = data.transportData || coreReq.transport || {};
      const exec = data.executiveOfficerData || {};
      const verify = data.verifyOfficerData || {};
      const statusDetails = data.statusDetails || {};

      const refNo =
        data.refNo || data.referenceNumber || coreReq.referenceNumber || "N/A";
      const sender = data.senderDetails || {};
      const rec = data.receiverDetails || {};
      const pleader = data.pleaderOfficerData || {};
      const receiverOfficer = data.receiverOfficerData || {};

      const items = coreReq.items || [];

      const printFrame = document.createElement("iframe");
      printFrame.style.position = "absolute";
      printFrame.style.top = "-9999px";
      printFrame.style.left = "-9999px";
      printFrame.style.width = "1px";
      printFrame.style.height = "1px";
      document.body.appendChild(printFrame);

      const doc =
        printFrame.contentDocument || printFrame.contentWindow.document;

      // Build small sections as strings to keep template clean
      let transportExtra = "";
      if (transport.transporterType === "SLT") {
        transportExtra = `
        <div class="item"><span class="label">Transporter:</span> ${
          transporterDetails?.name || "N/A"
        }</div>
        <div class="item"><span class="label">Service No:</span> ${
          transporterDetails?.serviceNo || "N/A"
        }</div>
        <div class="item"><span class="label">Contact:</span> ${
          transporterDetails?.contactNo || "N/A"
        }</div>
        <div class="item"><span class="label">Section:</span> ${
          transporterDetails?.section || "N/A"
        }</div>
        <div class="item"><span class="label">Vehicle No:</span> ${
          transport.vehicleNumber || "N/A"
        }</div>
        <div class="item"><span class="label">Vehicle Item Code:</span> ${
          transport.vehicleModel || "N/A"
        }</div>
      `;
      } else {
        transportExtra = `
        <div class="item"><span class="label">Transporter:</span> ${
          transport.nonSLTTransporterName || "N/A"
        }</div>
        <div class="item"><span class="label">NIC:</span> ${
          transport.nonSLTTransporterNIC || "N/A"
        }</div>
        <div class="item"><span class="label">Phone:</span> ${
          transport.nonSLTTransporterPhone || "N/A"
        }</div>
        <div class="item"><span class="label">Email:</span> ${
          transport.nonSLTTransporterEmail || "N/A"
        }</div>
        <div class="item"><span class="label">Vehicle No:</span> ${
          transport.vehicleNumber || "N/A"
        }</div>
        <div class="item"><span class="label">Vehicle Item Code:</span> ${
          transport.vehicleModel || "N/A"
        }</div>
      `;
      }

      const itemsRows =
        items.length === 0
          ? "<tr><td colspan='5'>No items</td></tr>"
          : items
              .map(
                (it) => `
            <tr>
              <td>${it?.itemDescription || "-"}</td>
              <td>${it?.serialNumber || "-"}</td>
              <td>${it?.categoryDescription || "-"}</td>
              <td>${it?.itemQuantity || "-"}</td>
              <td>${it?.itemCode || "-"}</td>
            </tr>`,
              )
              .join("");

      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SLT Gate Pass - ${refNo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .logo { max-height: 60px; margin-bottom: 10px; }
            .title { font-size: 24px; color: #003399; margin: 0; }
            .ref { font-size: 14px; color: #666; margin: 5px 0; }
            .date { font-size: 12px; color: #888; margin: 5px 0 15px; }
            .section { margin-bottom: 20px; }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              padding-bottom: 5px;
              border-bottom: 1px solid #eee;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .item { margin-bottom: 5px; }
            .itemComm {
    margin-bottom: 12px;
    
  }

            .label { font-weight: bold; color: #555; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            th, td {
              padding: 8px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #999;
            }
            @media print {
              body { margin: 0; padding: 15px; }
            }
              .status {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 16px;
    font-weight: bold;
  }

  .status-pending {
    background-color: #FEF3C7; /* amber-100 */
    color: #92400E;
  }

  .status-approved {
    background-color: #D1FAE5; /* emerald-100 */
    color: #065F46;
  }

  .status-rejected {
    background-color: #FFE4E6; /* rose-100 */
    color: #9F1239;
  }

          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" alt="SLT Logo" class="logo" />
            <h1 class="title">SLT Gate Pass</h1>
            <p class="ref">Reference: ${refNo}</p>
            <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
    <h2 class="section-title">Sender Details</h2>
    <div class="grid">
      <div class="item"><span class="label">Name:</span> ${
        sender.name || "N/A"
      }</div>
      <div class="item"><span class="label">Service No:</span> ${
        sender.serviceNo || "N/A"
      }</div>
      <div class="item"><span class="label">Section:</span> ${
        sender.section || "N/A"
      }</div>
      <div class="item"><span class="label">Group:</span> ${
        sender.group || "N/A"
      }</div>
      <div class="item"><span class="label">Designation:</span> ${
        sender.designation || "N/A"
      }</div>
      <div class="item"><span class="label">Contact:</span> ${
        sender.contactNo || "N/A"
      }</div>
    </div>
  </div>

          <div class="section">
            <h2 class="section-title">Location Details</h2>
            <div class="grid">
              <div class="item"><span class="label">From:</span> ${
                coreReq.outLocation || "N/A"
              }</div>
              <div class="item"><span class="label">To:</span> ${
                coreReq.inLocation || "N/A"
              }</div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Transport Details</h2>
            <div class="grid">
              <div class="item"><span class="label">Method:</span> ${
                transport.transportMethod || "N/A"
              }</div>
              <div class="item"><span class="label">Type:</span> ${
                transport.transporterType || "N/A"
              }</div>
              ${transportExtra}
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Executive Officer Details</h2>
            <div class="grid">
              <div class="item"><span class="label">Name:</span> ${
                exec.name || "N/A"
              }</div>
              <div class="item"><span class="label">Service No:</span> ${
                exec.serviceNo || "N/A"
              }</div>
              <div class="item"><span class="label">Section:</span> ${
                exec.section || "N/A"
              }</div>
              <div class="item"><span class="label">Group:</span> ${
                exec.group || "N/A"
              }</div>
              <div class="item"><span class="label">Designation:</span> ${
                exec.designation || "N/A"
              }</div>
              <div class="item"><span class="label">Contact:</span> ${
                exec.contactNo || "N/A"
              }</div>
              <div class="item">
    <span class="label">Status:</span>
    <span class="${getPdfStatusClass(exec.approvalStatus)}">
    ${exec.approvalStatus || "Pending"}
  </span>

  </div>


              <div class="itemComm"><span class="label">Executive Officer Comment:</span> ${
                statusDetails.executiveOfficerComment || "N/A"
              }</div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Requester Side Patrol Leader Details</h2>
            <div class="grid">
              <div class="item"><span class="label">Name:</span> ${
                verify.name || "N/A"
              }</div>
              <div class="item"><span class="label">Service No:</span> ${
                verify.serviceNo || "N/A"
              }</div>
              <div class="item"><span class="label">Section:</span> ${
                verify.section || "N/A"
              }</div>
              <div class="item"><span class="label">Group:</span> ${
                verify.group || "N/A"
              }</div>
              <div class="item"><span class="label">Designation:</span> ${
                verify.designation || "N/A"
              }</div>
              <div class="item"><span class="label">Contact:</span> ${
                verify.contactNo || "N/A"
              }</div>
              <div class="item">
    <span class="label">Status:</span>
    <span class="${getPdfStatusClass(verify.approvalStatus)}">
    ${verify.approvalStatus || "Pending"}
  </span>
  </div>


              <div class="item"><span class="label">Verify Officer Comment:</span> ${
                statusDetails.verifyOfficerComment || "N/A"
              }</div>
            </div>
          </div>

          <div class="section">
    <h2 class="section-title">Pleader Officer Details</h2>
    <div class="grid">
      <div class="item"><span class="label">Name:</span> ${
        pleader.name || "N/A"
      }</div>
      <div class="item"><span class="label">Service No:</span> ${
        pleader.serviceNo || "N/A"
      }</div>
      <div class="item"><span class="label">Section:</span> ${
        pleader.section || "N/A"
      }</div>
      <div class="item"><span class="label">Group:</span> ${
        pleader.group || "N/A"
      }</div>
      <div class="item"><span class="label">Designation:</span> ${
        pleader.designation || "N/A"
      }</div>
      <div class="item"><span class="label">Contact:</span> ${
        pleader.contactNo || "N/A"
      }</div>
      <div class="item">
    <span class="label">Status:</span>
    <span class="${getPdfStatusClass(pleader.approvalStatus)}">
    ${pleader.approvalStatus || "Pending"}
  </span>
  </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Receiver Details</h2>
    <div class="grid">
      <div class="item"><span class="label">Name:</span> ${
        receiverOfficer.name || "N/A"
      }</div>
      <div class="item"><span class="label">Service No:</span> ${
        receiverOfficer.serviceNo || "N/A"
      }</div>
      <div class="item"><span class="label">Section:</span> ${
        receiverOfficer.section || "N/A"
      }</div>
      <div class="item"><span class="label">Group:</span> ${
        receiverOfficer.group || "N/A"
      }</div>
      <div class="item"><span class="label">Designation:</span> ${
        receiverOfficer.designation || "N/A"
      }</div>
      <div class="item"><span class="label">Contact:</span> ${
        receiverOfficer.contactNo || "N/A"
      }</div>
      <div class="item">
    <span class="label">Status:</span>
    <span class="${getPdfStatusClass(receiverOfficer.approvalStatus)}">
    ${receiverOfficer.approvalStatus || "Pending"}
  </span>

  </div>


    </div>
  </div>


          <div class="section">
            <h2 class="section-title">items</h2>
            <table>
              <thead>
                <tr>
                  <th>item Name</th>
                  <th>Serial Number</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Item Code</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <div class="footer">
            This is an electronically generated document and does not require signature.
          </div>
        </body>
        </html>
      `);

      doc.close();

      // Add error handling for iframe loading
      printFrame.onload = function () {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 1000);
        } catch (error) {
          console.error("Print failed:", error);
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
          // Fallback to jsPDF
          generateDESCRIPTIONPdfFallback();
        }
      };

      // Handle iframe load errors
      printFrame.onerror = function (error) {
        console.error("Iframe load error:", error);
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
        // Fallback to jsPDF
        generateDESCRIPTIONPdfFallback();
      };

      // Timeout fallback
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          console.warn("Print timeout, falling back to jsPDF");
          document.body.removeChild(printFrame);
          generateDESCRIPTIONPdfFallback();
        }
      }, 5000);
    } catch (error) {
      console.error("Print report failed:", error);
      // Fallback to jsPDF
      generateDESCRIPTIONPdfFallback();
    }
  };

  // Alternative PDF generation using jsPDF as fallback
  const generateDESCRIPTIONPdfFallback = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;

      // Add logo if available
      try {
        doc.addImage(logoUrl, "PNG", margin, 10, 40, 20);
      } catch (error) {
        console.warn("Could not add logo to PDF:", error);
      }

      // Title
      doc.setFontSize(18);
      doc.setTextColor(0, 51, 153);
      doc.text("SLT Gate Pass - Request Details", pageWidth / 2, 20, {
        align: "center",
      });

      // Reference number
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Reference: ${request.referenceNumber}`, pageWidth / 2, 30, {
        align: "center",
      });

      // Date
      const currentDate = new Date().toLocaleDateString();
      doc.setFontSize(10);
      doc.text(`Generated on: ${currentDate}`, pageWidth - margin, 20, {
        align: "right",
      });

      // Line separator
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, 35, pageWidth - margin, 35);

      let yPos = 50;

      // Sender Details Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Sender Details", margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const senderInfo = [
        `Name: ${user?.name || "N/A"}`,
        `Service No: ${user?.serviceNo || request?.employeeServiceNo || "N/A"}`,
        `Section: ${user?.section || "N/A"}`,
        `Group: ${user?.group || "N/A"}`,
        `Designation: ${user?.designation || "N/A"}`,
        `Contact: ${user?.contactNo || "N/A"}`,
      ];

      senderInfo.forEach((info) => {
        doc.text(info, margin, yPos);
        yPos += 6;
      });

      yPos += 5;

      // Location Details Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Location Details", margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const locationInfo = [
        `From: ${request?.outLocation || "N/A"}`,
        `To: ${request?.inLocation || "N/A"}`,
      ];

      if (request?.isNonSltPlace) {
        locationInfo.push(`Company: ${request?.companyName || "N/A"}`);
        locationInfo.push(`Address: ${request?.companyAddress || "N/A"}`);
      }

      locationInfo.forEach((info) => {
        doc.text(info, margin, yPos);
        yPos += 6;
      });

      yPos += 10;

      // items Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("items", margin, yPos);
      yPos += 10;

      // items table headers
      doc.setFontSize(9);
      doc.setFillColor(240, 240, 240);
      const tableStartY = yPos;
      const colWidths = [50, 30, 30, 20, 40];
      let xPos = margin;

      // Draw header background
      doc.rect(
        margin,
        yPos,
        colWidths.reduce((a, b) => a + b, 0),
        8,
        "F",
      );

      // Header text
      doc.text("item Name", xPos + 2, yPos + 5.5);
      xPos += colWidths[0];
      doc.text("Serial Number", xPos + 2, yPos + 5.5);
      xPos += colWidths[1];
      doc.text("Category", xPos + 2, yPos + 5.5);
      xPos += colWidths[2];
      doc.text("Qty", xPos + 2, yPos + 5.5);
      xPos += colWidths[3];
      doc.text("Item Code", xPos + 2, yPos + 5.5);

      yPos += 8;

      // items data
      request.items?.forEach((item, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        // Alternate row background
        if (index % 2 === 1) {
          doc.setFillColor(248, 248, 248);
          doc.rect(
            margin,
            yPos,
            colWidths.reduce((a, b) => a + b, 0),
            8,
            "F",
          );
        }

        xPos = margin;
        doc.text(item?.itemDescription || "N/A", xPos + 2, yPos + 5.5);
        xPos += colWidths[0];
        doc.text(item?.serialNumber || "N/A", xPos + 2, yPos + 5.5);
        xPos += colWidths[1];
        doc.text(item?.categoryDescription || "N/A", xPos + 2, yPos + 5.5);
        xPos += colWidths[2];
        doc.text(item?.itemQuantity?.toString() || "1", xPos + 2, yPos + 5.5);
        xPos += colWidths[3];
        doc.text(item?.itemCode || "N/A", xPos + 2, yPos + 5.5);

        yPos += 8;
      });

      // Footer
      const footerYPos = doc.internal.pageSize.getHeight() - 10;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "This is an electronically generated document.",
        pageWidth / 2,
        footerYPos,
        { align: "center" },
      );

      // Save the PDF
      doc.save(`SLT_GatePass_${request.referenceNumber}.pdf`);
      showToast("PDF downloaded successfully!", "success");
    } catch (error) {
      console.error("PDF generation failed:", error);
      showToast("Failed to generate PDF: " + error.message, "error");
    }
  };

  // (Optional) keep this helper if you want separate item-only PDFs
  const generateDESCRIPTIONDetailsPDF = (itemsForPdf, refNo) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    try {
      doc.addImage(logoUrl, "PNG", margin, 10, 40, 20);
    } catch (error) {
      console.error("Error adding logo:", error);
    }

    doc.setFontSize(18);
    doc.setTextColor(0, 51, 153);
    doc.text("SLT Gate Pass - item Details", pageWidth / 2, 20, {
      align: "center",
    });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Reference: ${refNo}`, pageWidth / 2, 30, {
      align: "center",
    });

    const currentDate = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(`Generated on: ${currentDate}`, pageWidth - margin, 20, {
      align: "right",
    });

    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 35, pageWidth - margin, 35);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("item Details", margin, 45);

    let yPos = 55;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setDrawColor(200, 200, 200);

    const col1Width = 60;
    const col2Width = 40;
    const col3Width = 30;
    const col4Width = 20;
    const col5Width = 30;

    doc.setFillColor(240, 240, 240);
    doc.rect(
      margin,
      yPos,
      col1Width + col2Width + col3Width + col4Width + col5Width,
      8,
      "F",
    );

    doc.text("item Name", margin + 3, yPos + 5.5);
    doc.text("Serial Number", margin + col1Width + 3, yPos + 5.5);
    doc.text("Category", margin + col1Width + col2Width + 3, yPos + 5.5);
    doc.text("Qty", margin + col1Width + col2Width + col3Width + 3, yPos + 5.5);
    doc.text(
      "Item Code",
      margin + col1Width + col2Width + col3Width + col4Width + 3,
      yPos + 5.5,
    );

    yPos += 8;

    itemsForPdf.forEach((item, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;

        doc.setFillColor(240, 240, 240);
        doc.rect(
          margin,
          yPos,
          col1Width + col2Width + col3Width + col4Width + col5Width,
          8,
          "F",
        );

        doc.text("item Name", margin + 3, yPos + 5.5);
        doc.text("Serial Number", margin + col1Width + 3, yPos + 5.5);
        doc.text("Category", margin + col1Width + col2Width + 3, yPos + 5.5);
        doc.text(
          "Qty",
          margin + col1Width + col2Width + col3Width + 3,
          yPos + 5.5,
        );
        doc.text(
          "Item Code",
          margin + col1Width + col2Width + col3Width + col4Width + 3,
          yPos + 5.5,
        );

        yPos += 8;
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 248, 248);
        doc.rect(
          margin,
          yPos,
          col1Width + col2Width + col3Width + col4Width + col5Width,
          8,
          "F",
        );
      }

      const truncateText = (text, maxLength) => {
        if (!text) return "N/A";
        return text.length > maxLength
          ? text.substring(0, maxLength) + "..."
          : text;
      };

      doc.text(
        truncateText(item?.itemDescription || "N/A", 25),
        margin + 3,
        yPos + 5.5,
      );
      doc.text(
        truncateText(item?.serialNumber || "N/A", 15),
        margin + col1Width + 3,
        yPos + 5.5,
      );
      doc.text(
        truncateText(item?.categoryDescription || "N/A", 12),
        margin + col1Width + col2Width + 3,
        yPos + 5.5,
      );
      doc.text(
        item?.itemQuantity?.toString() || "1",
        margin + col1Width + col2Width + col3Width + 3,
        yPos + 5.5,
      );
      doc.text(
        item?.itemCode || "N/A",
        margin + col1Width + col2Width + col3Width + col4Width + 3,
        yPos + 5.5,
      );

      doc.line(
        margin,
        yPos + 8,
        margin + col1Width + col2Width + col3Width + col4Width + col5Width,
        yPos + 8,
      );

      yPos += 8;
    });

    const footerYPos = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "This is an electronically generated document and does not require signature.",
      pageWidth / 2,
      footerYPos,
      { align: "center" },
    );

    doc.save(`SLT_GatePass_DESCRIPTIONs_${refNo}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <FaBoxOpen className="mr-3" /> Request Details
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
          <div className="mt-2 text-blue-100">
            Reference: {request.referenceNumber}
          </div>
        </div>

        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex justify-end mb-4">
            <button
              onClick={handleGenerateAdminPdf}
              disabled={pdfLoading}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center transition-colors"
            >
              <FaFilePdf className="mr-2" />
              {pdfLoading ? "Generating..." : "Officer Details"}
            </button>
          </div>

          {/* Sender Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
              <FaUser className="mr-2" /> Sender Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Service No
                </label>
                <p className="text-gray-800">
                  {user?.serviceNo || request?.employeeServiceNo || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Name
                </label>
                <p className="text-gray-800">{user?.name || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Section
                </label>
                <p className="text-gray-800">{user?.section || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Group
                </label>
                <p className="text-gray-800">{user?.group || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Designation
                </label>
                <p className="text-gray-800">{user?.designation || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Contact
                </label>
                <p className="text-gray-800">{user?.contactNo || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
              <FaBoxOpen className="mr-2" /> item Details
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      item{" "}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Serial Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Image
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {request.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{item?.itemDescription}</td>
                      <td className="px-6 py-4">{item?.serialNumber}</td>
                      <td className="px-6 py-4">{item?.categoryDescription}</td>
                      <td className="px-6 py-4">{item?.itemQuantity}</td>
                      <td className="px-6 py-4">{item?.itemCode}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item?.status === "returnable"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item?.status}
                        </span>{" "}
                        {item?.returnDate
                          ? new Date(item.returnDate).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewImages(item)}
                          className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                        >
                          <FaEye className="mr-2" /> View Images
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ImageViewerModal
              images={selectedDESCRIPTIONImages}
              isOpen={isImageModalOpen}
              onClose={() => setIsImageModalOpen(false)}
              itemDescription={selecteditemDescription}
            />
          </div>

          {/* Location and Receiver Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                <FaMapMarkerAlt className="mr-2" /> Location Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    {request?.isNonSltPlace ? "Company Name" : "Out Location"}
                  </label>
                  <p className="text-gray-800">
                    {request?.isNonSltPlace
                      ? request?.companyName
                      : request?.outLocation}
                  </p>
                </div>
                {request?.isNonSltPlace && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Company Address
                    </label>
                    <p className="text-gray-800">{request?.companyAddress}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    In Location
                  </label>
                  <p className="text-gray-800">{request?.inLocation}</p>
                </div>
              </div>
            </div>

            {receiver ? (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                  <FaUserCheck className="mr-2" /> Receiver Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Name
                    </label>
                    <p className="text-gray-800">{receiver?.name}</p>
                  </div>
                  {!request?.isNonSltPlace && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Group
                      </label>
                      <p className="text-gray-800">{receiver?.group}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      {request?.isNonSltPlace ? "NIC" : "Service No"}
                    </label>
                    <p className="text-gray-800">
                      {request?.isNonSltPlace
                        ? receiver?.nic
                        : receiver?.serviceNo}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Contact
                    </label>
                    <p className="text-gray-800">{receiver?.contactNo}</p>
                  </div>
                  {request?.isNonSltPlace && (
                    <div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        Non-SLT Destination
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                  <FaUserCheck className="mr-2" /> Receiver Details
                </h3>
                <div className="text-center py-4 text-gray-500">
                  <p>No receiver information available</p>
                </div>
              </div>
            )}
          </div>

          {/* Transport Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
              <FaTruck className="mr-2" /> Transport Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Transport Method
                </label>
                <p className="text-gray-800">
                  {request?.transport.transportMethod || "N/A"}
                </p>
              </div>

              {request?.transport.transportMethod === "Vehicle" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Transporter Type
                    </label>
                    <p className="text-gray-800">
                      {request?.transport.transporterType || "N/A"}
                    </p>
                  </div>

                  {request?.transport.transporterType === "SLT" ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Service No
                        </label>
                        <p className="text-gray-800">
                          {request?.transport.transporterServiceNo || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Name
                        </label>
                        <p className="text-gray-800">
                          {transporterDetails?.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Section
                        </label>
                        <p className="text-gray-800">
                          {transporterDetails?.section || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Group
                        </label>
                        <p className="text-gray-800">
                          {transporterDetails?.group || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Designation
                        </label>
                        <p className="text-gray-800">
                          {transporterDetails?.designation || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Contact
                        </label>
                        <p className="text-gray-800">
                          {transporterDetails?.contactNo || "N/A"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Transporter Name
                        </label>
                        <p className="text-gray-800">
                          {request?.transport.nonSLTTransporterName || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Transporter NIC
                        </label>
                        <p className="text-gray-800">
                          {request?.transport.nonSLTTransporterNIC || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Transporter Phone
                        </label>
                        <p className="text-gray-800">
                          {request?.transport.nonSLTTransporterPhone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Transporter Email
                        </label>
                        <p className="text-gray-800">
                          {request?.transport.nonSLTTransporterEmail || "N/A"}
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Vehicle Number
                    </label>
                    <p className="text-gray-800">
                      {request?.transport.vehicleNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Vehicle Item Code
                    </label>
                    <p className="text-gray-800">
                      {request?.transport.vehicleModel || "N/A"}
                    </p>
                  </div>
                </>
              )}

              {request?.transport.transportMethod === "By Hand" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Transporter Type
                    </label>
                    <p className="text-gray-800">
                      {request?.transport.transporterType || "N/A"}
                    </p>
                  </div>

                  {request?.transport.transporterType === "SLT" ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Service No
                        </label>
                        <p className="text-gray-800">
                          {request?.transport.transporterServiceNo || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Name
                        </label>
                        <p className="text-gray-800">
                          {transporterDetails?.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Section
                        </label>
                        <p className="text-gray-800">
                          {transporterDetails?.section || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Group
                        </label>
                        <p className="text-gray-800">
                          {transporterDetails?.group || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Designation
                        </label>
                        <p className="text-gray-800">
                          {transporterDetails?.designation || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Contact
                        </label>
                        <p className="text-gray-800">
                          {transporterDetails?.contactNo || "N/A"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Transporter Name
                        </label>
                        <p className="text-gray-800">
                          {request?.transport.nonSLTTransporterName || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Transporter NIC
                        </label>
                        <p className="text-gray-800">
                          {request?.transport.nonSLTTransporterNIC || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Transporter Phone
                        </label>
                        <p className="text-gray-800">
                          {request?.transport.nonSLTTransporterPhone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Transporter Email
                        </label>
                        <p className="text-gray-800">
                          {request?.transport.nonSLTTransporterEmail || "N/A"}
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <span className="mr-2">Tip:</span>
            Only <span className="font-medium">returnable</span> items allow
            editing of Serial Number &amp; Item Code (in the future).
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// Main RequestDetails Component
// ----------------------------------------------------
const RequestDetails = () => {
  const { showToast } = useToast();
  const [senderNameMap, setSenderNameMap] = useState({});
  const [searchRef, setSearchRef] = useState("");
  const [outLocationFilter, setOutLocationFilter] = useState("");
  const [inLocationFilter, setInLocationFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [transportData, setTransportData] = useState(null);

  // rich data for PDF
  const [fullRequestData, setFullRequestData] = useState(null);
  const [fullRequestLoading, setFullRequestLoading] = useState(false);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState(null);

  useEffect(() => {
    if (!isModalOpen) return;

    const resolveRequestSource = () => {
      if (fullRequestData) {
        if (Array.isArray(fullRequestData)) return fullRequestData[0];
        if (fullRequestData.requestDetails)
          return fullRequestData.requestDetails;
        return fullRequestData;
      }
      return selectedRequest;
    };

    const requestSource = resolveRequestSource();
    if (!requestSource) return;

    if (requestSource.isNonSltPlace) {
      setReceiver({
        name: requestSource.receiverName,
        nic: requestSource.receiverNIC,
        contactNo: requestSource.receiverContact,
        serviceNo: requestSource.receiverServiceNo || "N/A",
        group: "Non-SLT",
      });
      return;
    }

    const receiverServiceNo =
      requestSource.receiverServiceNo ||
      requestSource.requestDetails?.receiverServiceNo;
    if (!receiverServiceNo) {
      setReceiver(null);
      return;
    }

    let isActive = true;
    const loadReceiver = async () => {
      try {
        const response = await searchEmployeeByServiceNo(receiverServiceNo);
        const employee =
          response?.data?.data?.[0] ||
          response?.data?.data ||
          response?.data?.[0] ||
          response?.data ||
          null;
        const receiverData = mapErpEmployeeToReceiver(
          employee,
          receiverServiceNo,
        );
        if (isActive) setReceiver(receiverData);
      } catch (error) {
        if (isActive) {
          console.error("Error fetching receiver details:", error);
          setReceiver(null);
        }
      }
    };

    loadReceiver();
    return () => {
      isActive = false;
    };
  }, [isModalOpen, fullRequestData, selectedRequest]);

  const loadData = async () => {
    try {
      setLoading(true);

      let fetchedRows = [];

      if (searchRef.trim()) {
        const data = await getAdminRequestsByRef(searchRef.trim());
        fetchedRows = data.rows || [];
      } else {
        const params = {};
        if (dateFrom) params.from = dateFrom;
        if (dateTo) params.to = dateTo;

        const data = await getAdminRequests(params);
        fetchedRows = Array.isArray(data) ? data : data.rows || [];
      }

      setRows(fetchedRows);
    } catch (err) {
      console.error("Failed to load admin request details:", err);
      showToast("Failed to load request details", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRef, dateFrom, dateTo]);

  const getLatestRowsByReference = (rows = []) => {
    const map = new Map();

    rows.forEach((row) => {
      const ref = row.referenceNumber;
      if (!ref) return;

      if (!map.has(ref)) {
        map.set(ref, row);
      } else {
        const existing = map.get(ref);
        const newTime = new Date(
          row.updatedAt || row.request?.updatedAt || 0,
        ).getTime();
        const oldTime = new Date(
          existing.updatedAt || existing.request?.updatedAt || 0,
        ).getTime();

        if (newTime > oldTime) {
          map.set(ref, row);
        }
      }
    });

    return Array.from(map.values());
  };

  const filteredRows = useMemo(() => {
    let list = [...rows];

    // list = list.filter((r) => normalize(r.status) === "pending");

    if (outLocationFilter.trim()) {
      const f = normalize(outLocationFilter);
      list = list.filter((r) => normalize(r.request?.outLocation).includes(f));
    }

    if (inLocationFilter.trim()) {
      const f = normalize(inLocationFilter);
      list = list.filter((r) => normalize(r.request?.inLocation).includes(f));
    }

    if (companyFilter !== "all") {
      list = list.filter((r) => {
        const isNonSlt = !!r.request?.isNonSltPlace;
        return companyFilter === "nonslt" ? isNonSlt : !isNonSlt;
      });
    }

    if (searchRef.trim()) {
      list.sort(
        (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
      );
    } else {
      list.sort(
        (a, b) =>
          new Date(b.updatedAt || b.request?.updatedAt || 0) -
          new Date(a.updatedAt || a.request?.updatedAt || 0),
      );
    }

    return getLatestRowsByReference(list);
  }, [rows, outLocationFilter, inLocationFilter, companyFilter, searchRef]);

  useEffect(() => {
    const loadSenderNames = async () => {
      const missingServiceNos = filteredRows
        .map((r) => r.request?.employeeServiceNo)
        .filter((svc) => svc && !senderNameMap[svc]);

      if (missingServiceNos.length === 0) return;

      for (const svc of missingServiceNos) {
        try {
          const data = await searchReceiverByServiceNo(svc);
          setSenderNameMap((prev) => ({
            ...prev,
            [svc]: data?.name || null,
          }));
        } catch {
          setSenderNameMap((prev) => ({
            ...prev,
            [svc]: null,
          }));
        }
      }
    };

    loadSenderNames();
  }, [filteredRows]);

  const clearFilters = () => {
    setOutLocationFilter("");
    setInLocationFilter("");
    setCompanyFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const formatCompanyLabel = (row) =>
    row.request?.isNonSltPlace ? "Non-SLT Organization" : "SLT Branch";

  // const formatStatusLabel = (row) => {
  //   const stage = row.stage || "";
  //   const status = row.status || "Pending";
  //   return `${stage} ${status}`;
  // };

  // Small helper to normalize "completed" vs "pending"
  const isCompleted = (statusCode) => statusCode === 2 || statusCode === 3;

  const printAdminReport = (request) => {
    if (!request) return;

    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.top = "-9999px";
    document.body.appendChild(printFrame);

    const contentDocument = printFrame.contentDocument;

    contentDocument.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SLT Gate Pass - ${request.refNo}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .ref { font-size: 14px; color: #666; }
        .section {
  margin-bottom: 28px;
  padding-bottom: 8px;
}

        .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
        .item { font-size: 14px; }
        .itemComm { grid-column: span 2; font-size: 14px; }
        .label { font-weight: bold; margin-right: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">SLT Gate Pass</h1>
        <p class="ref">Reference: ${request.refNo}</p>
        <p class="ref">Generated on: ${new Date().toLocaleString()}</p>
      </div>

      <div class="section">
        <h2 class="section-title">Sender Details</h2>
        <div class="grid">
          <div class="item"><span class="label">Name:</span> ${
            request.senderDetails?.name || "N/A"
          }</div>
          <div class="item"><span class="label">Service No:</span> ${
            request.senderDetails?.serviceNo || "N/A"
          }</div>
          <div class="item"><span class="label">Section:</span> ${
            request.senderDetails?.section || "N/A"
          }</div>
          <div class="item"><span class="label">Group:</span> ${
            request.senderDetails?.group || "N/A"
          }</div>
          <div class="item"><span class="label">Designation:</span> ${
            request.senderDetails?.designation || "N/A"
          }</div>
          <div class="item"><span class="label">Contact:</span> ${
            request.senderDetails?.contactNo || "N/A"
          }</div>
        </div>
      </div>

      

      <div class="section">
        <h2 class="section-title">Location Details</h2>
        <div class="grid">
          <div class="item"><span class="label">From:</span> ${
            request.outLocation || "N/A"
          }</div>
          <div class="item"><span class="label">To:</span> ${
            request.inLocation || "N/A"
          }</div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Exerctive Officer Details</h2>
        <div class="grid">
          <div class="item"><span class="label">Name:</span> ${
            request.executiveOfficerData?.name || "N/A"
          }</div>
          <div class="item"><span class="label">Service No:</span> ${
            request.executiveOfficerData?.serviceNo || "N/A"
          }</div>
          <div class="item"><span class="label">Section:</span> ${
            request.executiveOfficerData?.section || "N/A"
          }</div>
          <div class="item"><span class="label">Group:</span> ${
            request.executiveOfficerData?.group || "N/A"
          }</div>
          <div class="item"><span class="label">Designation:</span> ${
            request.executiveOfficerData?.designation || "N/A"
          }</div>
          <div class="item"><span class="label">Contact:</span> ${
            request.executiveOfficerData?.contactNo || "N/A"
          }</div>
          <div class="itemComm"><span class="label">Exerctive Officer Comment:</span> ${
            request.statusDetails?.executiveOfficerComment || "N/A"
          }</div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Verify Officer Details</h2>
        <div class="grid">
          <div class="item"><span class="label">Name:</span> ${
            request.verifyOfficerData?.name || "N/A"
          }</div>
          <div class="item"><span class="label">Service No:</span> ${
            request.verifyOfficerData?.serviceNo || "N/A"
          }</div>
          <div class="item"><span class="label">Section:</span> ${
            request.verifyOfficerData?.section || "N/A"
          }</div>
          <div class="item"><span class="label">Group:</span> ${
            request.verifyOfficerData?.group || "N/A"
          }</div>
          <div class="item"><span class="label">Designation:</span> ${
            request.verifyOfficerData?.designation || "N/A"
          }</div>
          <div class="item"><span class="label">Contact:</span> ${
            request.verifyOfficerData?.contactNo || "N/A"
          }</div>
          <div class="itemComm"><span class="label">Verify Officer Comment:</span> ${
            request.statusDetails?.verifyOfficerComment || "N/A"
          }</div>
        </div>
      </div>

      <!-- You can continue with items table, loading details, etc., similar to Verify.jsx -->

    </body>
    </html>
  `);

    contentDocument.close();

    printFrame.onload = () => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      document.body.removeChild(printFrame);
    };
  };

  // Build full officer details for SuperAdmin PDF
  const handleGeneratePdf = async (row) => {
    try {
      setDetailsLoading(true);

      // 1) Get latest status + full request
      const data = await getAdminRequestsByRef(row.referenceNumber);

      console.log("ADMIN REF DATA", data);

      // rowsByRef must be defined *before* we use it
      const rowsByRef = Array.isArray(data.rows) ? data.rows : [];
      console.log("ROWS BY REF", rowsByRef);
      console.log(
        "ROW STAGES + ACTORS",
        rowsByRef.map((r) => ({ stage: r.stage, actors: r.actors })),
      );

      const statusDetails = data.statusDetails || {};
      const baseRequest = rowsByRef[0]?.request || row.request || {};

      const reqStatus = baseRequest.status || 0;

      // which stages are completed? (fallback to numeric status)
      const executiveCompleted =
        isCompleted(statusDetails.executiveOfficerStatus) || reqStatus >= 2;
      const pleaderCompleted =
        isCompleted(statusDetails.verifyOfficerStatus) || reqStatus >= 5;
      const receiverOfficerCompleted =
        isCompleted(statusDetails.recieveOfficerStatus) || reqStatus >= 11;

      // 2) Sender (employee)
      let senderDetails = null;
      if (baseRequest.employeeServiceNo) {
        try {
          senderDetails = await searchSenderByServiceNo(
            baseRequest.employeeServiceNo,
          );
        } catch (e) {
          senderDetails = null;
        }
      }

      // 3) Executive officer
      let executiveOfficerData = null;
      const execSvc =
        statusDetails.executiveOfficerServiceNo ||
        baseRequest.executiveOfficerServiceNo;
      if (executiveCompleted && execSvc) {
        try {
          executiveOfficerData = await searchSenderByServiceNo(execSvc);
        } catch (e) {
          executiveOfficerData = null;
        }
      }

      // 4) Verify officer
      let verifyOfficerData = null;
      const verifySvc =
        statusDetails.verifyOfficerServiceNo ||
        statusDetails.verifyOfficerServiceNumber ||
        (rowsByRef.find((r) => r.stage === "Verify")?.actors?.verify ?? null);

      if (verifyCompleted && verifySvc) {
        try {
          verifyOfficerData = await searchSenderByServiceNo(verifySvc);
        } catch (e) {
          verifyOfficerData = null;
        }
      }

      // 5) Receiver officer
      let receiverOfficerData = null;
      const receiveSvc =
        statusDetails.recieveOfficerServiceNo ||
        statusDetails.recieveOfficerServiceNumber ||
        baseRequest.receiverServiceNo;

      if (receiveCompleted && receiveSvc) {
        try {
          receiverOfficerData = await searchReceiverByServiceNo(receiveSvc);
        } catch (e) {
          console.error("Error fetching receiver officer details:", e);
          receiverOfficerData = null;
        }
      }

      // 6) Build report object (completed officers get real details, others N/A)
      const reportData = {
        refNo: row.referenceNumber,

        // Sender
        senderDetails: {
          serviceNo:
            senderDetails?.serviceNo || baseRequest.employeeServiceNo || "N/A",
          name: senderDetails?.name || "N/A",
          section: senderDetails?.section || "N/A",
          group: senderDetails?.group || "N/A",
          designation: senderDetails?.designation || "N/A",
          contactNo: senderDetails?.contactNo || "N/A",
          email: senderDetails?.email || "N/A",
        },

        // Receiver (destination person / branch)
        receiverDetails: baseRequest.isNonSltPlace
          ? {
              name: baseRequest.receiverName || "N/A",
              nic: baseRequest.receiverNIC || "N/A",
              contactNo: baseRequest.receiverContact || "N/A",
              companyName: baseRequest.companyName || "N/A",
            }
          : {
              serviceNo: receiverOfficerData?.serviceNo || receiveSvc || "N/A",
              name: receiverOfficerData?.name || "N/A",
              section: receiverOfficerData?.section || "N/A",
              group: receiverOfficerData?.group || "N/A",
              designation: receiverOfficerData?.designation || "N/A",
              contactNo: receiverOfficerData?.contactNo || "N/A",
            },

        // Locations & items
        outLocation: baseRequest.outLocation,
        inLocation: baseRequest.inLocation,
        items: baseRequest.items || [],
        transportData: baseRequest.transport || {},
        requestDetails: baseRequest,

        // Raw status info (comments, codes)
        statusDetails,

        // Executive officer section
        executiveOfficerData: executiveCompleted
          ? {
              serviceNo: executiveOfficerData?.serviceNo || execSvc || "N/A",
              name: executiveOfficerData?.name || "N/A",
              section: executiveOfficerData?.section || "N/A",
              group: executiveOfficerData?.group || "N/A",
              designation: executiveOfficerData?.designation || "N/A",
              contactNo: executiveOfficerData?.contactNo || "N/A",
            }
          : {
              serviceNo: execSvc || "N/A",
              name: "N/A",
              section: "N/A",
              group: "N/A",
              designation: "N/A",
              contactNo: "N/A",
            },

        // Verify officer section
        verifyOfficerData: verifyCompleted
          ? {
              serviceNo: verifyOfficerData?.serviceNo || verifySvc || "N/A",
              name: verifyOfficerData?.name || "N/A",
              section: verifyOfficerData?.section || "N/A",
              group: verifyOfficerData?.group || "N/A",
              designation: verifyOfficerData?.designation || "N/A",
              contactNo: verifyOfficerData?.contactNo || "N/A",
            }
          : {
              serviceNo: verifySvc || "N/A",
              name: "N/A",
              section: "N/A",
              group: "N/A",
              designation: "N/A",
              contactNo: "N/A",
            },
      };

      setSelectedReportData(reportData);

      // 7) Finally, generate the PDF
      printAdminReport(reportData);
    } catch (err) {
      console.error("Failed to generate admin PDF:", err);
      showToast("Failed to generate PDF", "error");
    } finally {
      setDetailsLoading(false);
    }
  };

  // ---------------------------------------------
  // Open Details Modal (and fetch rich request)
  // ---------------------------------------------
  const handleOpenModal = async (row) => {
    const baseRequest = row.request;
    console.log("receiverServiceNo:", baseRequest?.receiverServiceNo);
    console.log("full row:", row);
    setSelectedRequest(baseRequest);
    setIsModalOpen(true);
    setFullRequestData(null);

    // Sender
    if (baseRequest.employeeServiceNo) {
      try {
        const senderData = await searchReceiverByServiceNo(
          baseRequest.employeeServiceNo,
        );
        setUser(senderData);
      } catch (error) {
        console.error("Error fetching sender details:", error);
        setUser(null);
      }
    } else {
      setUser(null);
    }

    // Receiver (resolved via ERP in useEffect)
    setReceiver(null);

    // Transporter (for SLT transporter we fetch user details)
    if (baseRequest?.transport?.transporterServiceNo) {
      try {
        const transport = await searchReceiverByServiceNo(
          baseRequest.transport.transporterServiceNo,
        );
        setTransportData(transport);
      } catch (error) {
        console.error("Error fetching transporter details:", error);
        setTransportData(baseRequest.transport || null);
      }
    } else {
      setTransportData(baseRequest.transport || null);
    }

    // Rich request from API for PDF (executive, verify, loading, etc.)
    try {
      setFullRequestLoading(true);
      const rich = await getGatePassRequest(row.referenceNumber);

      const mergedForPdf = {
        ...(rich || {}),
        ...baseRequest,
        refNo: row.referenceNumber,
        requestDetails: baseRequest,
        transportData: rich?.transportData || baseRequest.transport,
      };

      setFullRequestData(mergedForPdf);
    } catch (err) {
      console.error("Failed to load full gate pass details:", err);
      setFullRequestData({
        ...baseRequest,
        refNo: row.referenceNumber,
        requestDetails: baseRequest,
        transportData: baseRequest.transport,
      });
    } finally {
      setFullRequestLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Requests&apos; Details
          </h1>
          <p className="text-gray-500 flex items-center">
            <FaInfoCircle className="mr-2 text-blue-500" />
            Manage and review all gate pass requests
          </p>
        </div>

        {/* Uncomment if you want manual refresh */}
        {/* <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          Refresh
        </button> */}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
        <div className="space-y-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Reference Number (e.g. REQ-1763...)"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Point (Out Location)
              </label>
              <input
                type="text"
                value={outLocationFilter}
                onChange={(e) => setOutLocationFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exit Point (In Location)
              </label>
              <input
                type="text"
                value={inLocationFilter}
                onChange={(e) => setInLocationFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All</option>
                <option value="slt">SLT Branch</option>
                <option value="nonslt">Non-SLT Organization</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {(searchRef ||
            outLocationFilter ||
            inLocationFilter ||
            companyFilter !== "all" ||
            dateFrom ||
            dateTo) && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-4 w-40 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Ref No
              </th>
              <th className="px-6 py-4 w-40 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Requester
              </th>
              <th className="px-6 py-4 w-40 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Entry Point
              </th>
              <th className="px-6 py-4 w-40 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Exit Point
              </th>
              <th className="px-12 py-4 w-30 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-4 w-40 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Date &amp; Time
              </th>

              <th className="px-11 py-4 w-40 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-6 text-center text-sm text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-6 text-center text-sm text-gray-400"
                >
                  No requests found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr
                  key={`${row.referenceNumber}-${row.stage}-${idx}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {row.referenceNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {row.request?.employeeServiceNo || "-"}
                      {senderNameMap[row.request?.employeeServiceNo] && (
                        <span className="text-gray-700">
                          {" "}
                          ({senderNameMap[row.request.employeeServiceNo]})
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {row.request?.outLocation || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {row.request?.inLocation || "-"}
                    </div>
                  </td>
                  <td className="px-11 py-4 whitespace-nowrap">
                    <span
                      className={
                        row.request?.isNonSltPlace
                          ? "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                          : "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      }
                    >
                      {formatCompanyLabel(row)}
                    </span>
                  </td>
                  <td className="px-6 py-4 w-30 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDateTime(
                        row.updatedAt ||
                          row.request?.updatedAt ||
                          row.request?.createdAt,
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-4 w-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleOpenModal(row)}
                      className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                    >
                      <FaEye className="mr-2" /> View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      <RequestDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        request={selectedRequest}
        user={user}
        receiver={receiver}
        transporterDetails={transportData}
        fullRequest={fullRequestData}
        fullRequestLoading={fullRequestLoading}
      />
    </div>
  );
};

export default RequestDetails;
