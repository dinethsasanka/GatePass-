import { useState, useEffect } from "react";
import {
  getPendingStatuses,
  getApprovedStatuses,
  getRejectedStatuses,
  approveStatus,
  rejectStatus,
  searchUserByServiceNo,
  markItemsAsReturned,
  addReturnableItemToRequest,
} from "../services/VerifyService.js";
import { getUserByRoleAndBranch } from "../services/userManagementService.js";
import { getEmployeeDetails } from "../services/erpService";
import {
  getImageUrl,
  getImageUrlSync,
  searchEmployeeByServiceNo,
  searchReceiverByServiceNo,
} from "../services/RequestService.js";
import { useToast } from "../components/ToastProvider.jsx";
import { emailSent } from "../services/emailService.js";
import { jsPDF } from "jspdf";
import logoUrl from "../assets/SLTMobitel_Logo.png";
import { useLocation } from "react-router-dom";
import {
  getCachedUser,
  getCachedUserAllowRefresh,
  setCachedUser,
} from "../utils/userCache.js";
import { useAutoRefetch } from "../hooks/useRealtimeUpdates.js";
import {
  FaClock,
  FaEye,
  FaUser,
  FaPlus,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaUserCheck,
  FaTimes,
  FaInfoCircle,
  FaTimesCircle,
  FaCheckCircle,
  FaTruck,
  FaSearch,
  FaCheck,
  FaPrint,
  FaBoxes,
  FaBuilding,
  FaUserFriends,
  FaHardHat,
  FaFilePdf,
  FaArrowLeft,
  FaArrowRight,
  FaUndo,
} from "react-icons/fa";

// Helper function to detect Non-SLT identifiers
const isNonSltIdentifier = (serviceNo) => {
  if (!serviceNo) return false;
  // Check for NSL prefix
  if (serviceNo.startsWith("NSL")) return true;
  return false;
};

