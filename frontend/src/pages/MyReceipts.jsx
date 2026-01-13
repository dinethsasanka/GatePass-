import React, { useState, useEffect } from "react";
import {
  getGatePassRequest,
  searchReceiverByServiceNo,
  getImageUrl,
  getExecutiveOfficers,
  updateExecutiveOfficer,
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
} from "react-icons/fa";
import { getItemForReceiver } from "../services/myReceiptService.js";

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
          {/* Main display area */}
          <div className="h-80 md:h-96 overflow-hidden relative bg-black">
            {imageUrls.length > 0 && (
              <img
                src={imageUrls[activeIndex]}
                alt={`${itemName} ${activeIndex + 1}`}
                className="w-full h-full object-contain"
              />
            )}

            {/* Navigation arrows */}
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

            {/* Image counter */}
            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {activeIndex + 1} / {imageUrls.length}
            </div>
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

const RequestDetailsModal = ({ isOpen, onClose, request, user, receiver }) => {
  // Initialize with the correct value from request
  const [selectedExecutive, setSelectedExecutive] = useState("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedItemImages, setSelectedItemImages] = useState([]);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [executiveOfficers, setExecutiveOfficers] = useState([]);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Set the selected executive when request or executiveOfficers change
  useEffect(() => {
    if (request && executiveOfficers.length > 0) {
      // Find the matching executive officer by name
      const matchingOfficer = executiveOfficers.find(
        (officer) =>
          officer.name === request.executiveOfficerName ||
          officer.serviceNo === request.executiveOfficerName
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

  const handleExecutiveChange = async (e) => {
    const newExecutive = e.target.value;
    setSelectedExecutive(newExecutive);

    try {
      // Find the officer object to get the name
      const selectedOfficer = executiveOfficers.find(
        (officer) => officer.serviceNo === newExecutive
      );

      // When updating, you may want to store either the name or the service number consistently
      await updateExecutiveOfficer(
        request._id,
        selectedOfficer ? selectedOfficer.name : newExecutive
      );
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating executive:", error);
    }
  };

  if (!isOpen || !request) return null;

  const handleViewImages = (item) => {
    setSelectedItemImages(item.itemPhotos);
    setSelectedItemName(item.itemName);
    setIsImageModalOpen(true);
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
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item?.itemReturnable
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.itemReturnable
                            ? "Returnable"
                            : "Non-Returnable"}
                        </span>
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
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const GatePassMyReicept = () => {
  const [requests, setRequests] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData) {
      setUser(userData);
      getItemForReceiver()
        .then((data) => {
          const requestsArray = Array.isArray(data) ? data : [data];
          setRequests(requestsArray);

          // Fetch receiver details only for requests with valid receiverServiceNo
          requestsArray.forEach((request) => {
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
                .catch((error) =>
                  console.error("Error fetching receiver:", error)
                );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-8">
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
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                    >
                      <FaEye className="mr-2" /> View Details
                    </button>
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
      />
    </div>
  );
};

export default GatePassMyReicept;
