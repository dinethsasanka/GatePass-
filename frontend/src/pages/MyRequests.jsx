import React, { useState, useEffect } from "react";
import {
  getGatePassRequest,
  searchReceiverByServiceNo,
  searchEmployeeByServiceNo,
  getImageUrl,
  getImageUrlSync,
  getExecutiveOfficers,
  updateExecutiveOfficer,
  cancelRequest,
  updateReturnableItems, // <-- used for saving sender edits
} from "../services/requestService.js";
import {
  FaClock,
  FaEye,
  FaUser,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaUserCheck,
  FaTimes,
  FaSearch,
  FaFilter,
  FaTruck,
  FaFilePdf,
  FaBan,
  FaUndo,
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import logoUrl from "../assets/SLTMobitel_Logo.png";
import { markItemsAsReturned} from "../services/myRequestService.js";


const StatusPill = ({ statusCode }) => {
  const getStatusLabel = (code) => {
    const statusMap = {
      1: "Executive Pending",
      2: "Executive Approved",
      3: "Executive Rejected",
      4: "Verify Pending",
      5: "Verify Approved",
      6: "Verify Rejected",
      7: "Dispatch Pending",
      8: "Dispatch Approved",
      9: "Dispatch Rejected",
      10: "Receive Pending",
      11: "Received Approved",
      12: "Received Rejected",
      13: "Canceled",
    };
    return statusMap[code] || "Unknown";
  };

  const getStatusStyle = (code) => {
    const baseStyles =
      "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    const status = getStatusLabel(code);

    if (status.includes("Pending"))
      return `${baseStyles} bg-amber-100 text-amber-800`;
    if (status.includes("Approved"))
      return `${baseStyles} bg-emerald-100 text-emerald-800`;
    if (status.includes("Rejected"))
      return `${baseStyles} bg-rose-100 text-rose-800`;
    if (status === "Canceled") return `${baseStyles} bg-gray-100 text-gray-800`;
    return `${baseStyles} bg-gray-100 text-gray-800`;
  };

  return (
    <span className={getStatusStyle(statusCode)}>
      {getStatusLabel(statusCode)}
    </span>
  );
};

// In the ImageViewerModal component
const ImageViewerModal = ({ images, isOpen, onClose, itemName }) => {
  const [imageUrls, setImageUrls] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (images && images.length > 0) {
    setLoading(true);

    const urls = images
      .slice(0, 5)
      .map(img => getImageUrlSync(img))
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
          {/* Main display area */}
          <div className="h-80 md:h-96 overflow-hidden relative bg-black">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-white">Loading images...</div>
              </div>
            ) : imageUrls.length > 0 ? (
              <img
                src={imageUrls[activeIndex]}
                alt={`${itemName} ${activeIndex + 1}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error('Image failed to load:', imageUrls[activeIndex]);
                  e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-white">No images available</div>
              </div>
            )}

            {/* Navigation arrows - only show if multiple images */}
            {imageUrls.length > 1 && (
              <>
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
              </>
            )}

            {/* Image counter */}
            {imageUrls.length > 0 && (
              <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {activeIndex + 1} / {imageUrls.length}
              </div>
            )}
          </div>

          {/* Header with close button */}
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

        {/* Thumbnail gallery */}
        {imageUrls.length > 1 && (
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
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/64?text=Error';
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
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

  // Set the selected executive when request or executiveOfficers change
  useEffect(() => {
    if (request && executiveOfficers.length > 0) {
      const matchingOfficer = executiveOfficers.find(
        (officer) => officer.serviceNo === request.executiveOfficerServiceNo
      );
      if (matchingOfficer) {
        setSelectedExecutive(matchingOfficer.serviceNo);
      }
    }
  }, [request, executiveOfficers]);

  useEffect(() => {
    getExecutiveOfficers()
      .then((officers) => setExecutiveOfficers(officers))
      .catch((error) => console.error("Error:", error));
  }, []);

  // Seed editable items whenever a new request opens
  useEffect(() => {
    if (!request) return;
    const items = Array.isArray(request.items) ? request.items : [];
    setEditedItems(items.map((i) => ({ ...i }))); // clone
    setSaveItemsSuccess(false);
    setSaveItemsError("");
  }, [request?._id]);

  const handleExecutiveChange = async (e) => {
    const newExecutive = e.target.value;
    setSelectedExecutive(newExecutive);
    try {
      const selectedOfficer = executiveOfficers.find(
        (officer) => officer.serviceNo === newExecutive
      );
      await updateExecutiveOfficer(request._id, selectedOfficer.serviceNo);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating executive:", error);
    }
  };

  if (!isOpen || !request) return null;

  const handleBulkReturn = async () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to return");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to mark ${selectedItems.length} item(s) as returned?`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await markItemsAsReturned(
        request.referenceNumber,
        selectedItems
      );

      alert(
        `Successfully marked ${
          response.updatedCount || selectedItems.length
        } item(s) as returned`
      );

      // Clear selection
      setSelectedItems([]);

      // Close modal and refresh the parent component
      onClose();

      // Optional: Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Error marking items as returned:", error);
      alert(error.message || "Failed to update items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleSaveReturnables = async () => {
    try {
      setSaveItemsError("");
      // Only send returnable rows, keep payload minimal for backend
      const payload = editedItems
        .filter(
          (it) => it?.itemReturnable === true || it?.isReturnable === true
        )
        .map((it) => ({
          _id: it._id, // <-- match DB item
          serialNumber: it.serialNo || "", // <-- map UI field to backend key
          model: it.itemModel || "",
        }));

      // If nothing to save, succeed silently
      if (!payload.length) {
        setSaveItemsSuccess(true);
        setTimeout(() => setSaveItemsSuccess(false), 2500);
        return;
      }

      await updateReturnableItems(request.referenceNumber, payload);
      setSaveItemsSuccess(true);
      setTimeout(() => setSaveItemsSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to update returnable items:", err);
      setSaveItemsError(
        err?.response?.data?.message || "Failed to update returnable items"
      );
      setTimeout(() => setSaveItemsError(""), 3500);
    }
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
    doc.text(`Reference: ${request.referenceNumber}`, pageWidth / 2, 30, {
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
    //const col4Width = 20; // Quantity
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
      // doc.text(
      //   item?.itemQuantity?.toString() || "1",
      //   margin + col1Width + col2Width + col3Width + 3,
      //   yPos + 5.5
      // );
      doc.text(
        truncateText(item?.itemModel || "N/A", 15),
        margin + col1Width + col2Width + col3Width + col4Width + 3,
        yPos + 5.5
      );

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
    doc.save(`SLT_GatePass_Items_${refNo}.pdf`);
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
          {/* Sender Details */}
          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 flex items-center mb-4">
              <FaUser className="mr-2" /> Sender Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-blue-600">
                  Service No
                </label>
                <p className="text-gray-800">{user?.serviceNo}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-600">
                  Name
                </label>
                <p className="text-gray-800">{user?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-600">
                  Section
                </label>
                <p className="text-gray-800">{user?.section}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-600">
                  Group
                </label>
                <p className="text-gray-800">{user?.group}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-600">
                  Designation
                </label>
                <p className="text-gray-800">{user?.designation}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-600">
                  Contact
                </label>
                <p className="text-gray-800">{user?.contactNo}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
              <FaBoxOpen className="mr-2" /> Item Details
              <button
                onClick={() =>
                  generateItemDetailsPDF(request.items, request.refNo)
                }
                className="ml-auto px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center transition-colors"
              >
                <FaFilePdf className="mr-2" /> Download Items PDF
              </button>
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

          {/* Returnable Items Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
              <FaUndo className="mr-2" /> Returnable Items
            </h3>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Serial No
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {request?.items
                    ?.filter((item) => item.status === "return to Sender")
                    .map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedItems?.includes(item.serialNo)}
                            onChange={() => handleSelect(item.serialNo)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">{item.itemName}</td>
                        <td className="px-6 py-4">{item.serialNo}</td>
                        <td className="px-6 py-4">{item?.itemQuantity}</td>
                        <td className="px-6 py-4">{item?.itemModel}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="text-right mt-4">
              <button
                onClick={handleBulkReturn}
                disabled={selectedItems?.length === 0 || loading}
                className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                  selectedItems?.length === 0
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Mark as 'Returned' ({selectedItems?.length || 0})
              </button>
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
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Executive Officer
                  </label>
                  <select
                    value={selectedExecutive}
                    onChange={handleExecutiveChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {executiveOfficers.map((officer) => (
                      <option key={officer.serviceNo} value={officer.serviceNo}>
                        {officer.name} - {officer.designation}
                      </option>
                    ))}
                  </select>
                  {updateSuccess && (
                    <p className="text-sm text-green-600 mt-1">
                      Executive officer updated successfully!
                    </p>
                  )}
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

const GatePassRequests = () => {
  const [requests, setRequests] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [transportData, setTransportData] = useState(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // In your useEffect where you fetch data
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData) {
      setUser(userData);
      getGatePassRequest(userData.serviceNo)
        .then((data) => {
          const requestsArray = Array.isArray(data) ? data : [data];

          // Sort requests by creation date (newest first)
          const sortedRequests = requestsArray.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.updatedAt || 0);
            const dateB = new Date(b.createdAt || b.updatedAt || 0);
            return dateB - dateA; // Descending order (newest first)
          });

          setRequests(sortedRequests);

          // Fetch receiver details only for requests with valid receiverServiceNo
          sortedRequests.forEach((request) => {
            if (request.receiverServiceNo) {
              searchReceiverByServiceNo(request.receiverServiceNo)
                .then((receiverData) => {
                  // Update the request with receiver details
                  setRequests((prevRequests) =>
                    prevRequests.map((r) =>
                      r.referenceNumber === request.referenceNumber
                        ? { ...r, receiver: receiverData }
                        : r
                    )
                  );
                })
                .catch((error) => {
                  // Silently handle missing receivers - expected for test data
                });
            } else {
              // Set an empty receiver object for requests with no receiver
              setRequests((prevRequests) =>
                prevRequests.map((r) =>
                  r.referenceNumber === request.referenceNumber
                    ? { ...r, receiver: null }
                    : r
                )
              );
            }
          });
        })
        .catch((error) => console.error("Error fetching requests:", error));
    }
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      // Set the receiver from the selected request's receiver property
      setReceiver(selectedRequest.receiver || null);
    }
  }, [selectedRequest]);

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = request.referenceNumber
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || request.status.toString() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenModal = async (request) => {
    setSelectedRequest(request);

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

      if (request?.transport?.transporterServiceNo) {
    try {
      const transportResponse = await searchEmployeeByServiceNo(
        request.transport.transporterServiceNo
      );
      
      console.log("Transport response:", transportResponse); // Debug log
      
      // Extract the employee data from the nested response
      const employee = transportResponse?.data?.data?.[0];
      
      if (employee) {
        setTransportData({
          name: `${employee.employeeTitle || ""} ${employee.employeeFirstName || ""} ${employee.employeeSurname || ""}`.trim(),
          serviceNo: employee.employeeNo || request.transport.transporterServiceNo,
          designation: employee.designation || "-",
          section: employee.empSection || "-",
          group: employee.empGroup || "-",
          contactNo: employee.mobileNo || "-"
        });
      } else {
        // If no employee data found, set to null
        setTransportData(null);
      }
    } catch (error) {
      console.error("Error fetching transporter details:", error);
      setTransportData(null);
    }
  } else {
    setTransportData(null);
  }

  setIsModalOpen(true);
}
  

  const handleCancelRequest = async (referenceNumber) => {
    if (window.confirm("Are you sure you want to cancel this request?")) {
      try {
        await cancelRequest(referenceNumber);
        setCancelSuccess(true);
        setTimeout(() => setCancelSuccess(false), 3000);

        // Refresh the requests list
        const userData = JSON.parse(localStorage.getItem("user"));
        if (userData) {
          const data = await getGatePassRequest(userData.serviceNo);
          const requestsArray = Array.isArray(data) ? data : [data];

          // Sort requests by creation date (newest first)
          const sortedRequests = requestsArray.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.updatedAt || 0);
            const dateB = new Date(b.createdAt || b.updatedAt || 0);
            return dateB - dateA; // Descending order (newest first)
          });

          setRequests(sortedRequests);
        }
      } catch (error) {
        console.error("Error canceling request:", error);
        alert("Failed to cancel request. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-8">
      {/* Success message for cancel */}
      {cancelSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Request canceled successfully!
        </div>
      )}
      {/* Search and Filter Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by reference number or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="1">Executive Pending</option>
                <option value="2">Executive Approved</option>
                <option value="3">Executive Rejected</option>
                <option value="4">Verify Pending</option>
                <option value="5">Verify Approved</option>
                <option value="6">Verify Rejected</option>
                <option value="7">Dispatch Pending</option>
                <option value="8">Dispatch Approved</option>
                <option value="9">Dispatch Rejected</option>
                <option value="10">Receive Pending</option>
                <option value="11">Receive Approved</option>
                <option value="12">Receive Rejected</option>
                <option value="13">Canceled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FaClock className="mr-2 text-blue-500" />
            My Gate Pass Requests
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Ref No
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((request) => (
                <tr
                  key={request.referenceNumber}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {request.referenceNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusPill statusCode={request.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(request)}
                        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                      >
                        <FaEye className="mr-2" /> View Details
                      </button>
                      {/* Add cancel button - only show for pending status (status 1) */}
                      {request.status === 1 && (
                        <button
                          onClick={() =>
                            handleCancelRequest(request.referenceNumber)
                          }
                          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                        >
                          <FaBan className="mr-2" /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FaBoxOpen className="text-4xl text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No requests found</p>
            <p className="text-gray-400 text-sm">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Your gate pass requests will appear here"}
            </p>
          </div>
        )}
      </div>

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

export default GatePassRequests;