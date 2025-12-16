import React, { useState, useEffect, useMemo } from "react";
import {
  getAdminRequests,
  getAdminRequestsByRef,
} from "../services/adminRequestService.js";
import { useToast } from "../components/ToastProvider.jsx";
import { FaSearch, FaSync, FaInfoCircle, FaEye, FaBoxOpen, FaUser, FaMapMarkerAlt, FaUserCheck, FaTimes, FaTruck, FaFilePdf,FaUndo } from "react-icons/fa";
import {
  getImageUrl,
  searchReceiverByServiceNo,
  getGatePassRequest,
} from "../services/RequestService.js";
import { jsPDF } from "jspdf";
import logoUrl from "../assets/SLTMobitel_Logo.png";

const STAGE_ORDER = ["Executive", "Verify", "Petrol Leader", "Receive"];

const normalize = (v) => (v || "").toString().trim().toLowerCase();

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

// Image Viewer Modal Component
const ImageViewerModal = ({ images, isOpen, onClose, itemName }) => {
  const [imageUrls, setImageUrls] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images && images.length > 0) {
      Promise.all(
        images.slice(0, 5).map((image) => getImageUrl(image.path))
      ).then((urls) => {
        setImageUrls(urls.filter((url) => url !== null));
      });
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
                alt={`${itemName} ${activeIndex + 1}`}
                className="w-full h-full object-contain"
              />
            )}

            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {activeIndex + 1} / {imageUrls.length}
            </div>
          </div>

          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">{itemName}</h3>
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
                alt={`${itemName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Request Details Modal Component
const RequestDetailsModal = ({
  isOpen,
  onClose,
  request,
  user,
  receiver,
  transporterDetails,
}) => {
  // Initialize with the correct value from request
  const [selectedExecutive, setSelectedExecutive] = useState("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedItemImages, setSelectedItemImages] = useState([]);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [executiveOfficers, setExecutiveOfficers] = useState([]);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // NEW: editable items (for Sender)
  const [editedItems, setEditedItems] = useState([]);
  const [saveItemsSuccess, setSaveItemsSuccess] = useState(false);
  const [saveItemsError, setSaveItemsError] = useState("");

  




  

  if (!isOpen || !request) return null;

  

  const handleSelect = (serialNo) => {
    setSelectedItems((prev) => {
      if (prev.includes(serialNo)) {
        return prev.filter((sn) => sn !== serialNo);
      } else {
        return [...prev, serialNo];
      }
    });
  };

  const handleViewImages = (item) => {
    setSelectedItemImages(item.itemPhotos || []);
    setSelectedItemName(item.itemName || "");
    setIsImageModalOpen(true);
  };

  const printReport = (
      request,
      transporterDetails,
      loadingStaff,
      selectedReturnableItems
    ) => {
      // Create a temporary iframe to hold the printable content
      const printFrame = document.createElement("iframe");
      printFrame.style.position = "absolute";
      printFrame.style.top = "-9999px";
      document.body.appendChild(printFrame);
  
      const contentDocument = printFrame.contentDocument;
  
      // Create the print content with styling
      contentDocument.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SLT Gate Pass - ${request.refNo}</title>
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
            .logo {
              max-height: 60px;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              color: #003399;
              margin: 0;
            }
            .ref {
              font-size: 14px;
              color: #666;
              margin: 5px 0;
            }
            .date {
              font-size: 12px;
              color: #888;
              margin: 5px 0 15px;
            }
            .section {
              margin-bottom: 20px;
            }
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
            .item {
              margin-bottom: 5px;
            }
            .itemComm{
              margin-bottom: 40px;
            }
            .label {
              font-weight: bold;
              color: #555;
            }
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
            .signature-section {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 40px;
            }
            .signature-box {
              height: 70px;
              border-bottom: 1px solid #ccc;
            }
            .signature-title {
              text-align: center;
              font-weight: bold;
              margin-top: 5px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #999;
            }
            @media print {
              body {
                margin: 0;
                padding: 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src=${logoUrl} alt="SLT Logo" class="logo" />
            <h1 class="title">SLT Gate Pass</h1>
            <p class="ref">Reference: ${request.refNo}</p>
            <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="section">
            <h2 class="section-title">Sender Details</h2>
            <div class="grid">
              <div class="item">
                <span class="label">Name:</span> ${
                  user?.name || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                  user?.serviceNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Section:</span> ${
                  user?.section || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Group:</span> ${
                  user?.group || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Designation:</span> ${
                  user?.designation || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Contact:</span> ${
                  user?.contactNo || "N/A"
                }
              </div>
            </div>
          </div>
  
          <div class="section">
            <h2 class="section-title">Receiver Details</h2>
            <div class="grid">
              <div class="item">
                <span class="label">Name:</span> ${
                  receiver?.name || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                  receiver?.serviceNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Section:</span> ${
                  receiver?.section || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Group:</span> ${
                  receiver?.group || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Designation:</span> ${
                  receiver?.designation || "N/A"
                  
                }
              </div>
              <div class="item">
                <span class="label">Contact:</span> ${
                  receiver?.contactNo || "N/A"
                }
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Location Details</h2>
            <div class="grid">
              <div class="item">
                <span class="label">From:</span> ${request.outLocation || "N/A"}
              </div>
              <div class="item">
                <span class="label">To:</span> ${request.inLocation || "N/A"}
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Transport Details</h2>
            <div class="grid">
              <div class="item">
                <span class="label">Method:</span> ${
                  request?.transportData?.transportMethod || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Type:</span> ${
                  request?.transportData?.transporterType || "N/A"
                }
              </div>
              ${
                request?.transportData?.transporterType === "SLT"
                  ? `
                
              <div class="item">
                <span class="label">Transporter:</span> ${
                  transporterDetails?.name || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                  transporterDetails?.serviceNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Contact:</span> ${
                  transporterDetails?.contactNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Section:</span> ${
                  transporterDetails?.section || "N/A"
                }
              </div>
              
              ${
                request?.transportData?.transportMethod === "Vehicle"
                  ? `
              <div class="item">
                <span class="label">Vehicle No:</span> ${
                  request?.requestDetails?.vehicleNumber || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Vehicle Model:</span> ${
                  request?.requestDetails?.vehicleModel || "N/A"
                }
              </div>
              `
                  : ""
              } 
              `
                  : `
              <div class="item">
                <span class="label">Transporter:</span> ${
                  request?.transportData?.nonSLTTransporterName || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                  request?.transportData?.nonSLTTransporterEmail || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Contact:</span> ${
                  request?.transportData?.nonSLTTransporterNIC || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Section:</span> ${
                  request?.transportData?.nonSLTTransporterPhone || "N/A"
                }
              </div>
              
              ${
                request?.transportData?.transportMethod === "Vehicle"
                  ? `
              <div class="item">
                <span class="label">Vehicle No:</span> ${
                  request?.requestDetails?.vehicleNumber || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Vehicle Model:</span> ${
                  request?.requestDetails?.vehicleModel || "N/A"
                }
              </div>
              `
                  : ""
              }
              `
              }
            </div>
          </div>
  
          <div class="section">
            <h2 class="section-title">Exerctive Officer Details</h2>
            <div class="grid">
              <div class="item">
                <span class="label">Name:</span> ${
                  request.executiveOfficerData?.name || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                  request.executiveOfficerData?.serviceNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Section:</span> ${
                  request.executiveOfficerData?.section || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Group:</span> ${
                  request.executiveOfficerData?.group || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Designation:</span> ${
                  request.executiveOfficerData?.designation || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Contact:</span> ${
                  request.executiveOfficerData?.contactNo || "N/A"
                }
              </div>
              <div class="itemComm">
                <span class="label">Exerctive Officer Comment:</span> ${
                  request.statusDetails?.executiveOfficerComment || "N/A"
                }
              </div>
            </div>
          </div>
  
          <div class="section">
            <h2 class="section-title">Verify Officer Details</h2>
            <div class="grid">
              <div class="item">
                <span class="label">Name:</span> ${
                  request.verifyOfficerData?.name || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                  request.verifyOfficerData?.serviceNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Section:</span> ${
                  request.verifyOfficerData?.section || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Group:</span> ${
                  request.verifyOfficerData?.group || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Designation:</span> ${
                  request.verifyOfficerData?.designation || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Contact:</span> ${
                  request.verifyOfficerData?.contactNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Verify Officer Comment:</span> ${
                  request.statusDetails?.verifyOfficerComment || "N/A"
                }
              </div>
            </div>
          </div>
          
          <!-- Loading Details Section -->
      <div class="section">
        <h2 class="section-title">Loading Details</h2>
        <div class="grid">
          <div class="item">
            <span class="label">Loading Location:</span> ${
              request?.requestDetails?.loading?.loadingLocation || "N/A"
            }
          </div>
          <div class="item">
            <span class="label">Loading Time:</span> ${
              request?.requestDetails?.loading?.loadingTime
                ? new Date(
                    request.requestDetails.loading.loadingTime
                  ).toLocaleString()
                : "N/A"
            }
          </div>
          <div class="item">
            <span class="label">Staff Type:</span> ${
              request?.requestDetails?.loading?.staffType || "N/A"
            }
          </div>
          
          ${
            request?.requestDetails?.loading?.staffType === "SLT"
              ? `
            <div class="item">
              <span class="label">Staff Service No:</span> ${
                request?.requestDetails?.loading?.staffServiceNo || "N/A"
              }
            </div>
            <div class="item">
                <span class="label">Name:</span> ${
                  request.loadUserData?.serviceNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                  request.loadUserData?.name || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Section:</span> ${
                  request.loadUserData?.section || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Group:</span> ${
                  request.loadUserData?.group || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Designation:</span> ${
                  request.loadUserData?.designation || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Contact:</span> ${
                  request.loadUserData?.contactNo || "N/A"
                }
              </div>
          `
              : `
            <div class="item">
              <span class="label">Staff Name:</span> ${
                request?.requestDetails?.loading?.nonSLTStaffName || "N/A"
              }
            </div>
            <div class="item">
              <span class="label">Company:</span> ${
                request?.requestDetails?.loading?.nonSLTStaffCompany || "N/A"
              }
            </div>
            <div class="item">
              <span class="label">NIC:</span> ${
                request?.requestDetails?.loading?.nonSLTStaffNIC || "N/A"
              }
            </div>
            <div class="item">
              <span class="label">Contact:</span> ${
                request?.requestDetails?.loading?.nonSLTStaffContact || "N/A"
              }
            </div>
            <div class="item">
              <span class="label">Email:</span> ${
                request?.requestDetails?.loading?.nonSLTStaffEmail || "N/A"
              }
            </div>
          `
          }
        </div>
      </div>
  
      <div class="section">
            <h2 class="section-title">Receive Officer Details</h2>
            <div class="grid">
              <div class="item">
                <span class="label">Name:</span> ${
                  receiver?.name || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                   receiver?.serviceNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Section:</span> ${
                   receiver?.section || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Group:</span> ${
                   receiver?.group || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Designation:</span> ${
                   receiver?.designation || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Contact:</span> ${
                   receiver?.contactNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Receive Officer Comment:</span> ${
                   receiver?.recieveOfficerComment || "N/A"
                }
              </div>
            </div>
          </div>
          
          <!-- Loading Details Section -->
      <div class="section">
        <h2 class="section-title">Unloading Details</h2>
        <div class="grid">
          <div class="item">
            <span class="label">Loading Location:</span> ${
              request?.requestDetails?.unLoading?.loadingLocation || "N/A"
            }
          </div>
          <div class="item">
            <span class="label">Loading Time:</span> ${
              request?.requestDetails?.unLoading?.loadingTime
                ? new Date(
                    request.requestDetails.unLoading.loadingTime
                  ).toLocaleString()
                : "N/A"
            }
          </div>
          <div class="item">
            <span class="label">Staff Type:</span> ${
              request?.requestDetails?.unLoading?.staffType || "N/A"
            }
          </div>
          
          ${
            request?.requestDetails?.unLoading?.staffType === "SLT"
              ? `
            <div class="item">
              <span class="label">Staff Service No:</span> ${
                request?.requestDetails?.unLoading?.staffServiceNo || "N/A"
              }
            </div>
            <div class="item">
                <span class="label">Name:</span> ${
                  request.unLoadUserData?.serviceNo || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                  request.unLoadUserData?.name || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Section:</span> ${
                  request.unLoadUserData?.section || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Group:</span> ${
                  request.unLoadUserData?.group || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Designation:</span> ${
                  request.unLoadUserData?.designation || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Contact:</span> ${
                  request.unLoadUserData?.contactNo || "N/A"
                }
              </div>
          `
              : `
            <div class="item">
              <span class="label">Staff Name:</span> ${
                request?.requestDetails?.unLoading?.nonSLTStaffName || "N/A"
              }
            </div>
            <div class="item">
              <span class="label">Company:</span> ${
                request?.requestDetails?.unLoading?.nonSLTStaffCompany || "N/A"
              }
            </div>
            <div class="item">
              <span class="label">NIC:</span> ${
                request?.requestDetails?.unLoading?.nonSLTStaffNIC || "N/A"
              }
            </div>
            <div class="item">
              <span class="label">Contact:</span> ${
                request?.requestDetails?.unLoading?.nonSLTStaffContact || "N/A"
              }
            </div>
            <div class="item">
              <span class="label">Email:</span> ${
                request?.requestDetails?.unLoading?.nonSLTStaffEmail || "N/A"
              }
            </div>
          `
          }
        </div>
      </div>
  
          <div class="section">
            <h2 class="section-title">Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Serial No</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Model</th>
                </tr>
              </thead>
              <tbody>
                ${(request.items || [])
                  .map(
                    (item) => `
                  <tr>
                    <td>${item?.itemName || "-"}</td>
                    <td>${item?.serialNo || "-"}</td>
                    <td>${item?.itemCategory || "-"}</td>
                    <td>${item?.itemQuantity || "-"}</td>
                    <td>${item?.itemModel || "-"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          
          <div class="section">
        <h2 class="section-title">Selected Returnable Items</h2>
        ${
          request?.requestDetails?.returnableItems || []
            ? `<table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Serial No</th>
                  <th>Category</th>
                  <th>Return Quantity</th>
                  <th>Model</th>
                </tr>
              </thead>
              <tbody>
                ${(request?.requestDetails?.returnableItems || [])
                  .map(
                    (item) => `
                  <tr>
                    <td>${item?.itemName || "-"}</td>
                    <td>${item?.serialNo || "-"}</td>
                    <td>${item?.itemCategory || "-"}</td>
                    <td>${item?.returnQuantity || item?.itemQuantity || "-"}</td>
                    <td>${item?.itemModel || "-"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>`
            : "<p>No returnable items selected</p>"
        }
      </div>
          
          
          <div class="footer">
            This is an electronically generated document and does not require signature.
          </div>
        </body>
        </html>
      `);
  
      contentDocument.close();
  
      // Wait for content to load then print
      printFrame.onload = function () {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
  
        // Remove the iframe after printing
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      };
    };
  

  const generateItemDetailsPDF = (items, refNo) => {
     const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
    
        // Add SLT logo
        try {
          doc.addImage(logoUrl, "PNG", margin, 10, 40, 20);
        } catch (error) {
          console.error("Error adding logo:", error);
        }
    
        // Header
        doc.setFontSize(18);
        doc.setTextColor(0, 51, 153); // SLT blue color
        doc.text("SLT Gate Pass - Item Details", pageWidth / 2, 20, {
          align: "center",
        });
    
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Reference: ${request.refNo}`, pageWidth / 2, 30, {
          align: "center",
        });
    
        // Add current date
        const currentDate = new Date().toLocaleDateString();
        doc.setFontSize(10);
        doc.text(`Generated on: ${currentDate}`, pageWidth - margin, 20, {
          align: "right",
        });
    
        // Horizontal line
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, 35, pageWidth - margin, 35);
    
        // Items Table
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Item Details", margin, 45);
    
        // Table header
        let yPos = 55;
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.setDrawColor(200, 200, 200);
    
        // Define column widths
        const col1Width = 60; // Item Name
        const col2Width = 40; // Serial No
        const col3Width = 30; // Category
        const col4Width = 20; // Quantity
        const col5Width = 30; // Status
    
        // Draw table header
        doc.setFillColor(240, 240, 240);
        doc.rect(
          margin,
          yPos,
          col1Width + col2Width + col3Width + col4Width + col5Width,
          8,
          "F"
        );
    
        doc.text("Item Name", margin + 3, yPos + 5.5);
        doc.text("Serial No", margin + col1Width + 3, yPos + 5.5);
        doc.text("Category", margin + col1Width + col2Width + 3, yPos + 5.5);
        doc.text("Qty", margin + col1Width + col2Width + col3Width + 3, yPos + 5.5);
        doc.text(
          "Model",
          margin + col1Width + col2Width + col3Width + col4Width + 3,
          yPos + 5.5
        );
    
        yPos += 8;
    
        // Draw table content
        items.forEach((item, index) => {
          if (yPos > 270) {
            // Add new page if content exceeds page height
            doc.addPage();
            yPos = 20;
    
            // Add table header on new page
            doc.setFillColor(240, 240, 240);
            doc.rect(
              margin,
              yPos,
              col1Width + col2Width + col3Width + col4Width + col5Width,
              8,
              "F"
            );
    
            doc.text("Item Name", margin + 3, yPos + 5.5);
            doc.text("Serial No", margin + col1Width + 3, yPos + 5.5);
            doc.text("Category", margin + col1Width + col2Width + 3, yPos + 5.5);
            doc.text(
              "Qty",
              margin + col1Width + col2Width + col3Width + 3,
              yPos + 5.5
            );
            doc.text(
              "Model",
              margin + col1Width + col2Width + col3Width + col4Width + 3,
              yPos + 5.5
            );
    
            yPos += 8;
          }
    
          // Alternate row colors for better readability
          if (index % 2 === 1) {
            doc.setFillColor(248, 248, 248);
            doc.rect(
              margin,
              yPos,
              col1Width + col2Width + col3Width + col4Width + col5Width,
              8,
              "F"
            );
          }
    
          // Truncate long text to fit in columns
          const truncateText = (text, maxLength) => {
            if (!text) return "N/A";
            return text.length > maxLength
              ? text.substring(0, maxLength) + "..."
              : text;
          };
    
          doc.text(
            truncateText(item?.itemName || "N/A", 25),
            margin + 3,
            yPos + 5.5
          );
          doc.text(
            truncateText(item?.serialNo || "N/A", 15),
            margin + col1Width + 3,
            yPos + 5.5
          );
          doc.text(
            truncateText(item?.itemCategory || "N/A", 12),
            margin + col1Width + col2Width + 3,
            yPos + 5.5
          );
          doc.text(
            item?.itemQuantity?.toString() || "1",
            margin + col1Width + col2Width + col3Width + 3,
            yPos + 5.5
          );
          doc.text(
            item?.itemModel || "N/A",
            margin + col1Width + col2Width + col3Width + col4Width + 3,
            yPos + 5.5
          );
          // doc.text(item?.itemReturnable ? 'Returnable' : 'Non-Returnable',
          //          margin + col1Width + col2Width + col3Width + col4Width + 3, yPos + 5.5);
    
          // Draw horizontal line after each row
          doc.line(
            margin,
            yPos + 8,
            margin + col1Width + col2Width + col3Width + col4Width + col5Width,
            yPos + 8
          );
    
          yPos += 8;
        });
    
        // Footer
        const footerYPos = doc.internal.pageSize.getHeight() - 10;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          "This is an electronically generated document and does not require signature.",
          pageWidth / 2,
          footerYPos,
          { align: "center" }
        );
    
        // Save the PDF
        doc.save(`SLT_GatePass_Items_${request.refNo}.pdf`);
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
          <button
                onClick={() =>
                          printReport(
                            request,
                            transporterDetails
                            
                          )
                        }
                className="ml-auto px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center transition-colors"
              >
                <FaFilePdf className="mr-2" /> Generate PDF
              </button>
          {/* Sender Details */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                <FaUser className="mr-2" /> Sender Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Service No</label>
                  <p className="text-gray-800">
                    {user?.serviceNo || request?.employeeServiceNo || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-gray-800">{user?.name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Section</label>
                  <p className="text-gray-800">{user?.section || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Group</label>
                  <p className="text-gray-800">{user?.group || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Designation</label>
                  <p className="text-gray-800">{user?.designation || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Contact</label>
                  <p className="text-gray-800">{user?.contactNo || "N/A"}</p>
                </div>
              </div>
            </div>



          {/* Items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
              <FaBoxOpen className="mr-2" /> Item Details
              
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Serial No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Model
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
                      <td className="px-6 py-4">{item?.itemName}</td>
                      <td className="px-6 py-4">{item?.serialNo}</td>
                      <td className="px-6 py-4">{item?.itemCategory}</td>
                      <td className="px-6 py-4">{item?.itemQuantity}</td>
                      <td className="px-6 py-4">{item?.itemModel}</td>
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
                        <ImageViewerModal
                          images={selectedItemImages}
                          isOpen={isImageModalOpen}
                          onClose={() => setIsImageModalOpen(false)}
                          itemName={selectedItemName}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                      Vehicle Model
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
            editing of Serial No & Model.
          </div>
          {/*<div className="flex gap-2">
            <button
              onClick={handleSaveReturnables}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Save Returnable Item Edits
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>*/}
        </div>
      </div>
    </div>
  );
};

// Main RequestDetails Component
const RequestDetails = () => {
  const { showToast } = useToast();

  // Search & filters
  const [searchRef, setSearchRef] = useState("");
  const [outLocationFilter, setOutLocationFilter] = useState("");
  const [inLocationFilter, setInLocationFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [transportData, setTransportData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [comment, setComment] = useState("");
  const [requests, setRequests] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  //const [transportData, setTransportData] = useState(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const filteredRows = useMemo(() => {
    let list = [...rows];

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
        (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
      );
    } else {
      list.sort(
        (a, b) =>
          new Date(b.updatedAt || b.request?.updatedAt || 0) -
          new Date(a.updatedAt || a.request?.updatedAt || 0)
      );
    }

    return list;
  }, [rows, outLocationFilter, inLocationFilter, companyFilter, searchRef]);

  const clearFilters = () => {
    setOutLocationFilter("");
    setInLocationFilter("");
    setCompanyFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const formatCompanyLabel = (row) =>
    row.request?.isNonSltPlace ? "Non-SLT Organization" : "SLT Branch";

  const formatStatusLabel = (row) => {
    const stage = row.stage || "";
    const status = row.status || "Pending";
    return `${stage} ${status} `;
  };
  // Replace your handleModelOpen function with this fixed version:

  
 
   const handleOpenModal = async (request) => {
     setSelectedRequest(request);
     if (request.employeeServiceNo) {
    try {
      const senderData = await searchReceiverByServiceNo(request.employeeServiceNo);
      console.log("✅ Fetched sender data:", senderData);
      setUser(senderData); // Store sender details in 'user' state
    } catch (error) {
      console.error("❌ Error fetching sender details:", error);
      setUser(null);
    }
  } else {
    setUser(null);
  }
     // Fetch receiver details if not already available
     // For Non-SLT destinations, use the receiver info from the request itself
     if (request.isNonSltPlace) {
       // Set Non-SLT receiver details
       setReceiver({
         name: request.receiverName,
         nic: request.receiverNIC,
         contactNo: request.receiverContact,
         serviceNo: request.receiverServiceNo || "N/A",
         group: "Non-SLT",
       });
     } else if (request.receiverServiceNo && !request.receiver) {
       // For SLT destinations, fetch from database
       try {
         const receiverData = await searchReceiverByServiceNo(
           request.receiverServiceNo
         );
         setReceiver(receiverData);
       } catch (error) {
         console.error("Error fetching receiver details:", error);
         setReceiver(null);
       }
     } else {
       setReceiver(request.receiver || null);
     }
 
     if (request?.transport.transporterServiceNo) {
       try {
         const transport = await searchReceiverByServiceNo(
           request?.transport.transporterServiceNo
         );
         setTransportData(transport);
       } catch (error) {
         console.error("Error fetching transporter details:", error);
         setTransportData(null);
       }
     } else {
       setTransportData(request.transport || null);
     }
 
     setIsModalOpen(true);
   };
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Requests' Details
          </h1>
          <p className="text-gray-500 flex items-center">
            <FaInfoCircle className="mr-2 text-blue-500" />
            Manage and review all gate pass requests
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Search & Filter Section */}
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
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Entry Point (Out Location)
              </label>
              <input
                type="text"
                value={outLocationFilter}
                onChange={(e) => setOutLocationFilter(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Exit Point (In Location)
              </label>
              <input
                type="text"
                value={inLocationFilter}
                onChange={(e) => setInLocationFilter(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
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
              <th className="px-6 py-4 w-30 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-4 w-40 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Date &amp; Time
              </th>
              <th className="px-6 py-4 w-40 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 w-40 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-6 text-center text-sm text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
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
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatDateTime(
                        row.updatedAt ||
                          row.request?.updatedAt ||
                          row.request?.createdAt
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatStatusLabel(row)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleOpenModal(row.request)}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
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

      {/* Modal */}
      {/* Details Modal */}
      <RequestDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        request={selectedRequest}
        user={user}
        receiver={receiver}
        transporterDetails={transportData}
      />
    </div>
  );
};

export default RequestDetails;