const ensureReceiverDetails = (receiverDetails, receiverServiceNo, request) => {
  if (receiverDetails || !receiverServiceNo) return receiverDetails;
  return {
    name:
      request?.receiverName ||
      request?.requestDetails?.receiverName ||
      request?.request?.receiverName ||
      "N/A",
    serviceNo: receiverServiceNo,
    group: "N/A",
    contactNo:
      request?.receiverContact ||
      request?.requestDetails?.receiverContact ||
      request?.request?.receiverContact ||
      "N/A",
  };
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

const fetchReceiverFromErp = async (serviceNo) => {
  try {
    const response = await searchEmployeeByServiceNo(serviceNo);
    const employee =
      response?.data?.data?.[0] ||
      response?.data?.data ||
      response?.data?.[0] ||
      response?.data ||
      null;
    return mapErpEmployeeToReceiver(employee, serviceNo);
  } catch {
    return null;
  }
};

const fetchReceiverDetails = async (serviceNo) => {
  try {
    const userData = await searchUserByServiceNo(serviceNo);
    if (userData) return userData;
  } catch {}
  return await fetchReceiverFromErp(serviceNo);
};

const fetchOfficerData = async (status) => {
  const execServiceNo =
    status?.executiveOfficerServiceNo ||
    status?.request?.executiveOfficerServiceNo;
  const verifyServiceNo =
    status?.verifyOfficerServiceNumber ||
    status?.verifyOfficerServiceNo ||
    status?.request?.verifyOfficerServiceNo;

  let executiveOfficerData = null;
  let verifyOfficerData = null;

  if (execServiceNo) {
    try {
      executiveOfficerData = await getCachedUser(
        execServiceNo,
        searchUserByServiceNo,
      );
    } catch {}
  }

  if (verifyServiceNo) {
    try {
      verifyOfficerData = await getCachedUser(
        verifyServiceNo,
        searchUserByServiceNo,
      );
    } catch {}
  }

  return { executiveOfficerData, verifyOfficerData };
};

const Verify = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setselectedItem] = useState(null);
  const [comment, setComment] = useState("");
  const [pendingDESCRIPTIONs, setPendingDESCRIPTIONs] = useState([]);
  const [approvedDESCRIPTIONs, setApprovedDESCRIPTIONs] = useState([]);
  const [rejectedDESCRIPTIONs, setRejectedDESCRIPTIONs] = useState([]);
  const [transportData, setTransportData] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const location = useLocation();

  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const role = loggedUser?.role?.toUpperCase();
  const isSuperAdmin = role === "SUPERADMIN";

  // Add states for loading/unloading details
  const [staffType, setStaffType] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [searchedEmployee, setSearchedEmployee] = useState(null);

  const [nonSltStaffDetails, setNonSltStaffDetails] = useState({
    name: "",
    companyName: "",
    nic: "",
    contactNo: "",
    email: "",
  });
  const [formErrors, setFormErrors] = useState({
    name: "",
    companyName: "",
    nic: "",
    contactNo: "",
    email: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [companyTypeFilter, setCompanyTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Validation function for non-SLT employee details
  const validateField = (field, value) => {
    let error = "";

    switch (field) {
      case "name":
        if (!value.trim()) {
          error = "Name is required";
        } else if (value.trim().length < 2) {
          error = "Name must be at least 2 characters";
        } else {
          // Only allow letters, spaces, hyphens, apostrophes, and dots - no numbers
          const nameRegex = /^[a-zA-Z\s'.-]+$/;
          if (!nameRegex.test(value.trim())) {
            error =
              "Name can only contain letters, spaces, hyphens, apostrophes, and dots";
          }
        }
        break;

      case "companyName":
        if (!value.trim()) {
          error = "Company name is required";
        } else if (value.trim().length < 2) {
          error = "Company name must be at least 2 characters";
        }
        break;

      case "nic":
        if (!value.trim()) {
          error = "NIC is required";
        } else {
          // Sri Lankan NIC validation: 9 digits + V/X or 12 digits
          const nicRegex = /^(\d{9}[VvXx]|\d{12})$/;
          if (!nicRegex.test(value.trim())) {
            error = "NIC must be 9 digits + V/X or 12 digits";
          }
        }
        break;

      case "contactNo":
        if (!value.trim()) {
          error = "Contact number is required";
        } else {
          // Phone number validation: at least 10 digits, allows + and spaces
          const phoneRegex = /^[+]?[0-9\s-]{9,}$/;
          if (!phoneRegex.test(value.trim())) {
            error = "Contact number must be at least 10 digits";
          }
        }
        break;

      case "email":
        if (!value.trim()) {
          error = "Email is required";
        } else {
          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value.trim())) {
            error = "Please enter a valid email address";
          }
        }
        break;

      default:
        break;
    }

    return error;
  };

  // Handle field change with real-time validation
  const handleNonSltFieldChange = (field, value) => {
    setNonSltStaffDetails({
      ...nonSltStaffDetails,
      [field]: value,
    });

    const error = validateField(field, value);
    setFormErrors({
      ...formErrors,
      [field]: error,
    });
  };

  // Real-time updates for Verify page (status: 2 = Verifier Pending)
  useAutoRefetch(
    async () => {
      if (activeTab !== "pending") return;

      setIsLoading(true);
      try {
        const data = await getPendingStatuses();
        const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

        const filteredData = data; // backend already scoped by branches (or global for SuperAdmin)

        const pendingData = await Promise.all(
          filteredData.map(async (status) => {
            const senderServiceNo = status.request?.employeeServiceNo;
            const receiverServiceNo = status.request?.receiverServiceNo;
            const transportData = status.request?.transport;
            const loadingDetails = status.request?.loading;
            const statusDetails = status;
            const isNonSltPlace = status.request?.isNonSltPlace;
            let senderDetails = null;

            if (senderServiceNo === loggedUser.serviceNo) {
              senderDetails = {
                serviceNo: loggedUser.serviceNo,
                name: loggedUser.name,
                section: loggedUser.section || "N/A",
                group: loggedUser.group || "N/A",
                designation: loggedUser.designation || "N/A",
                contactNo: loggedUser.contactNo || "N/A",
                email: loggedUser.email || "N/A",
                branches: loggedUser.branches || "N/A",
              };
              setCachedUser(loggedUser.serviceNo, senderDetails);
            } else if (senderServiceNo) {
              try {
                senderDetails = await getCachedUser(
                  senderServiceNo,
                  searchUserByServiceNo,
                );
              } catch (error) {
                console.error(
                  "[Verify] Failed to fetch sender:",
                  senderServiceNo,
                  error.message,
                );
              }
            }

            if (!senderDetails && senderServiceNo) {
              senderDetails = {
                serviceNo: senderServiceNo,
                name: "N/A",
                section: "N/A",
                group: "N/A",
                designation: "N/A",
                contactNo: "N/A",
              };
            }

            let receiverDetails = null;
            if (
              receiverServiceNo &&
              !isNonSltPlace &&
              !isNonSltIdentifier(receiverServiceNo)
            ) {
              try {
                const userData = await fetchReceiverDetails(receiverServiceNo);
                if (userData) receiverDetails = userData;
              } catch (error) {}
            } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
              receiverDetails = {
                name: status.request?.receiverName || "N/A",
                nic: status.request?.receiverNIC || receiverServiceNo,
                contactNo: status.request?.receiverContact || "N/A",
              };
            }
            receiverDetails = ensureReceiverDetails(
              receiverDetails,
              receiverServiceNo,
              status.request,
            );

            let loadUserData = null;
            if (
              loadingDetails &&
              loadingDetails.staffType === "SLT" &&
              loadingDetails.staffServiceNo
            ) {
              try {
                const userData = await getCachedUser(
                  loadingDetails.staffServiceNo,
                  searchUserByServiceNo,
                );
                loadUserData = userData;
              } catch (error) {
                // Silently handle missing users - expected for test data
              }
            }

            const { executiveOfficerData, verifyOfficerData } =
              await fetchOfficerData(status);

            return {
              refNo: status.referenceNumber,
              senderDetails: senderDetails,
              receiverDetails: receiverDetails,
              transportData: transportData,
              loadingDetails: loadingDetails,
              inLocation: status.request?.inLocation,
              outLocation: status.request?.outLocation,
              createdAt: new Date(
                status.request?.createdAt || status.createdAt,
              ).toLocaleString(),
              items: status.request?.items || [],
              comment: status.comment,
              request: status.request,
              requestDetails: { ...status.request },
              loadUserData,
              statusDetails: statusDetails,
              executiveOfficerData,
              verifyOfficerData,
            };
          }),
        );

        setPendingDESCRIPTIONs(
          pendingData.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          ),
        );
      } catch (error) {
        console.error("Error fetching pending statuses:", error);
        showToast("Error loading pending items", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab],
    { status: 2 }, // Verifier pending requests
  );

  useEffect(() => {
    const fetchData = async () => {
      if (activeTab !== "pending") return;

      setIsLoading(true);
      try {
        const data = await getPendingStatuses();
        // Get logged-in user details
        const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

        // PL1 (Verify) manages verification FROM their branch (outLocation)
        // Filter to only show items leaving from their branch
        // const filteredData = data.filter(
        //   (status) =>
        //     status?.request &&
        //     status.request.outLocation &&
        //     loggedUser?.branches?.includes(status.request.outLocation)
        // );
        const filteredData = data;

        // Process each status with async operations
        const pendingData = await Promise.all(
          filteredData.map(async (status) => {
            const senderServiceNo = status.request?.employeeServiceNo;
            const receiverServiceNo = status.request?.receiverServiceNo;
            const transportData = status.request?.transport;
            const loadingDetails = status.request?.loading;
            const statusDetails = status;
            const isNonSltPlace = status.request?.isNonSltPlace;
            let senderDetails = null;
            // Check if the sender is the logged-in user
            if (senderServiceNo === loggedUser.serviceNo) {
              senderDetails = {
                serviceNo: loggedUser.serviceNo,
                name: loggedUser.name,
                section: loggedUser.section || "N/A",
                group: loggedUser.group || "N/A",
                designation: loggedUser.designation || "N/A",
                contactNo: loggedUser.contactNo || "N/A",
                email: loggedUser.email || "N/A",
                branches: loggedUser.branches || "N/A",
              };
              setCachedUser(loggedUser.serviceNo, senderDetails);
            } else if (senderServiceNo) {
              // Fetch sender details for any service number
              try {
                senderDetails = await getCachedUser(
                  senderServiceNo,
                  searchUserByServiceNo,
                );
              } catch (error) {
                console.error(
                  "[Verify] Failed to fetch sender:",
                  senderServiceNo,
                  error.message,
                );
              }
            }

            // If sender details couldn't be fetched, create a basic object with at least the service number
            if (!senderDetails && senderServiceNo) {
              senderDetails = {
                serviceNo: senderServiceNo,
                name: "N/A",
                section: "N/A",
                group: "N/A",
                designation: "N/A",
                contactNo: "N/A",
              };
            }
            let receiverDetails = null;
            if (
              receiverServiceNo &&
              !isNonSltPlace &&
              !isNonSltIdentifier(receiverServiceNo)
            ) {
              try {
                const userData = await fetchReceiverDetails(receiverServiceNo);
                if (userData) receiverDetails = userData;
              } catch (error) {}
            } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
              receiverDetails = {
                name: status.request?.receiverName || "N/A",
                nic: status.request?.receiverNIC || receiverServiceNo,
                contactNo: status.request?.receiverContact || "N/A",
              };
            }
            receiverDetails = ensureReceiverDetails(
              receiverDetails,
              receiverServiceNo,
              status.request,
            );

            let loadUserData = null;
            if (
              loadingDetails &&
              loadingDetails.staffType === "SLT" &&
              loadingDetails.staffServiceNo
            ) {
              try {
                const userData = await getCachedUser(
                  loadingDetails.staffServiceNo,
                  searchUserByServiceNo,
                );
                loadUserData = userData;
              } catch (error) {
                // Silently handle missing users - expected for test data
              }
            }

            const { executiveOfficerData, verifyOfficerData } =
              await fetchOfficerData(status);
            return {
              refNo: status.referenceNumber,
              senderDetails: senderDetails,
              receiverDetails: receiverDetails,
              transportData: transportData,
              loadingDetails: loadingDetails,
              inLocation: status.request?.inLocation,
              outLocation: status.request?.outLocation,
              createdAt: new Date(
                status.request?.createdAt || status.createdAt,
              ).toLocaleString(),
              items: status.request?.items || [],
              comment: status.comment,
              request: status.request,
              requestDetails: { ...status.request },
              loadUserData,
              statusDetails: statusDetails,
              executiveOfficerData,
              verifyOfficerData,
            };
          }),
        );

        setPendingDESCRIPTIONs(
          pendingData.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          ),
        );
      } catch (error) {
        console.error("Error fetching pending statuses:", error);
        showToast("Error loading pending items", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  // Fetch Approved items
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getApprovedStatuses();
        // Get logged-in user details
        const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

        // PL1 (Verify) manages verification FROM their branch (outLocation)
        // Filter to only show items leaving from their branch
        const filteredData = data;

        // Process each status with async operations - OPTIMIZED: Only fetch sender and receiver
        const approvedData = await Promise.all(
          filteredData.map(async (status) => {
            const senderServiceNo = status.request?.employeeServiceNo;
            const receiverServiceNo = status.request?.receiverServiceNo;
            const transportData = status.request?.transport;
            const loadingDetails = status.request?.loading;
            const statusDetails = status;
            const isNonSltPlace = status.request?.isNonSltPlace;
            let senderDetails = null;
            let receiverDetails = null;

            // Check if the sender is the logged-in user
            if (senderServiceNo === loggedUser.serviceNo) {
              // Use logged-in user's data for sender details
              senderDetails = {
                serviceNo: loggedUser.serviceNo,
                name: loggedUser.name,
                section: loggedUser.section || "N/A",
                group: loggedUser.group || "N/A",
                designation: loggedUser.designation || "N/A",
                contactNo: loggedUser.contactNo || "N/A",
                email: loggedUser.email || "N/A",
                branches: loggedUser.branches || "N/A",
              };
              setCachedUser(loggedUser.serviceNo, senderDetails);
            } else if (senderServiceNo) {
              // Fetch sender details for any service number
              try {
                senderDetails = await getCachedUser(
                  senderServiceNo,
                  searchUserByServiceNo,
                );
              } catch (error) {
                // Silently handle missing users
              }
            }

            // If sender details couldn't be fetched, create a basic object with at least the service number
            if (!senderDetails && senderServiceNo) {
              senderDetails = {
                serviceNo: senderServiceNo,
                name: "N/A",
                section: "N/A",
                group: "N/A",
                designation: "N/A",
                contactNo: "N/A",
              };
            }

            // Only fetch receiver if SLT Branch destination
            if (
              receiverServiceNo &&
              !isNonSltPlace &&
              !isNonSltIdentifier(receiverServiceNo)
            ) {
              try {
                receiverDetails = await getCachedUserAllowRefresh(
                  receiverServiceNo,
                  fetchReceiverDetails,
                );
              } catch (error) {
                // Silently handle missing users
              }
            } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
              receiverDetails = {
                name: status.request?.receiverName || "N/A",
                nic: status.request?.receiverNIC || receiverServiceNo,
                contactNo: status.request?.receiverContact || "N/A",
              };
            }
            receiverDetails = ensureReceiverDetails(
              receiverDetails,
              receiverServiceNo,
              status.request,
            );

            let loadUserData = null;
            if (
              loadingDetails &&
              loadingDetails.staffType === "SLT" &&
              loadingDetails.staffServiceNo
            ) {
              try {
                const userData = await getCachedUser(
                  loadingDetails.staffServiceNo,
                  searchUserByServiceNo,
                );
                loadUserData = userData;
              } catch (error) {
                // Silently handle missing users - expected for test data
              }
            }

            const { executiveOfficerData, verifyOfficerData } =
              await fetchOfficerData(status);

            return {
              refNo: status.referenceNumber,
              senderDetails: senderDetails,
              receiverDetails: receiverDetails,
              transportData: transportData,
              loadingDetails: loadingDetails,
              inLocation: status.request?.inLocation,
              outLocation: status.request?.outLocation,
              createdAt: new Date(
                status.request?.createdAt || status.createdAt,
              ).toLocaleString(),
              items: status.request?.items || [],
              comment: status.verifyOfficerComment,
              request: status.request,
              requestDetails: { ...status.request },
              loadUserData,
              statusDetails: statusDetails,
              executiveOfficerData,
              verifyOfficerData,
            };
          }),
        );

        setApprovedDESCRIPTIONs(
          approvedData.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          ),
        );
      } catch (error) {
        console.error("Error fetching approved statuses:", error);
        showToast("Error loading approved items", "error");
      }
    };
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getRejectedStatuses();
        // Get logged-in user details
        const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

        // PL1 (Verify) manages verification FROM their branch (outLocation)
        // Filter to only show items leaving from their branch
        const filteredData = data;

        // Process each status with async operations
        const rejectedData = await Promise.all(
          filteredData.map(async (status) => {
            const senderServiceNo = status.request?.employeeServiceNo;
            const receiverServiceNo = status.request?.receiverServiceNo;
            const transportData = status.request?.transport;
            const loadingDetails = status.request?.loading;
            const statusDetails = status;
            const isNonSltPlace = status.request?.isNonSltPlace;
            let senderDetails = null;

            // Check if the sender is the logged-in user
            if (senderServiceNo === loggedUser.serviceNo) {
              // Use logged-in user's data for sender details
              senderDetails = {
                serviceNo: loggedUser.serviceNo,
                name: loggedUser.name,
                section: loggedUser.section || "N/A",
                group: loggedUser.group || "N/A",
                designation: loggedUser.designation || "N/A",
                contactNo: loggedUser.contactNo || "N/A",
                email: loggedUser.email || "N/A",
                branches: loggedUser.branches || "N/A",
              };
              setCachedUser(loggedUser.serviceNo, senderDetails);
            } else if (senderServiceNo) {
              // Fetch sender details for any service number
              try {
                senderDetails = await getCachedUser(
                  senderServiceNo,
                  searchUserByServiceNo,
                );
              } catch (error) {
                // Silently handle missing users
              }
            }

            // If sender details couldn't be fetched, create a basic object with at least the service number
            if (!senderDetails && senderServiceNo) {
              senderDetails = {
                serviceNo: senderServiceNo,
                name: "N/A",
                section: "N/A",
                group: "N/A",
                designation: "N/A",
                contactNo: "N/A",
              };
            }

            let receiverDetails = null;

            // Only fetch receiver details if it's an SLT Branch destination
            // Check if receiverServiceNo is not a Non-SLT identifier (like NSL789)
            if (
              receiverServiceNo &&
              !isNonSltPlace &&
              !isNonSltIdentifier(receiverServiceNo)
            ) {
              try {
                const userData = await getCachedUserAllowRefresh(
                  receiverServiceNo,
                  fetchReceiverDetails,
                );
                if (userData) {
                  receiverDetails = userData;
                }
              } catch (error) {
                // Silently handle missing users - expected for test data
              }
            } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
              // For Non-SLT destinations, use the receiver details from the request
              receiverDetails = {
                name: status.request?.receiverName || "N/A",
                nic: status.request?.receiverNIC || receiverServiceNo,
                contactNo: status.request?.receiverContact || "N/A",
              };
            }
            receiverDetails = ensureReceiverDetails(
              receiverDetails,
              receiverServiceNo,
              status.request,
            );

            let loadUserData = null;

            if (
              loadingDetails &&
              loadingDetails.staffType === "SLT" &&
              loadingDetails.staffServiceNo
            ) {
              try {
                const userData = await getCachedUser(
                  loadingDetails.staffServiceNo,
                  searchUserByServiceNo,
                );
                loadUserData = userData;
              } catch (error) {
                // Silently handle missing users - expected for test data
              }
            }

            const { executiveOfficerData, verifyOfficerData } =
              await fetchOfficerData(status);

            return {
              refNo: status.referenceNumber,
              senderDetails: senderDetails,
              receiverDetails: receiverDetails,
              transportData: transportData,
              loadingDetails: loadingDetails,
              inLocation: status.request?.inLocation,
              outLocation: status.request?.outLocation,
              createdAt: new Date(
                status.request?.createdAt || status.createdAt,
              ).toLocaleString(),
              items: status.request?.items || [],
              comment: status.verifyOfficerComment,
              request: status.request,
              requestDetails: { ...status.request },
              loadUserData: loadUserData,
              statusDetails: statusDetails,
              executiveOfficerData,
              verifyOfficerData,
              rejectedBy: status.rejectedBy,
              rejectedByServiceNo: status.rejectedByServiceNo,
              rejectedByBranch: status.rejectedByBranch,
              rejectedAt: status.rejectedAt,
              rejectionLevel: status.rejectionLevel,
            };
          }),
        );

        setRejectedDESCRIPTIONs(
          rejectedData.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          ),
        );
      } catch (error) {
        console.error("Error fetching rejected statuses:", error);
        showToast("Error loading rejected items", "error");
      }
    };
    fetchData();
  }, [activeTab]);

  const StatusPill = ({ status }) => {
    const styles = {
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-emerald-100 text-emerald-800",
      rejected: "bg-rose-100 text-rose-800",
    };
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUserDetails(userData);
  }, [activeTab]);

  // Email function for petrol leader
  const sendApprovalEmailToPetrolLeader = async (
    petrolLeaderEmail,
    request,
    comment,
  ) => {
    try {
      if (!petrolLeaderEmail) {
        console.error("No email provided for petrol leader");
        return;
      }

      const emailSubject = `Gate Pass Request ${request.refNo} - Approved for Loading`;

      const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #28a745; margin-bottom: 5px;">Gate Pass Request Approved</h2>
          <p style="color: #757575; font-size: 14px;">Reference Number: ${
            request.refNo
          }</p>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
          <p>Dear Petrol Leader,</p>
          <p>A gate pass request has been <strong>approved</strong> by the verify officer and is ready for loading coordination.</p>
          
          ${
            comment
              ? `
          <div style="margin-top: 15px;">
            <p><strong>Verify Officer Comment:</strong></p>
            <p style="padding: 10px; background-color: #fff; border-left: 3px solid #28a745; margin-top: 5px;">${comment}</p>
          </div>
          `
              : ""
          }
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #757575; width: 40%;">Requester:</td>
              <td style="padding: 8px 0;">${
                request.senderDetails?.name || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">From Location:</td>
              <td style="padding: 8px 0;">${request.outLocation}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">To Location:</td>
              <td style="padding: 8px 0;">${request.inLocation}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">items Count:</td>
              <td style="padding: 8px 0;">${request.items.length}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">Approved Date:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">items to be Loaded</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">item Name</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Serial Number</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Category</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${request.items
                .map(
                  (item) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.itemDescription || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.serialNumber || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.categoryDescription || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.itemQuantity || "1"
                  }</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;"><strong>Action Required:</strong> Please coordinate the loading process for this approved gate pass request.</p>
        </div>
        
        <div style="font-size: 12px; color: #757575; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
          <p>This is an automated email from the SLT Gate Pass Management System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Sri Lanka Telecom. All rights reserved.</p>
        </div>
      </div>
    `;

      const emailResult = await emailSent({
        to: petrolLeaderEmail,
        subject: emailSubject,
        html: emailBody,
      });

      return emailResult;
    } catch (error) {
      console.error("Failed to send approval email to petrol leader:", error);
      throw error;
    }
  };

  // NEW: Email function for receiver
  const sendApprovalEmailToReceiver = async (request, comment) => {
    try {
      if (!request.receiverDetails?.email) {
        throw new Error("Receiver email not available");
      }

      const emailSubject = `Gate Pass Request ${request.refNo} - Approved and Incoming`;

      const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #28a745; margin-bottom: 5px;">Incoming Gate Pass Approved</h2>
          <p style="color: #757575; font-size: 14px;">Reference Number: ${
            request.refNo
          }</p>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
          <p>Dear ${request.receiverDetails?.name || "Valued Employee"},</p>
          <p>A gate pass request has been <strong>approved</strong> and items are being sent to your location.</p>
          
          ${
            comment
              ? `
          <div style="margin-top: 15px;">
            <p><strong>Verify Officer Comment:</strong></p>
            <p style="padding: 10px; background-color: #fff; border-left: 3px solid #28a745; margin-top: 5px;">${comment}</p>
          </div>
          `
              : ""
          }
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #757575; width: 40%;">Sender:</td>
              <td style="padding: 8px 0;">${
                request.senderDetails?.name || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">From Location:</td>
              <td style="padding: 8px 0;">${request.outLocation}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">To Location:</td>
              <td style="padding: 8px 0;">${request.inLocation}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">items Count:</td>
              <td style="padding: 8px 0;">${request.items.length}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">Approved Date:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Incoming items</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">item Name</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Serial Number</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Category</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${request.items
                .map(
                  (item) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.itemDescription || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.serialNumber || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.categoryDescription || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.itemQuantity || "1"
                  }</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 4px; border-left: 4px solid #007bff;">
          <p style="margin: 0; color: #004085;"><strong>Please Note:</strong> Please be prepared to receive these items at your location. The petrol leader will coordinate the delivery.</p>
        </div>
        
        <div style="font-size: 12px; color: #757575; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
          <p>This is an automated email from the SLT Gate Pass Management System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Sri Lanka Telecom. All rights reserved.</p>
        </div>
      </div>
    `;

      const emailResult = await emailSent({
        to: request.receiverDetails.email,
        subject: emailSubject,
        html: emailBody,
      });

      return emailResult;
    } catch (error) {
      console.error("Failed to send approval email to receiver:", error);
      throw error;
    }
  };

  // Add these helper functions RIGHT HERE - before sendApprovalEmails

  // Email validation helper
  const isValidEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Get fallback emails based on branch
  const getFallbackEmails = async (branch) => {
    // Comprehensive fallback email list based on branch
    const branchFallbacks = {
      main: [
        "gatepass-admin@slt.lk",
        "transport@slt.lk",
        "distribution@slt.lk",
      ],
      "head office": ["gatepass-admin@slt.lk", "transport-hq@slt.lk"],
      colombo: ["distribution-colombo@slt.lk", "gatepass-admin@slt.lk"],
      kandy: ["distribution-kandy@slt.lk", "gatepass-admin@slt.lk"],
      gampaha: ["distribution-gampaha@slt.lk", "gatepass-admin@slt.lk"],
      // Add more branches as needed
    };

    const branchKey = branch?.toLowerCase() || "main";
    const branchSpecific =
      branchFallbacks[branchKey] || branchFallbacks["main"];

    // Always include these general fallbacks
    const generalFallbacks = [
      "gatepass-admin@slt.lk",
      "distribution@slt.lk",
      "transport@slt.lk",
    ];

    // Combine and remove duplicates
    const allEmails = [...new Set([...branchSpecific, ...generalFallbacks])];

    console.log(`📧 Fallback emails for branch "${branch}":`, allEmails);
    return allEmails;
  };

  const sendReturnEmail = async (request, comment, itemDetails = []) => {
    try {
      if (!request.senderDetails?.email) {
        showToast("Sender email not available", "error");
        return;
      }

      const emailSubject = `Returnable items Update: ${request.refNo}`;

      // Create items table for email
      const itemsTable =
        itemDetails.length > 0
          ? `
      <div style="margin: 20px 0;">
        <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Returned items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">item Name</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Serial Number</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Category</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${itemDetails
              .map(
                (item) => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                  item.itemDescription || "N/A"
                }</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                  item.serialNumber || "N/A"
                }</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                  item.categoryDescription || "N/A"
                }</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                  item.itemQuantity || "1"
                }</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
          : "";

      const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2fd33dff; margin-bottom: 5px;">Returnable items Update</h2>
          <p style="color: #757575; font-size: 14px;">Reference Number: ${
            request.refNo
          }</p>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
          <p>Dear ${request.senderDetails.name},</p>
          
          <p>We would like to inform you that ${
            itemDetails.length
          } returnable item(s) under reference number <b>${
            request.refNo
          }</b> have been returned by the Receiver.</p>
          <p>You can view it under your <i>Completed</i> or relevant section.</p>
        </div>

        ${itemsTable}
        
        <div style="font-size: 12px; color: #757575; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
          <p>This is an automated email from the SLT Gate Pass Management System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Sri Lanka Telecom. All rights reserved.</p>
        </div>
      </div>
    `;

      await emailSent({
        to: request.senderDetails.email,
        subject: emailSubject,
        html: emailBody,
      });

      showToast("Return notification email sent to requester", "success");
    } catch (error) {
      console.error("Failed to send return email:", error);
      showToast("Failed to send return email", "error");
    }
  };

  const sendReturnTOExecutiveEmail = async (
    request,
    comment,
    selectedDESCRIPTIONDetails,
  ) => {
    try {
      // Get the executive officer details from the request
      const executiveServiceNo =
        request.requestDetails?.executiveOfficerServiceNo ||
        request.request?.executiveOfficerServiceNo;

      if (!executiveServiceNo) {
        console.error("Executive officer service number not found");
        showToast("Executive officer details not available", "error");
        return;
      }

      // Fetch executive officer details
      const approver = await searchReceiverByServiceNo(executiveServiceNo);

      if (!approver?.email) {
        console.error("Executive officer email not found");
        showToast("Executive officer email not available", "error");
        return;
      }

      const emailSubject = `Action Required: Review and Return items - ${request.refNo}`;

      // Create a professional email body with HTML formatting
      const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2fd33dff; margin-bottom: 5px;">⚠️ Action Required: Review and Return items</h2>
          <p style="color: #757575; font-size: 14px;">Reference Number: <strong>${
            request.refNo
          }</strong></p>
        </div>
        
        <!-- Alert Box -->
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #856404; font-size: 14px; font-weight: bold;">
            ⚡ Urgent: Please review and return the items listed below
          </p>
        </div>
        
        <!-- Main Message -->
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
          <p style="margin-bottom: 15px;">Dear ${approver.name},</p>
          
          <p style="margin-bottom: 15px;">We would like to inform you that the following returnable items under reference number <b>${
            request.refNo
          }</b> are ready to be returned by the Petrol Leader.</p>
          
          <p style="margin-bottom: 15px;"><strong>Please review these items and arrange for their return as soon as possible.</strong></p>
          
          <p style="margin: 0;">
            📍 <strong>Current Location:</strong> ${
              request.inLocation || "N/A"
            }<br>
            📅 <strong>Date:</strong> ${new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <!-- items Table -->
        <div style="margin-bottom: 20px;">
          <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">items to be Returned</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">item Name</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Serial Number</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Category</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${
                selectedDESCRIPTIONDetails
                  ?.map(
                    (item) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.itemDescription || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.serialNumber || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.categoryDescription || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.itemQuantity || "1"
                  }</td>
                </tr>
              `,
                  )
                  .join("") ||
                '<tr><td colspan="4" style="padding: 8px; text-align: center;">No items selected</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <!-- Additional Comment Section -->
        ${
          comment
            ? `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f0f4ff; border-radius: 4px; border-left: 4px solid #2196F3;">
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #1976D2;">Additional Comments:</p>
          <p style="margin: 0; color: #424242;">${comment}</p>
        </div>
        `
            : ""
        }

        <!-- Request Details -->
        <div style="margin-bottom: 20px;">
          <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #757575; width: 40%;">Requester:</td>
              <td style="padding: 8px 0;">${
                request.senderDetails?.name || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">From Location:</td>
              <td style="padding: 8px 0;">${request.outLocation || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">To Location:</td>
              <td style="padding: 8px 0;">${request.inLocation || "N/A"}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="font-size: 12px; color: #757575; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
          <p>This is an automated email from the SLT Gate Pass Management System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Sri Lanka Telecom. All rights reserved.</p>
        </div>
      </div>
    `;

      // Send the email
      const result = await emailSent({
        to: approver.email,
        subject: emailSubject,
        html: emailBody,
      });

      console.log("Executive officer notification email sent successfully");
      showToast(
        "Return notification email sent to executive officer",
        "success",
      );

      return result;
    } catch (error) {
      console.error("Failed to send return email to executive officer:", error);
      showToast("Failed to send email to executive officer", "error");
      throw error;
    }
  };

  // NEW: Email function for receiver only (backend handles petrol leader notifications)
  // NEW: Email function for receiver only (backend handles petrol leader notifications)
  const sendApprovalEmails = async (request, comment) => {
    try {
      let emailCount = 0;
      const errors = [];
      const successRecipients = [];

      console.log("=== Starting email notification process ===");

      // 1. SKIP PETROL LEADER API - Use fallback directly (no admin access required)
      console.log("Using fallback email system for petrol leaders");

      const fallbackEmails = await getFallbackEmails(request.outLocation);
      console.log("Fallback emails to try:", fallbackEmails);

      let fallbackSent = false;
      for (const fallbackEmail of fallbackEmails) {
        try {
          await sendApprovalEmailToPetrolLeader(
            fallbackEmail,
            request,
            comment,
          );
          emailCount++;
          successRecipients.push(`Petrol Leader: ${fallbackEmail}`);
          console.log(`✅ Email sent successfully to: ${fallbackEmail}`);
          fallbackSent = true;
          break; // Stop after first successful fallback
        } catch (fallbackError) {
          console.error(
            `❌ Fallback email failed for ${fallbackEmail}:`,
            fallbackError,
          );
          // Continue to next fallback
        }
      }

      if (!fallbackSent) {
        errors.push("All fallback email attempts failed");
        console.warn("❌ All fallback email attempts failed");
      }

      // 2. Send email to receiver
      if (
        request.receiverDetails?.email &&
        isValidEmail(request.receiverDetails.email)
      ) {
        try {
          await sendApprovalEmailToReceiver(request, comment);
          emailCount++;
          successRecipients.push(`Receiver: ${request.receiverDetails.email}`);
          console.log(
            `Email sent successfully to receiver: ${request.receiverDetails.email}`,
          );
        } catch (emailError) {
          console.error(
            `❌ Failed to send email to receiver ${request.receiverDetails.email}:`,
            emailError,
          );
          errors.push(`Receiver email failed: ${emailError.message}`);
        }
      } else {
        console.warn("⚠️ No valid receiver email available");
        errors.push("No valid receiver email available");
      }

      // Show results
      console.log("=== Email Notification Summary ===");
      console.log(`Total successful: ${emailCount}`);
      console.log(`Successful recipients:`, successRecipients);
      console.log(`Errors:`, errors);

      if (emailCount > 0) {
        if (errors.length > 0) {
          showToast(
            `Approval sent! Notifications delivered to ${emailCount} recipient(s), but ${errors.join(
              ", ",
            )}`,
            "warning",
          );
        } else {
          showToast(
            `✅ Approval successful! Notifications sent to ${emailCount} recipient(s)`,
            "success",
          );
        }
      } else {
        showToast(
          "✅ Request approved, but no email notifications could be sent",
          "warning",
        );
      }
    } catch (error) {
      console.error("❌ Critical error in sendApprovalEmails:", error);
      showToast(
        "✅ Request approved, but email notifications failed. Please contact support.",
        "error",
      );
      throw error;
    }
  };

  // UPDATED: handleApprove function to use consolidated email function
  const handleApprove = async (item) => {
    try {
      // Prepare loading details based on staff type
      let loadingDetails = {
        loadingLocation: item.outLocation,
        staffType: staffType,
      };

      if (staffType === "SLT") {
        if (!searchedEmployee) {
          showToast(
            "Please search and select an SLT employee for loading",
            "warning",
          );
          return;
        }
        loadingDetails.staffServiceNo = searchedEmployee.serviceNo;
      } else {
        // Validate non-SLT staff details
        if (!nonSltStaffDetails.name || !nonSltStaffDetails.nic) {
          showToast(
            "Please fill in all required non-SLT staff details",
            "warning",
          );
          return;
        }

        // Call API to approve status with comment and loading details
        const updatedStatus = await approveStatus(
          item.refNo,
          comment,
          loadingDetails,
          userDetails.serviceNo,
        );

        // Send emails to both petrol leaders and receiver
        await sendApprovalEmails(item, comment);

        // Format the approved item in the same structure as your UI expects
        const approvedDESCRIPTION = {
          refNo: updatedStatus.referenceNumber,
          name: updatedStatus.request?.name,
          inLocation: updatedStatus.request?.inLocation,
          outLocation: updatedStatus.request?.outLocation,
          createdAt: new Date(
            updatedStatus.request?.createdAt || updatedStatus.createdAt,
          ).toLocaleString(),
          items: updatedStatus.request?.items || [],
          comment: updatedStatus.verifyOfficerComment,
          requestDetails: { ...updatedStatus.request },
        };
      }

      console.log("=== Starting approval process ===");

      // Call API to approve status with comment and loading details
      const updatedStatus = await approveStatus(
        item.refNo,
        comment,
        loadingDetails,
        userDetails.serviceNo,
      );

      console.log(
        "✅ Request approved in database, now sending notifications...",
      );

      // Send emails - don't wait for result to block the approval (non-blocking)
      sendApprovalEmails(item, comment)
        .then((result) => {
          console.log("Email sending completed:", result);
        })
        .catch((emailError) => {
          console.error("Email sending failed:", emailError);
        });

      // Format the approved item in the same structure as your UI expects
      const approvedDESCRIPTION = {
        refNo: updatedStatus.referenceNumber,
        name: updatedStatus.request?.name,
        inLocation: updatedStatus.request?.inLocation,
        outLocation: updatedStatus.request?.outLocation,
        createdAt: new Date(updatedStatus.createdAt).toLocaleString(),
        items: updatedStatus.request?.items || [],
        comment: updatedStatus.verifyOfficerComment,
        requestDetails: { ...updatedStatus.request },
      };

      // Update UI state immediately (don't wait for emails)
      setPendingDESCRIPTIONs(
        pendingDESCRIPTIONs.filter((i) => i.refNo !== item.refNo),
      );
      setApprovedDESCRIPTIONs([...approvedDESCRIPTIONs, approvedDESCRIPTION]);

      // Reset modal and comment
      setShowModal(false);
      setComment("");

      // Don't show additional success toast here - let sendApprovalEmails handle it
      setStaffType("");
      setServiceId("");
      setSearchedEmployee(null);
      setNonSltStaffDetails({
        name: "",
        companyName: "",
        nic: "",
        contactNo: "",
        email: "",
      });

      console.log("✅ Approval process completed successfully");
    } catch (error) {
      console.error("❌ Error approving status:", error.message);
      showToast("Failed to approve request. Please try again.", "error");
    }
  };

  const sendRejectionEmail = async (request, comment) => {
    try {
      if (!request.senderDetails?.email) {
        showToast("Sender email not available", "error");
        return;
      }

      const emailSubject = `Gate Pass Request ${request.refNo} - Rejected`;

      // Create a professional email body with HTML formatting
      const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #d32f2f; margin-bottom: 5px;">Gate Pass Request Rejected</h2>
              <p style="color: #757575; font-size: 14px;">Reference Number: ${
                request.refNo
              }</p>
            </div>
            
            <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
              <p>Dear ${request.senderDetails.name},</p>
              <p>We regret to inform you that your gate pass request has been <strong>rejected</strong> by the verify officer.</p>
              
              <div style="margin-top: 15px;">
                <p><strong>Reason for Rejection:</strong></p>
                <p style="padding: 10px; background-color: #fff; border-left: 3px solid #d32f2f; margin-top: 5px;">${comment}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Request Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #757575; width: 40%;">From Location:</td>
                  <td style="padding: 8px 0;">${request.outLocation}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #757575;">To Location:</td>
                  <td style="padding: 8px 0;">${request.inLocation}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #757575;">items:</td>
                  <td style="padding: 8px 0;">${request.items
                    .map(
                      (item) =>
                        `${item.itemDescription} (${item.serialNumber})`,
                    )
                    .join(", ")}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #757575;">Requested Date:</td>
                  <td style="padding: 8px 0;">${new Date(
                    request.createdAt,
                  ).toLocaleDateString()}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin-bottom: 20px;">
              <p>You may submit a new request with the necessary corrections or contact the approver for more information.</p>
              <p>If you believe this rejection was made in error, please contact the IT support team.</p>
            </div>
            
            <div style="font-size: 12px; color: #757575; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
              <p>This is an automated email from the SLT Gate Pass Management System. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Sri Lanka Telecom. All rights reserved.</p>
            </div>
          </div>
        `;

      // Send the email
      await emailSent({
        to: request.senderDetails.email,
        subject: emailSubject,
        html: emailBody,
      });

      showToast("Rejection notification email sent to requester", "success");
    } catch (error) {
      console.error("Failed to send rejection email:", error);
      showToast("Failed to send rejection email", "error");
    }
  };

  const sendRejectionEmailApprover = async (request, comment) => {
    const approver = await searchReceiverByServiceNo(
      request.requestDetails.executiveOfficerServiceNo,
    );

    try {
      if (!request.senderDetails?.email) {
        showToast("Sender email not available", "error");
        return;
      }

      const emailSubject = `Gate Pass Request ${request.refNo} - Rejected`;

      // Create a professional email body with HTML formatting
      const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #d32f2f; margin-bottom: 5px;">Gate Pass Request Rejected</h2>
              <p style="color: #757575; font-size: 14px;">Reference Number: ${
                request.refNo
              }</p>
            </div>
            
            <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
              <p>Dear ${approver.name},</p>
              <p>We regret to inform you that your gate pass request has been <strong>rejected</strong> by the executive approver.</p>
              
              <div style="margin-top: 15px;">
                <p><strong>Reason for Rejection:</strong></p>
                <p style="padding: 10px; background-color: #fff; border-left: 3px solid #d32f2f; margin-top: 5px;">${comment}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Request Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #757575; width: 40%;">From Location:</td>
                  <td style="padding: 8px 0;">${request.outLocation}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #757575;">To Location:</td>
                  <td style="padding: 8px 0;">${request.inLocation}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #757575;">items:</td>
                  <td style="padding: 8px 0;">${request.items
                    .map(
                      (item) =>
                        `${item.itemDescription} (${item.serialNumber})`,
                    )
                    .join(", ")}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #757575;">Requested Date:</td>
                  <td style="padding: 8px 0;">${new Date(
                    request.createdAt,
                  ).toLocaleDateString()}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin-bottom: 20px;">
              <p>You may submit a new request with the necessary corrections or contact the approver for more information.</p>
              <p>If you believe this rejection was made in error, please contact the IT support team.</p>
            </div>
            
            <div style="font-size: 12px; color: #757575; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
              <p>This is an automated email from the SLT Gate Pass Management System. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Sri Lanka Telecom. All rights reserved.</p>
            </div>
          </div>
        `;

      // Send the email
      await emailSent({
        to: approver.email,
        subject: emailSubject,
        html: emailBody,
      });

      showToast("Rejection notification email sent to requester", "success");
    } catch (error) {
      console.error("Failed to send rejection email:", error);
      showToast("Failed to send rejection email", "error");
    }
  };

  const handleReject = async (item) => {
    try {
      if (!comment || comment.trim() === "") {
        showToast("Comment is required to reject the item.", "warning");
        return;
      }
      // Call API to reject status with comment
      const updatedStatus = await rejectStatus(item.refNo, comment);

      // Send rejection email to the requester
      await sendRejectionEmail(item, comment);

      // Send rejection email to the Approver
      await sendRejectionEmailApprover(item, comment);

      // Format the rejected item in the same structure as your UI expects
      const rejectedDESCRIPTION = {
        refNo: updatedStatus.referenceNumber,
        name: updatedStatus.request?.name,
        inLocation: updatedStatus.request?.inLocation,
        outLocation: updatedStatus.request?.outLocation,
        createdAt: new Date(
          updatedStatus.request?.createdAt || updatedStatus.createdAt,
        ).toLocaleString(),
        items: updatedStatus.request?.items || [],
        comment: updatedStatus.verifyOfficerComment,
        requestDetails: { ...updatedStatus.request },
      };

      // Update UI state
      setPendingDESCRIPTIONs(
        pendingDESCRIPTIONs.filter((i) => i.refNo !== item.refNo),
      );
      setRejectedDESCRIPTIONs([...rejectedDESCRIPTIONs, rejectedDESCRIPTION]);

      // Reset modal and comment
      setShowModal(false);
      setComment("");
    } catch (error) {
      console.error("Error rejecting status:", error.message);
    }
  };

  const handleModelOpen = async (item) => {
    setselectedItem(item);

    if (item.requestDetails?.transport.transporterServiceNo) {
      try {
        const transportResponse = await searchEmployeeByServiceNo(
          item.requestDetails.transport.transporterServiceNo,
        );

        console.log("Transport response:", transportResponse); // Debug log

        // Extract the employee data from the nested response
        const employee = transportResponse?.data?.data?.[0];

        if (employee) {
          setTransportData({
            name: `${employee.employeeTitle || ""} ${
              employee.employeeFirstName || ""
            } ${employee.employeeSurname || ""}`.trim(),
            serviceNo:
              employee.employeeNo ||
              item.requestDetails.transport.transporterServiceNo,
            designation: employee.designation || "-",
            section: employee.empSection || "-",
            group: employee.empGroup || "-",
            contactNo: employee.mobileNo || "-",
          });
        } else {
          console.log("No employee data found");
          setTransportData(null);
        }
      } catch (error) {
        console.error("Error fetching transporter details:", error);
        setTransportData(null);
      }
    } else {
      setTransportData(item.requestDetails?.transport || null);
    }

    setShowModal(true);
  };

  // Hide Non-SLT requests only for PLE002 (Petrol Leader 2)
  // Check both serviceNo and userId for robustness
  const isPLE002 =
    userDetails?.serviceNo === "PLE002" || userDetails?.userId === "PLE002";

  // Enhanced filtering function
  const applyFilters = (items) => {
    return items.filter((item) => {
      // PLE002 specific filter (hide Non-SLT for PLE002)
      if (isPLE002 && item.request?.isNonSltPlace) return false;

      // Search term filter (reference number or name)
      const matchesSearch =
        item.refNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.senderDetails?.name &&
          item.senderDetails.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));

      // Location filter (check both in and out locations)
      const matchesLocation =
        !locationFilter ||
        item.inLocation?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        item.outLocation
          ?.toLowerCase()
          .includes(locationFilter.toLowerCase()) ||
        (item.request?.companyName &&
          item.request.companyName
            .toLowerCase()
            .includes(locationFilter.toLowerCase()));

      // Company type filter (SLT vs Non-SLT)
      const matchesCompanyType =
        companyTypeFilter === "all" ||
        (companyTypeFilter === "slt" && !item.request?.isNonSltPlace) ||
        (companyTypeFilter === "non-slt" && item.request?.isNonSltPlace);

      // Date range filter
      const itemDate = new Date(item.createdAt);
      const matchesDateFrom = !dateFrom || itemDate >= new Date(dateFrom);
      const matchesDateTo =
        !dateTo || itemDate <= new Date(dateTo + "T23:59:59");

      return (
        matchesSearch &&
        matchesLocation &&
        matchesCompanyType &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  };

  const filteredPendingDESCRIPTIONs = applyFilters(pendingDESCRIPTIONs);
  const filteredApprovedDESCRIPTIONs = applyFilters(approvedDESCRIPTIONs);
  const filteredRejectedDESCRIPTIONs = applyFilters(rejectedDESCRIPTIONs);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gate Pass Verify
        </h1>
        <p className="text-gray-500 flex items-center">
          <FaInfoCircle className="mr-2 text-blue-500" />
          Manage and review all gate pass requests
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Pending Card */}
        <div
          onClick={() => setActiveTab("pending")}
          className={`rounded-2xl shadow-lg overflow-hidden transition-all cursor-pointer ${
            activeTab === "pending"
              ? "bg-gradient-to-br from-amber-500 to-orange-500 transform scale-105"
              : "bg-white hover:shadow-xl"
          }`}
        >
          <div
            className={`p-6 flex flex-col items-center ${
              activeTab === "pending" ? "text-white" : "text-gray-700"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                activeTab === "pending" ? "bg-white/20" : "bg-amber-100"
              }`}
            >
              <FaClock
                className={
                  activeTab === "pending"
                    ? "text-white text-2xl"
                    : "text-amber-500 text-2xl"
                }
              />
            </div>
            <h3 className="text-xl font-semibold mb-1">Pending</h3>
            <div
              className={`text-3xl font-bold ${
                activeTab === "pending" ? "text-white" : "text-amber-500"
              }`}
            >
              {pendingDESCRIPTIONs.length}
            </div>
            <p
              className={
                activeTab === "pending"
                  ? "text-white/80 mt-2 text-sm"
                  : "text-gray-500 mt-2 text-sm"
              }
            >
              Awaiting your review
            </p>
          </div>
        </div>

        {/* Approved Card */}
        <div
          onClick={() => setActiveTab("approved")}
          className={`rounded-2xl shadow-lg overflow-hidden transition-all cursor-pointer ${
            activeTab === "approved"
              ? "bg-gradient-to-br from-emerald-500 to-green-500 transform scale-105"
              : "bg-white hover:shadow-xl"
          }`}
        >
          <div
            className={`p-6 flex flex-col items-center ${
              activeTab === "approved" ? "text-white" : "text-gray-700"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                activeTab === "approved" ? "bg-white/20" : "bg-emerald-100"
              }`}
            >
              <FaCheckCircle
                className={
                  activeTab === "approved"
                    ? "text-white text-2xl"
                    : "text-emerald-500 text-2xl"
                }
              />
            </div>
            <h3 className="text-xl font-semibold mb-1">Approved</h3>
            <div
              className={`text-3xl font-bold ${
                activeTab === "approved" ? "text-white" : "text-emerald-500"
              }`}
            >
              {approvedDESCRIPTIONs.length}
            </div>
            <p
              className={
                activeTab === "approved"
                  ? "text-white/80 mt-2 text-sm"
                  : "text-gray-500 mt-2 text-sm"
              }
            >
              Successfully processed
            </p>
          </div>
        </div>

        {/* Rejected Card */}
        <div
          onClick={() => setActiveTab("rejected")}
          className={`rounded-2xl shadow-lg overflow-hidden transition-all cursor-pointer ${
            activeTab === "rejected"
              ? "bg-gradient-to-br from-rose-500 to-red-500 transform scale-105"
              : "bg-white hover:shadow-xl"
          }`}
        >
          <div
            className={`p-6 flex flex-col items-center ${
              activeTab === "rejected" ? "text-white" : "text-gray-700"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                activeTab === "rejected" ? "bg-white/20" : "bg-rose-100"
              }`}
            >
              <FaTimesCircle
                className={
                  activeTab === "rejected"
                    ? "text-white text-2xl"
                    : "text-rose-500 text-2xl"
                }
              />
            </div>
            <h3 className="text-xl font-semibold mb-1">Rejected</h3>
            <div
              className={`text-3xl font-bold ${
                activeTab === "rejected" ? "text-white" : "text-rose-500"
              }`}
            >
              {rejectedDESCRIPTIONs.length}
            </div>
            <p
              className={
                activeTab === "rejected"
                  ? "text-white/80 mt-2 text-sm"
                  : "text-gray-500 mt-2 text-sm"
              }
            >
              Declined requests
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Search & Filter Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
        <div className="space-y-4">
          {/* Search Bar */}
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

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="Filter by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Company Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={companyTypeFilter}
                onChange={(e) => setCompanyTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Types</option>
                <option value="slt">SLT Branch</option>
                <option value="non-slt">Non-SLT</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {(searchTerm ||
            locationFilter ||
            companyTypeFilter !== "all" ||
            dateFrom ||
            dateTo) && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setLocationFilter("");
                  setCompanyTypeFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            {activeTab === "pending" && (
              <FaClock className="mr-2 text-amber-500" />
            )}
            {activeTab === "approved" && (
              <FaCheckCircle className="mr-2 text-emerald-500" />
            )}
            {activeTab === "rejected" && (
              <FaTimesCircle className="mr-2 text-rose-500" />
            )}
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Gate Passes
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
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Entry Point
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Exit Point
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                {activeTab === "rejected" && (
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Rejected By
                  </th>
                )}
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(activeTab === "pending"
                ? filteredPendingDESCRIPTIONs
                : activeTab === "approved"
                  ? filteredApprovedDESCRIPTIONs
                  : filteredRejectedDESCRIPTIONs
              ).map((item) => (
                <tr
                  key={item.refNo}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.refNo}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.senderDetails?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.inLocation}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.request?.isNonSltPlace
                        ? item.request?.outLocation
                        : item.outLocation}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.request?.isNonSltPlace
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {item.request?.isNonSltPlace
                        ? "Non-SLT Organization"
                        : "SLT Branch"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {item.createdAt}
                    </div>
                  </td>
                  {activeTab === "rejected" && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.rejectedByBranch
                          ? `${item.rejectedByBranch} ${item.rejectedBy || ""}`
                          : item.rejectedBy || "N/A"}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => {
                        handleModelOpen(item);
                      }}
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium
                                                ${
                                                  activeTab === "pending"
                                                    ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                                                    : activeTab === "approved"
                                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                                      : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                                                }`}
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
        {(activeTab === "pending"
          ? filteredPendingDESCRIPTIONs
          : activeTab === "approved"
            ? filteredApprovedDESCRIPTIONs
            : filteredRejectedDESCRIPTIONs
        ).length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FaBoxOpen className="text-4xl text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No requests found</p>
            <p className="text-gray-400 text-sm">
              {searchTerm
                ? "Try adjusting your search criteria"
                : "Your gate pass requests will appear here"}
            </p>
          </div>
        )}
      </div>

      <RequestDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        request={selectedItem}
        activeTab={activeTab}
        comment={comment}
        handleApprove={handleApprove}
        handleReject={handleReject}
        setComment={setComment}
        transporterDetails={transportData}
        setStaffType={setStaffType}
        setServiceId={setServiceId}
        staffType={staffType}
        serviceId={serviceId}
        searchedEmployee={searchedEmployee}
        setSearchedEmployee={setSearchedEmployee}
        showToast={showToast}
        nonSltStaffDetails={nonSltStaffDetails}
        sendReturnEmail={sendReturnEmail}
        sendReturnTOExecutiveEmail={sendReturnTOExecutiveEmail}
        setNonSltStaffDetails={setNonSltStaffDetails}
        isSuperAdmin={isSuperAdmin}
        formErrors={formErrors}
        handleNonSltFieldChange={handleNonSltFieldChange}
        validateField={validateField}
      />
    </div>
  );
};

// RequestDetailsModal Component
const RequestDetailsModal = ({
  isOpen,
  onClose,
  request,
  user,
  receiver,
  activeTab,
  comment,
  setComment,
  handleApprove,
  handleReject,
  transporterDetails,
  setStaffType,
  setServiceId,
  staffType,
  serviceId,
  searchedEmployee,
  setSearchedEmployee,
  sendReturnEmail,
  sendReturnTOExecutiveEmail,
  showToast,
  nonSltStaffDetails,
  setNonSltStaffDetails,
  isSuperAdmin,
  formErrors,
  handleNonSltFieldChange,
  validateField,
}) => {
  // Initialize with the correct value from request
  const [selectedExecutive, setSelectedExecutive] = useState("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedDESCRIPTIONImages, setSelectedDESCRIPTIONImages] = useState(
    [],
  );
  const [selecteditemDescription, setSelecteditemDescription] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [selectedDESCRIPTIONs, setSelectedDESCRIPTIONs] = useState([]);
  const [showAddDESCRIPTIONModal, setShowAddDESCRIPTIONModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newDESCRIPTION, setNewDESCRIPTION] = useState({
    itemDescription: "",
    serialNumber: "",
    categoryDescription: "",
    itemCode: "",
    itemQuantity: 1,
    returnDate: "",
    status: "returnable",
  });

  // Add these new states for tab navigation
  const [currentTab, setCurrentTab] = useState("details");
  const tabOrder =
    activeTab === "pending"
      ? ["details", "loading", "navigation"]
      : ["details", "navigation"];
  const VerifyStatus = true;

  if (!isOpen || !request) return null;

  const handleBulkReturn = async () => {
    if (selectedDESCRIPTIONs.length === 0) {
      showToast("Please select at least one item to return", "warning");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to mark ${selectedDESCRIPTIONs.length} item(s) as 'return'?`,
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      console.log("Starting bulk return process...");
      console.log("Selected serial numbers:", selectedDESCRIPTIONs);
      console.log("Reference number:", request.refNo);

      // Get full details of selected items
      const selectedDESCRIPTIONDetails = request.items.filter((item) =>
        selectedDESCRIPTIONs.includes(item.serialNumber),
      );

      console.log("Selected item details:", selectedDESCRIPTIONDetails);

      // Call backend to update DB
      const response = await markItemsAsReturned(
        request.refNo,
        selectedDESCRIPTIONs,
      );

      console.log("Backend response:", response);

      // Now send the email notification WITH item DETAILS
      await sendReturnEmail(
        request,
        "items successfully returned by petrol leader.",
        selectedDESCRIPTIONDetails,
      );
      await sendReturnTOExecutiveEmail(
        request,
        "items successfully returned by petrol leader.",
        selectedDESCRIPTIONDetails,
      );
      // Show success message
      showToast(
        `Successfully marked ${
          response.updatedCount || selectedDESCRIPTIONs.length
        } item(s) as returned.`,
        "success",
      );

      console.log("Bulk return process completed successfully");

      // Clear selected items
      setSelectedDESCRIPTIONs([]);

      // Refresh / close modal
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Error marking items as returned:", error);
      console.error("Error details:", error.response?.data);

      showToast(
        error.message || "Failed to update items. Please try again.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (serialNo) => {
    setSelectedDESCRIPTIONs((prev) => {
      if (prev.includes(serialNo)) {
        return prev.filter((sn) => sn !== serialNo);
      } else {
        return [...prev, serialNo];
      }
    });
  };

  const handleAddNewDESCRIPTION = async () => {
    if (
      !newDESCRIPTION.itemDescription ||
      !newDESCRIPTION.serialNumber ||
      !newDESCRIPTION.categoryDescription
    ) {
      alert(
        "Please fill in all required fields (item Name, Serial Number, Category)",
      );
      return;
    }

    try {
      await addReturnableItemToRequest(request.refNo, newDESCRIPTION);
      alert("Returnable item added successfully!");
      setShowAddDESCRIPTIONModal(false);
      window.location.reload();
      // optionally refresh data here
    } catch (error) {
      console.error(error);
      alert("Failed to add item: " + error.message);
    }
  };

  /*const handleBulkReturn = async () => {
    if (selectedDESCRIPTIONs.length === 0) return;
    
    setLoading(true);
    try {
      for (const serialNo of selectedDESCRIPTIONs) {
        const item = request.items.find(i => i.serialNumber === serialNo);
        if (item) {
          await handleReturnSingleDESCRIPTION(item);
        }
      }
      setSelectedDESCRIPTIONs([]);
      toast.success(`Successfully returned ${selectedDESCRIPTIONs.length} item(s)`);
    } catch (error) {
      console.error('Error returning items:', error);
      toast.error('Failed to return some items');
    } finally {
      setLoading(false);
    }
  };*/

  const handleViewImages = (item) => {
    setSelectedDESCRIPTIONImages(item.itemPhotos);
    setSelecteditemDescription(item.itemDescription);
    setIsImageModalOpen(true);
  };

  const handleEmployeeSearch = async () => {
    if (!serviceId.trim()) {
      showToast("Please enter a service number", "warning");
      return;
    }

    try {
      setLoading(true);
      setSearchedEmployee(null);

      const response = await getEmployeeDetails(serviceId);

      console.log("ERP response:", response); // ✅ keep for debug

      const employee = response?.data?.data?.[0];

      if (!employee) {
        showToast("Employee not found in ERP", "error");
        return;
      }

      const mappedEmployee = {
        name: employee.employeeName,
        serviceNo: employee.employeeNumber,
        email: employee.email,
        section: employee.empSection,
        group: employee.empGroup,
        designation: employee.designation,
        contactNo: employee.mobileNo,
      };

      setSearchedEmployee(mappedEmployee);
      showToast("Employee found from ERP", "success");
    } catch (error) {
      console.error("ERP employee search failed:", error);
      showToast("Failed to fetch employee from ERP", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle tab navigation
  const goToNextTab = () => {
    const currentIndex = tabOrder.indexOf(currentTab);
    if (currentIndex < tabOrder.length - 1) {
      setCurrentTab(tabOrder[currentIndex + 1]);
    }
  };

  const goToPreviousTab = () => {
    const currentIndex = tabOrder.indexOf(currentTab);
    if (currentIndex > 0) {
      setCurrentTab(tabOrder[currentIndex - 1]);
    }
  };

  const printReport = (request, transporterDetails, loadingStaff) => {
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
                  request?.senderDetails?.name || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                  request?.senderDetails?.serviceNo ||
                  request?.requestDetails?.employeeServiceNo ||
                  request?.request?.employeeServiceNo ||
                  "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Section:</span> ${
                  request?.senderDetails?.section || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Group:</span> ${
                  request?.senderDetails?.group || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Designation:</span> ${
                  request?.senderDetails?.designation || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Contact:</span> ${
                  request?.senderDetails?.contactNo || "N/A"
                }
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Receiver Details</h2>
            <div class="grid">
              ${
                request?.isNonSltPlace ||
                request?.requestDetails?.isNonSltPlace ||
                request?.request?.isNonSltPlace
                  ? `
                  <div class="item">
                    <span class="label">Name:</span> ${
                      request?.receiverName ||
                      request?.requestDetails?.receiverName ||
                      request?.request?.receiverName ||
                      "N/A"
                    }
                  </div>
                  <div class="item">
                    <span class="label">NIC:</span> ${
                      request?.receiverNIC ||
                      request?.requestDetails?.receiverNIC ||
                      request?.request?.receiverNIC ||
                      "N/A"
                    }
                  </div>
                  <div class="item">
                    <span class="label">Contact:</span> ${
                      request?.receiverContact ||
                      request?.requestDetails?.receiverContact ||
                      request?.request?.receiverContact ||
                      "N/A"
                    }
                  </div>
                `
                  : `
                  <div class="item">
                    <span class="label">Name:</span> ${
                      request?.receiverDetails?.name || "N/A"
                    }
                  </div>
                  <div class="item">
                    <span class="label">Service No:</span> ${
                      request?.receiverDetails?.serviceNo || "N/A"
                    }
                  </div>
                  <div class="item">
                    <span class="label">Section:</span> ${
                      request?.receiverDetails?.section || "N/A"
                    }
                  </div>
                  <div class="item">
                    <span class="label">Group:</span> ${
                      request?.receiverDetails?.group || "N/A"
                    }
                  </div>
                  <div class="item">
                    <span class="label">Designation:</span> ${
                      request?.receiverDetails?.designation || "N/A"
                    }
                  </div>
                  <div class="item">
                    <span class="label">Contact:</span> ${
                      request?.receiverDetails?.contactNo || "N/A"
                    }
                  </div>
                `
              }
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Location Details</h2>
            <div class="grid">
              <div class="item">
                <span class="label">From:</span> ${
                  request?.outLocation ||
                  request?.requestDetails?.outLocation ||
                  request?.request?.outLocation ||
                  "N/A"
                }
              </div>
              <div class="item">
                <span class="label">To:</span> ${
                  request?.inLocation ||
                  request?.requestDetails?.inLocation ||
                  request?.request?.inLocation ||
                  "N/A"
                }
              </div>
              ${
                request?.isNonSltPlace ||
                request?.requestDetails?.isNonSltPlace ||
                request?.request?.isNonSltPlace
                  ? `
                  <div class="item">
                    <span class="label">Company:</span> ${
                      request?.companyName ||
                      request?.requestDetails?.companyName ||
                      request?.request?.companyName ||
                      "N/A"
                    }
                  </div>
                  <div class="item" style="grid-column: 1 / -1;">
                    <span class="label">Address:</span> ${
                      request?.companyAddress ||
                      request?.requestDetails?.companyAddress ||
                      request?.request?.companyAddress ||
                      "N/A"
                    }
                  </div>
                `
                  : ""
              }
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
                <span class="label">Vehicle Item Code:</span> ${
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
                <span class="label">Vehicle Item Code:</span> ${
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
                    request.requestDetails.loading.loadingTime,
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
                  request.loadUserData?.name || "N/A"
                }
              </div>
              <div class="item">
                <span class="label">Service No:</span> ${
                  request.loadUserData?.serviceNo || "N/A"
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
            <h2 class="section-title">items</h2>
            <table>
              <thead>
                <tr>
                  <th>item Name</th>
                  <th>Serial Number</th>
                  <th>Category</th>
                  <th>Item Code</th>
                </tr>
              </thead>
              <tbody>
                ${request.items
                  .map(
                    (item) => `
                  <tr>
                    <td>${item?.itemDescription || "-"}</td>
                    <td>${item?.serialNumber || "-"}</td>
                    <td>${item?.categoryDescription || "-"}</td>
                    <td>${item?.itemCode || "-"}</td>
                    
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
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

  const generateDESCRIPTIONDetailsPDF = (items, refNo) => {
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
    doc.text("SLT Gate Pass - item Details", pageWidth / 2, 20, {
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

    // items Table
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("item Details", margin, 45);

    // Table header
    let yPos = 55;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setDrawColor(200, 200, 200);

    // Define column widths
    const col1Width = 60; // item Name
    const col2Width = 40; // Serial Number
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

      // Alternate row colors for better readability
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

      // Truncate long text to fit in columns
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
        truncateText(item?.itemCode || "N/A", 15),
        margin + col1Width + col2Width + col3Width + col4Width + 3,
        yPos + 5.5,
      );

      // Draw horizontal line after each row
      doc.line(
        margin,
        yPos + 8,
        margin + col1Width + col2Width + col3Width + col4Width + col5Width,
        yPos + 8,
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
      { align: "center" },
    );

    // Save the PDF
    doc.save(`SLT_GatePass_DESCRIPTIONs_${request.refNo}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full flex flex-col h-[95vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div
          className={`p-3 pl-6 pr-6 flex-shrink-0 ${
            activeTab === "pending"
              ? "bg-gradient-to-r from-amber-600 to-orange-300"
              : activeTab === "approved"
                ? "bg-gradient-to-br from-emerald-600 to-green-600"
                : "bg-gradient-to-br from-rose-600 to-red-400"
          }`}
        >
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
          <div className="mt-2 text-blue-100">Reference: {request.refNo}</div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center ${
              currentTab === "details"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setCurrentTab("details")}
          >
            <FaInfoCircle className="mr-2" /> Request Details
          </button>
          {activeTab === "pending" && (
            <>
              <button
                className={`px-6 py-3 text-sm font-medium transition-colors flex items-center ${
                  currentTab === "loading"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setCurrentTab("loading")}
              >
                <FaBoxes className="mr-2" />
                {VerifyStatus ? "Loading Details" : "Unloading Details"}
              </button>
            </>
          )}

          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center ${
              currentTab === "navigation"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setCurrentTab("navigation")}
          >
            <FaCheckCircle className="mr-2" /> Approval
          </button>
        </div>

        {/* Main Content - Make this scrollable */}
        <div className="flex-grow overflow-y-auto p-6">
          {/* Request Details Tab */}
          {currentTab === "details" && (
            <>
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
                      {request?.senderDetails?.serviceNo ||
                        request?.requestDetails?.employeeServiceNo ||
                        request?.request?.employeeServiceNo ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Name
                    </label>
                    <p className="text-gray-800">
                      {request?.senderDetails?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Section
                    </label>
                    <p className="text-gray-800">
                      {request?.senderDetails?.section || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Group
                    </label>
                    <p className="text-gray-800">
                      {request?.senderDetails?.group || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Designation
                    </label>
                    <p className="text-gray-800">
                      {request?.senderDetails?.designation || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Contact
                    </label>
                    <p className="text-gray-800">
                      {request?.senderDetails?.contactNo || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* items Table */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                  <FaBoxOpen className="mr-2" /> item Details
                  <button
                    onClick={() =>
                      generateDESCRIPTIONDetailsPDF(
                        request.items,
                        request.refNo,
                      )
                    }
                    className="ml-auto px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center transition-colors"
                  >
                    <FaFilePdf className="mr-2" /> Download items PDF
                  </button>
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
                          <td className="px-6 py-4">
                            {item?.categoryDescription}
                          </td>
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
                            <ImageViewerModal
                              images={selectedDESCRIPTIONImages}
                              isOpen={isImageModalOpen}
                              onClose={() => setIsImageModalOpen(false)}
                              itemDescription={selecteditemDescription}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Returnable items Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                  <FaUndo className="mr-2" /> Returnable items
                </h3>
                {/* Add New item Button */}
                <button
                  onClick={() => setShowAddDESCRIPTIONModal(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center transition-colors shadow-sm"
                >
                  <FaPlus className="mr-2" />
                  Add New item{" "}
                </button>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Select
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          item{" "}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Serial Number
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {request?.items
                        ?.filter((item) => {
                          if (
                            request?.request?.isNonSltPlace === true ||
                            request?.requestDetails?.isNonSltPlace === true
                          ) {
                            return item.status === "returnable";
                          }
                          return (
                            item.status ===
                            "return to Out Location Petrol Leader"
                          );
                        })
                        .map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                disabled={isSuperAdmin}
                                checked={selectedDESCRIPTIONs?.includes(
                                  item.serialNumber,
                                )}
                                onChange={() => handleSelect(item.serialNumber)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              {item.itemDescription}
                            </td>
                            <td className="px-6 py-4">{item.serialNumber}</td>
                            <td className="px-6 py-4">{item?.itemQuantity}</td>
                            <td className="px-6 py-4">{item?.itemCode}</td>
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
                    disabled={
                      isSuperAdmin ||
                      selectedDESCRIPTIONs?.length === 0 ||
                      loading
                    }
                    className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                      isSuperAdmin || selectedDESCRIPTIONs?.length === 0
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    Mark as 'Returned' ({selectedDESCRIPTIONs?.length || 0})
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
                        Out Location
                      </label>
                      <p className="text-gray-800">
                        {request?.outLocation ||
                          request?.requestDetails?.outLocation ||
                          request?.request?.outLocation ||
                          "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        In Location
                      </label>
                      <p className="text-gray-800">
                        {request?.inLocation ||
                          request?.requestDetails?.inLocation ||
                          request?.request?.inLocation ||
                          "N/A"}
                      </p>
                    </div>
                    {(request?.isNonSltPlace ||
                      request?.requestDetails?.isNonSltPlace ||
                      request?.request?.isNonSltPlace) && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            Company
                          </label>
                          <p className="text-gray-800">
                            {request?.companyName ||
                              request?.requestDetails?.companyName ||
                              request?.request?.companyName ||
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            Address
                          </label>
                          <p className="text-gray-800">
                            {request?.companyAddress ||
                              request?.requestDetails?.companyAddress ||
                              request?.request?.companyAddress ||
                              "N/A"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {request?.isNonSltPlace ||
                request?.requestDetails?.isNonSltPlace ||
                request?.request?.isNonSltPlace ? (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                      <FaUserCheck className="mr-2" /> Receiver Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Name
                        </label>
                        <p className="text-gray-800">
                          {request?.receiverName ||
                            request?.requestDetails?.receiverName ||
                            request?.request?.receiverName ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          NIC
                        </label>
                        <p className="text-gray-800">
                          {request?.receiverNIC ||
                            request?.requestDetails?.receiverNIC ||
                            request?.request?.receiverNIC ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Contact
                        </label>
                        <p className="text-gray-800">
                          {request?.receiverContact ||
                            request?.requestDetails?.receiverContact ||
                            request?.request?.receiverContact ||
                            "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                      <FaUserCheck className="mr-2" /> Receiver Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Name
                        </label>
                        <p className="text-gray-800">
                          {request?.receiverDetails?.name ||
                            request?.receiverName ||
                            request?.requestDetails?.receiverName ||
                            request?.request?.receiverName ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Group
                        </label>
                        <p className="text-gray-800">
                          {request?.receiverDetails?.group || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Service No
                        </label>
                        <p className="text-gray-800">
                          {request?.receiverDetails?.serviceNo ||
                            request?.receiverServiceNo ||
                            request?.requestDetails?.receiverServiceNo ||
                            request?.request?.receiverServiceNo ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Contact
                        </label>
                        <p className="text-gray-800">
                          {request?.receiverDetails?.contactNo ||
                            request?.receiverContact ||
                            request?.requestDetails?.receiverContact ||
                            request?.request?.receiverContact ||
                            "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transport Details Section - Add this new section */}
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
                      {request?.requestDetails?.transport.transportMethod ||
                        "N/A"}
                    </p>
                  </div>

                  {request.requestDetails?.transport.transportMethod ===
                    "Vehicle" && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Transporter Type
                        </label>
                        <p className="text-gray-800">
                          {request?.requestDetails?.transport.transporterType ||
                            "N/A"}
                        </p>
                      </div>

                      {request?.requestDetails?.transport.transporterType ===
                      "SLT" ? (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Service No
                            </label>
                            <p className="text-gray-800">
                              {request?.requestDetails?.transport
                                .transporterServiceNo || "N/A"}
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
                              {request?.requestDetails?.transport
                                .nonSLTTransporterName || "N/A"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Transporter NIC
                            </label>
                            <p className="text-gray-800">
                              {request?.requestDetails?.transport
                                .nonSLTTransporterNIC || "N/A"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Transporter Phone
                            </label>
                            <p className="text-gray-800">
                              {request?.requestDetails?.transport
                                .nonSLTTransporterPhone || "N/A"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Transporter Email
                            </label>
                            <p className="text-gray-800">
                              {request?.requestDetails?.transport
                                .nonSLTTransporterEmail || "N/A"}
                            </p>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Vehicle Number
                        </label>
                        <p className="text-gray-800">
                          {request?.requestDetails?.transport.vehicleNumber ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Vehicle Item Code
                        </label>
                        <p className="text-gray-800">
                          {request?.requestDetails?.transport.vehicleModel ||
                            "N/A"}
                        </p>
                      </div>
                    </>
                  )}
                  {request?.requestDetails?.transport.transportMethod ===
                    "By Hand" && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Transporter Type
                        </label>
                        <p className="text-gray-800">
                          {request?.requestDetails?.transport.transporterType ||
                            "N/A"}
                        </p>
                      </div>

                      {request?.requestDetails?.transport.transporterType ===
                      "SLT" ? (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Service No
                            </label>
                            <p className="text-gray-800">
                              {request?.requestDetails?.transport
                                .transporterServiceNo || "N/A"}
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
                              {request?.requestDetails?.transport
                                .nonSLTTransporterName || "N/A"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Transporter NIC
                            </label>
                            <p className="text-gray-800">
                              {request?.requestDetails?.transport
                                .nonSLTTransporterNIC || "N/A"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Transporter Phone
                            </label>
                            <p className="text-gray-800">
                              {request?.requestDetails?.transport
                                .nonSLTTransporterPhone || "N/A"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Transporter Email
                            </label>
                            <p className="text-gray-800">
                              {request?.requestDetails?.transport
                                .nonSLTTransporterEmail || "N/A"}
                            </p>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Add New item Modal */}
          {showAddDESCRIPTIONModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                      <FaPlus className="mr-3" /> Add New Returnable item{" "}
                    </h2>
                    <button
                      onClick={() => setShowAddDESCRIPTIONModal(false)}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      <FaTimes className="text-xl" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        item Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newDESCRIPTION.itemDescription}
                        onChange={(e) =>
                          setNewDESCRIPTION({
                            ...newDESCRIPTION,
                            itemDescription: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter item name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Serial Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newDESCRIPTION.serialNumber}
                        onChange={(e) =>
                          setNewDESCRIPTION({
                            ...newDESCRIPTION,
                            serialNo: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter serial number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newDESCRIPTION.categoryDescription}
                        onChange={(e) =>
                          setNewDESCRIPTION({
                            ...newDESCRIPTION,
                            categoryDescription: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter category"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Code
                      </label>
                      <input
                        type="text"
                        value={newDESCRIPTION.itemCode}
                        onChange={(e) =>
                          setNewDESCRIPTION({
                            ...newDESCRIPTION,
                            itemCode: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter Item Code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newDESCRIPTION.itemQuantity}
                        onChange={(e) =>
                          setNewDESCRIPTION({
                            ...newDESCRIPTION,
                            itemQuantity: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/*<div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Expected Return Date
                                  </label>
                                  <input
                                    type="date"
                                    value={newDESCRIPTION.returnDate}
                                    onChange={(e) => setNewDESCRIPTION({...newDESCRIPTION, returnDate: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>*/}
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 text-sm">
                      <strong>Note:</strong> Fields marked with{" "}
                      <span className="text-red-500">*</span> are required. This
                      item will be added to the current gate pass request as a
                      returnable item.
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                  <button
                    onClick={() => setShowAddDESCRIPTIONModal(false)}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNewDESCRIPTION}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center"
                  >
                    <FaPlus className="mr-2" />
                    Add item{" "}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading/Verification Details Tab */}
          {currentTab === "loading" && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                  <FaHardHat className="mr-2" />
                  {VerifyStatus
                    ? "Verification Details"
                    : "Verification Details"}
                </h3>

                {/* Toggle between SLT and Non-SLT */}
                <div className="flex space-x-4 mb-6">
                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center ${
                      staffType === "slt"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setStaffType("SLT")}
                  >
                    <FaBuilding className="mr-2" /> SLT Employee
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center ${
                      staffType === "non-slt"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setStaffType("Non-SLT")}
                  >
                    <FaUserFriends className="mr-2" /> Non-SLT Employee
                  </button>
                </div>

                {staffType === "SLT" ? (
                  <>
                    {/* SLT Employee Search */}
                    <div className="mb-4">
                      <div className="flex items-center mb-4">
                        <input
                          type="text"
                          value={serviceId}
                          onChange={(e) => setServiceId(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              !isSuperAdmin &&
                              serviceId.trim()
                            ) {
                              e.preventDefault();
                              handleEmployeeSearch();
                            }
                          }}
                          placeholder="Enter Service ID"
                          className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        <button
                          onClick={handleEmployeeSearch}
                          disabled={isSuperAdmin}
                          className={`px-4 py-3 rounded-r-lg ${
                            isSuperAdmin
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-blue-500 hover:bg-blue-600 text-white"
                          }`}
                        >
                          <FaSearch />
                        </button>
                      </div>

                      {searchedEmployee && (
                        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">
                                Name
                              </label>
                              <p className="text-gray-800">
                                {searchedEmployee.name}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">
                                Service No
                              </label>
                              <p className="text-gray-800">
                                {searchedEmployee.serviceNo}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">
                                Email
                              </label>
                              <p className="text-gray-800">
                                {searchedEmployee.email}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">
                                Section
                              </label>
                              <p className="text-gray-800">
                                {searchedEmployee.section}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">
                                Branch
                              </label>
                              <p className="text-gray-800">
                                {searchedEmployee.branch}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">
                                Contact
                              </label>
                              <p className="text-gray-800">
                                {searchedEmployee.contactNo}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Non-SLT Employee Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        {formErrors.name && (
                          <p className="text-red-500 text-xs mb-1">
                            {formErrors.name}
                          </p>
                        )}
                        <input
                          type="text"
                          disabled={isSuperAdmin}
                          value={nonSltStaffDetails.name}
                          onChange={(e) =>
                            handleNonSltFieldChange("name", e.target.value)
                          }
                          className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            formErrors.name
                              ? "border-2 border-red-500 bg-red-50"
                              : "border border-gray-300"
                          }`}
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name
                        </label>
                        {formErrors.companyName && (
                          <p className="text-red-500 text-xs mb-1">
                            {formErrors.companyName}
                          </p>
                        )}
                        <input
                          type="text"
                          disabled={isSuperAdmin}
                          value={nonSltStaffDetails.companyName}
                          onChange={(e) =>
                            handleNonSltFieldChange(
                              "companyName",
                              e.target.value,
                            )
                          }
                          className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            formErrors.companyName
                              ? "border-2 border-red-500 bg-red-50"
                              : "border border-gray-300"
                          }`}
                          placeholder="Enter company name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          NIC
                        </label>
                        {formErrors.nic && (
                          <p className="text-red-500 text-xs mb-1">
                            {formErrors.nic}
                          </p>
                        )}
                        <input
                          type="text"
                          disabled={isSuperAdmin}
                          value={nonSltStaffDetails.nic}
                          onChange={(e) =>
                            handleNonSltFieldChange("nic", e.target.value)
                          }
                          className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            formErrors.nic
                              ? "border-2 border-red-500 bg-red-50"
                              : "border border-gray-300"
                          }`}
                          placeholder="e.g., 123456789V or 123456789012345"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Number
                        </label>
                        {formErrors.contactNo && (
                          <p className="text-red-500 text-xs mb-1">
                            {formErrors.contactNo}
                          </p>
                        )}
                        <input
                          type="text"
                          disabled={isSuperAdmin}
                          value={nonSltStaffDetails.contactNo}
                          onChange={(e) =>
                            handleNonSltFieldChange("contactNo", e.target.value)
                          }
                          className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            formErrors.contactNo
                              ? "border-2 border-red-500 bg-red-50"
                              : "border border-gray-300"
                          }`}
                          placeholder="e.g., +94701234567 or 0701234567"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        {formErrors.email && (
                          <p className="text-red-500 text-xs mb-1">
                            {formErrors.email}
                          </p>
                        )}
                        <input
                          type="email"
                          disabled={isSuperAdmin}
                          value={nonSltStaffDetails.email}
                          onChange={(e) =>
                            handleNonSltFieldChange("email", e.target.value)
                          }
                          className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            formErrors.email
                              ? "border-2 border-red-500 bg-red-50"
                              : "border border-gray-300"
                          }`}
                          placeholder="Enter email address"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Navigation/Approval Tab */}
          {currentTab === "navigation" && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                  <FaCheckCircle className="mr-2" /> Approval Information
                </h3>

                {/* Report Generation Card */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center justify-between">
                    <div className="mb-4 md:mb-0">
                      <h4 className="text-lg font-semibold text-blue-800 mb-1">
                        Generate Gate Pass Report
                      </h4>
                      <p className="text-sm text-blue-600">
                        Download a PDF report with all gate pass details
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() =>
                          printReport(
                            request,
                            transporterDetails,
                            searchedEmployee,
                          )
                        }
                        className="px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-all flex items-center"
                      >
                        <FaPrint className="mr-2" /> Print
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Request Summary
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>Reference: {request.refNo}</li>
                        <li>Sender: {request.senderDetails?.name}</li>
                        <li>items: {request.items.length}</li>
                        <li>From: {request.outLocation}</li>
                        <li>To: {request.inLocation}</li>
                      </ul>
                    </div>
                    {request?.requestDetails?.transport.transporterType ===
                      "Non-SLT" && (
                      <>
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Transport Information
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li>
                              Transport Method:{" "}
                              {request?.requestDetails?.transport
                                .transportMethod || "Not specified"}
                            </li>
                            <li>
                              Transporter Type:{" "}
                              {request?.requestDetails?.transport
                                .transporterType || "Not specified"}
                            </li>
                            <li>
                              Transporter Name:{" "}
                              {request?.requestDetails?.transport
                                .nonSLTTransporterName || "Not specified"}
                            </li>
                            <li>
                              Transporter Contact:{" "}
                              {request?.requestDetails?.transport
                                .nonSLTTransporterPhone || "Not specified"}
                            </li>
                            <li>
                              Email:{" "}
                              {request?.requestDetails?.transport
                                .nonSLTTransporterEmail || "Not specified"}
                            </li>
                            {request?.requestDetails?.transport
                              .transporterType === "Vehicle" && (
                              <>
                                <li>
                                  Vehicle Number:{" "}
                                  {request?.requestDetails?.transport
                                    .vehicleNumber || "Not specified"}
                                </li>
                                <li>
                                  Vehicle Item Code:{" "}
                                  {request?.requestDetails?.transport
                                    .vehicleModel || "Not specified"}
                                </li>
                              </>
                            )}
                          </ul>
                        </div>
                      </>
                    )}
                    {request?.requestDetails?.transport.transporterType ===
                      "SLT" && (
                      <>
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Transport Information
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li>
                              Transport Method:{" "}
                              {request?.requestDetails?.transport
                                .transportMethod || "Not specified"}
                            </li>
                            <li>
                              Transporter Type:{" "}
                              {request?.requestDetails?.transport
                                .transporterType || "Not specified"}
                            </li>
                            <li>
                              Service No:{" "}
                              {transporterDetails?.serviceNo || "Not specified"}
                            </li>
                            <li>
                              Name:{" "}
                              {transporterDetails?.name || "Not specified"}
                            </li>
                            <li>
                              Section:{" "}
                              {transporterDetails?.section || "Not specified"}
                            </li>
                            <li>
                              Group:{" "}
                              {transporterDetails?.group || "Not specified"}
                            </li>
                            <li>
                              Designation:{" "}
                              {transporterDetails?.designation ||
                                "Not specified"}
                            </li>
                            <li>
                              Contact:{" "}
                              {transporterDetails?.contactNo || "Not specified"}
                            </li>
                            {request?.requestDetails?.transport
                              .transporterType === "Vehicle" && (
                              <>
                                <li>
                                  Vehicle Number:{" "}
                                  {request?.requestDetails?.transport
                                    .vehicleNumber || "Not specified"}
                                </li>
                                <li>
                                  Vehicle Item Code:{" "}
                                  {request?.requestDetails?.transport
                                    .vehicleModel || "Not specified"}
                                </li>
                              </>
                            )}
                          </ul>
                        </div>
                      </>
                    )}

                    {request?.requestDetails?.loading?.staffType ===
                      "Non-SLT" && (
                      <>
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Loading Information
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li>
                              Staff Type:{" "}
                              {request?.requestDetails?.loading.staffType ||
                                "Not specified"}
                            </li>
                            <li>
                              Name:{" "}
                              {request?.requestDetails?.loading
                                .nonSLTStaffName || "Not specified"}
                            </li>
                            <li>
                              Nic:{" "}
                              {request?.requestDetails?.loading
                                .nonSLTStaffNIC || "Not specified"}
                            </li>
                            <li>
                              Enail:{" "}
                              {request?.requestDetails?.loading
                                .nonSLTStaffEmail || "Not specified"}
                            </li>
                            <li>
                              Contact:{" "}
                              {request?.requestDetails?.loading
                                .nonSLTStaffContact || "Not specified"}
                            </li>
                            <li>
                              Company:{" "}
                              {request?.requestDetails?.loading
                                .nonSLTStaffCompany || "Not specified"}
                            </li>
                            <li>
                              Time:{" "}
                              {new Date(
                                request?.requestDetails?.loading.loadingTime,
                              ).toLocaleString() || "Not specified"}
                            </li>
                            <li>
                              Loading Location:{" "}
                              {request?.requestDetails?.loading
                                .loadingLocation || "Not specified"}
                            </li>
                          </ul>
                        </div>
                      </>
                    )}

                    {request?.requestDetails?.loading?.staffType === "SLT" && (
                      <>
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Loading Information
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li>
                              Staff Type:{" "}
                              {request?.requestDetails?.loading.staffType ||
                                "Not specified"}
                            </li>
                            <li>
                              Service No:{" "}
                              {transporterDetails?.serviceNo || "Not specified"}
                            </li>
                            <li>
                              Name:{" "}
                              {transporterDetails?.name || "Not specified"}
                            </li>
                            <li>
                              Section:{" "}
                              {transporterDetails?.section || "Not specified"}
                            </li>
                            <li>
                              Group:{" "}
                              {transporterDetails?.group || "Not specified"}
                            </li>
                            <li>
                              Designation:{" "}
                              {transporterDetails?.designation ||
                                "Not specified"}
                            </li>
                            <li>
                              Contact:{" "}
                              {transporterDetails?.contactNo || "Not specified"}
                            </li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                  {activeTab !== "pending" && request?.comment && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-700 mb-2">
                        Comment
                      </h4>
                      <p className="text-gray-600">{request.comment}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed bottom section for comments and buttons */}
        <div className="flex-shrink-0">
          <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Previous/Next Buttons */}
              {currentTab !== "navigation" && currentTab !== "details" && (
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={goToPreviousTab}
                    disabled={currentTab === tabOrder[0]}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                      currentTab === tabOrder[0]
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >
                    <FaArrowLeft className="mr-2" /> Previous
                  </button>
                  <button
                    onClick={goToNextTab}
                    className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium flex items-center"
                  >
                    Next <FaArrowRight className="ml-2" />
                  </button>
                </div>
              )}

              {/* Comments Section - Only show in Navigation tab */}
              {currentTab === "navigation" &&
                activeTab === "pending" &&
                !isSuperAdmin && (
                  <div className="md:w-full space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Comment
                    </label>
                    <textarea
                      value={comment}
                      disabled={isSuperAdmin}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Add your comments here..."
                      rows={2}
                    ></textarea>

                    <div className="flex justify-between mt-4">
                      {/* Previous Button - Aligned Left */}
                      <button
                        onClick={goToPreviousTab}
                        disabled={currentTab === tabOrder[0]}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                          currentTab === tabOrder[0]
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        }`}
                      >
                        <FaArrowLeft className="mr-2" /> Previous
                      </button>

                      {/* Approve & Reject Buttons - Aligned Right */}
                      <div className="flex space-x-4">
                        <button
                          onClick={() => handleReject(request)}
                          className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center"
                        >
                          <FaTimes className="mr-2" /> Reject
                        </button>
                        <button
                          onClick={() => handleApprove(request)}
                          className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium flex items-center"
                        >
                          <FaCheck className="mr-2" /> Approve
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {activeTab != "pending" && (
                <div className="border-t border-gray-200 bg-white">
                  {/* Comment Display Section */}
                  {request.comment && request.comment.length > 0 && (
                    <div className="mb-3 mt-3 mr-6 ml-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Previous Comments
                      </h3>

                      <div className="max-h-35 overflow-y-auto mb-3">
                        <div className="mb-2 p-2 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <span
                              className="text-sm font-medium text-gray-700"
                              style={{ marginRight: "665px" }}
                            >
                              {request.comment}
                            </span>
                            <span className="text-sm font-medium text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// In the ImageViewerModal component
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
          {/* Main display area */}
          <div className="h-80 md:h-96 overflow-hidden relative bg-black">
            {imageUrls.length > 0 && (
              <img
                src={imageUrls[activeIndex]}
                alt={`${itemDescription} ${activeIndex + 1}`}
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

export default Verify;
