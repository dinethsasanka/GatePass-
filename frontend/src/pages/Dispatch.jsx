import { useState, useEffect } from "react";
import {
  getPendingStatuses,
  getApprovedStatuses,
  getRejectedStatuses,
  approveStatus,
  rejectStatus,
  searchUserByServiceNo,
  markItemsAsReturned,
} from "../services/dispatchService.js";
import {
  getImageUrlSync,
  searchReceiverByServiceNo,
  searchEmployeeByServiceNo
} from "../services/RequestService.js";
import { jsPDF } from "jspdf";
import { useToast } from "../components/ToastProvider.jsx";
import logoUrl from "../assets/SLTMobitel_Logo.png";
import { emailSent } from "../services/emailService.js";
import { getCachedUser, setCachedUser } from "../utils/userCache.js";
import { useAutoRefetch } from "../hooks/useRealtimeUpdates.js";
import {
  FaClock,
  FaEye,
  FaUser,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaUserCheck,
  FaTimes,
  FaInfoCircle,
  FaTimesCircle,
  FaCheckCircle,
  FaSearch,
  FaCheck,
  FaTruck,
  FaArrowLeft,
  FaArrowRight,
  FaFilePdf,
  FaPrint,
  FaUndo,
} from "react-icons/fa";

// Helper function to detect Non-SLT identifiers
const isNonSltIdentifier = (serviceNo) => {
  if (!serviceNo) return false;
  // Check for NSL prefix
  if (serviceNo.startsWith("NSL")) return true;
  // Check for pure numeric 4-6 digits (like 0005, 0008, 010086, 007354)
  if (/^\d{4,6}$/.test(serviceNo)) return true;
  return false;
};

const Dispatch = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [comment, setComment] = useState("");
  const [pendingItems, setPendingItems] = useState([]);
  const [approvedItems, setApprovedItems] = useState([]);
  const [rejectedItems, setRejectedItems] = useState([]);
  const [transportData, setTransportData] = useState(null);
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [companyTypeFilter, setCompanyTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [user, setUser] = useState(null);

  const isSuperAdmin =
    user?.role === "SUPERADMIN" ||
    user?.username === "SUPER001" ||
    user?.serviceNo === "SUPER001";

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
  }, []);

  // Real-time updates for Dispatch page (status: 4 = Petrol Leader/Dispatch Pending)
  useAutoRefetch(
    async () => {
      if (!user || !user.branches) return;

      try {
        const data = await getPendingStatuses();

        const filteredData = data; // SuperAdmin: global, Pleader: branch-scoped by backend

        const formattedData = await Promise.all(
          filteredData.map(async (status) => {
            const senderServiceNo = status.request?.employeeServiceNo;
            const receiverServiceNo = status.request?.receiverServiceNo;
            const loadingDetails = status.request?.loading;
            const isNonSltPlace = status.request?.isNonSltPlace;
            let senderDetails = null;
            let receiverDetails = null;
            let loadUserData = null;
            let exerctiveOfficerData = null;
            let verifyOfficerData = null;

            if (senderServiceNo) {
              try {
                senderDetails = await getCachedUser(
                  senderServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {}
            }

            if (
              receiverServiceNo &&
              !isNonSltPlace &&
              !isNonSltIdentifier(receiverServiceNo)
            ) {
              try {
                receiverDetails = await getCachedUser(
                  receiverServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {}
            } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
              receiverDetails = {
                name: status.request?.receiverName || "N/A",
                nic: status.request?.receiverNIC || receiverServiceNo,
                contactNo: status.request?.receiverContact || "N/A",
              };
            }

            if (
              loadingDetails?.staffType === "SLT" &&
              loadingDetails.staffServiceNo
            ) {
              try {
                loadUserData = await getCachedUser(
                  loadingDetails.staffServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {}
            }

            if (status.executiveOfficerServiceNo) {
              try {
                exerctiveOfficerData = await getCachedUser(
                  status.executiveOfficerServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {}
            }

            // if (status.verifyOfficerServiceNumber) {
            //   try {
            //     verifyOfficerData = await getCachedUser(
            //       status.verifyOfficerServiceNumber,
            //       searchUserByServiceNo
            //     );
            //   } catch (e) {}
            // }
            const vo =
              status.verifyOfficerServiceNumber ||
              status.verifyOfficerServiceNo;
            if (vo) {
              try {
                verifyOfficerData = await getCachedUser(
                  vo,
                  searchUserByServiceNo
                );
              } catch (e) {}
            }

            return {
              refNo: status.referenceNumber,
              senderDetails: senderDetails,
              receiverDetails: receiverDetails,
              transportData: status.request?.transport,
              loadingDetails: loadingDetails,
              inLocation: status.request?.inLocation,
              outLocation: status.request?.outLocation,
              createdAt: new Date(status.createdAt).toLocaleString(),
              items: status.request?.items || [],
              comment:
                status.comment ||
                status.verifyOfficerComment ||
                status.dispatchComment ||
                "",
              requestDetails: { ...status.request },
              loadUserData: loadUserData,
              statusDetails: status,
              executiveOfficerData: exerctiveOfficerData,
              verifyOfficerData: verifyOfficerData,
            };
          })
        );

        const uniqueItems = formattedData.reduce((acc, item) => {
          const existing = acc.find((x) => x.refNo === item.refNo);
          if (!existing) {
            acc.push(item);
          } else {
            const existingDate = new Date(existing.createdAt);
            const currentDate = new Date(item.createdAt);
            if (currentDate > existingDate) {
              const index = acc.findIndex((x) => x.refNo === item.refNo);
              acc[index] = item;
            }
          }
          return acc;
        }, []);

        setPendingItems(uniqueItems);
      } catch (error) {
        console.error("Error fetching pending statuses:", error);
      }
    },
    [activeTab, user],
    { status: 4 } // Dispatch/Petrol Leader pending requests
  );

  // --- Data Fetching Effects ---

  // Fetch Pending Items on mount and tab change
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.branches || activeTab !== "pending") return;

      try {
        const data = await getPendingStatuses();

        const filteredData = data; // SuperAdmin: global, Pleader: branch-scoped by backend

        const formattedData = await Promise.all(
          filteredData.map(async (status) => {
            const senderServiceNo = status.request?.employeeServiceNo;
            const receiverServiceNo = status.request?.receiverServiceNo;
            const loadingDetails = status.request?.loading;
            const isNonSltPlace = status.request?.isNonSltPlace;
            let senderDetails = null;
            let receiverDetails = null;
            let loadUserData = null;
            let exerctiveOfficerData = null;
            let verifyOfficerData = null;

            if (senderServiceNo) {
              try {
                senderDetails = await getCachedUser(
                  senderServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {}
            }

            if (
              receiverServiceNo &&
              !isNonSltPlace &&
              !isNonSltIdentifier(receiverServiceNo)
            ) {
              try {
                receiverDetails = await getCachedUser(
                  receiverServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {}
            } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
              receiverDetails = {
                name: status.request?.receiverName || "N/A",
                nic: status.request?.receiverNIC || receiverServiceNo,
                contactNo: status.request?.receiverContact || "N/A",
              };
            }

            if (
              loadingDetails?.staffType === "SLT" &&
              loadingDetails.staffServiceNo
            ) {
              try {
                loadUserData = await getCachedUser(
                  loadingDetails.staffServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {}
            }

            if (status.executiveOfficerServiceNo) {
              try {
                exerctiveOfficerData = await getCachedUser(
                  status.executiveOfficerServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {}
            }

            if (status.verifyOfficerServiceNumber) {
              try {
                verifyOfficerData = await getCachedUser(
                  status.verifyOfficerServiceNumber,
                  searchUserByServiceNo
                );
              } catch (e) {}
            }

            return {
              refNo: status.referenceNumber,
              senderDetails: senderDetails,
              receiverDetails: receiverDetails,
              transportData: status.request?.transport,
              loadingDetails: loadingDetails,
              inLocation: status.request?.inLocation,
              outLocation: status.request?.outLocation,
              createdAt: new Date(status.createdAt).toLocaleString(),
              items: status.request?.items || [],
              comment: comment,
              requestDetails: { ...status.request },
              loadUserData: loadUserData,
              statusDetails: status,
              executiveOfficerData: exerctiveOfficerData,
              verifyOfficerData: verifyOfficerData,
            };
          })
        );

        const uniqueItems = formattedData.reduce((acc, item) => {
          const existing = acc.find((x) => x.refNo === item.refNo);
          if (!existing) {
            acc.push(item);
          } else {
            const existingDate = new Date(existing.createdAt);
            const currentDate = new Date(item.createdAt);
            if (currentDate > existingDate) {
              const index = acc.findIndex((x) => x.refNo === item.refNo);
              acc[index] = item;
            }
          }
          return acc;
        }, []);

        setPendingItems(uniqueItems);
      } catch (error) {
        console.error("Error fetching pending statuses:", error);
      }
    };
    fetchData();
  }, [activeTab, user]);

  // Fetch Approved Items
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getApprovedStatuses();

        // PL2 manages dispatch TO their branch (inLocation)
        // They handle incoming packages that need to be received at their branch
        // Filter to only show items that:
        // 1. Have a valid request object
        // 2. Have an inLocation (destination) that matches user's branches
        const filteredData = data; // SuperAdmin: global, Pleader: branch-scoped by backend

        const formattedData = await Promise.all(
          filteredData.map(async (status) => {
            const senderServiceNo = status.request?.employeeServiceNo;
            const receiverServiceNo = status.request?.receiverServiceNo;
            const isNonSltPlace = status.request?.isNonSltPlace;
            let senderDetails = null;
            let receiverDetails = null;

            if (senderServiceNo) {
              // Fetch user data for ANY service number (SLT or Non-SLT)
              try {
                senderDetails = await getCachedUser(
                  senderServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {
                // Silently handle missing users
              }
            }

            if (
              receiverServiceNo &&
              !isNonSltPlace &&
              !isNonSltIdentifier(receiverServiceNo)
            ) {
              try {
                receiverDetails = await getCachedUser(
                  receiverServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {
                // Silently handle missing users
              }
            } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
              receiverDetails = {
                name: status.request?.receiverName || "N/A",
                nic: status.request?.receiverNIC || receiverServiceNo,
                contactNo: status.request?.receiverContact || "N/A",
              };
            }

            return {
              refNo: status.referenceNumber,
              senderDetails: senderDetails,
              receiverDetails: receiverDetails,
              inLocation: status.request?.inLocation,
              outLocation: status.request?.outLocation,
              createdAt: new Date(status.createdAt).toLocaleString(),
              items: status.request?.items || [],
              comment: status.comment,
              requestDetails: { ...status.request },
            };
          })
        );

        // Remove duplicates by reference number (keep the most recent one)
        const uniqueItems = formattedData.reduce((acc, item) => {
          const existing = acc.find((x) => x.refNo === item.refNo);
          if (!existing) {
            acc.push(item);
          } else {
            const existingDate = new Date(existing.createdAt);
            const currentDate = new Date(item.createdAt);
            if (currentDate > existingDate) {
              const index = acc.findIndex((x) => x.refNo === item.refNo);
              acc[index] = item;
            }
          }
          return acc;
        }, []);

        setApprovedItems(uniqueItems);
      } catch (error) {
        console.error("Error fetching approved statuses:", error);
      }
    };
    fetchData();
  }, [activeTab, user]);

  // Fetch Rejected Items
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getRejectedStatuses();

        // PL2 manages dispatch TO their branch (inLocation)
        // They handle incoming packages that need to be received at their branch
        // Filter to only show items that:
        // 1. Have a valid request object
        // 2. Have an inLocation (destination) that matches user's branches
        const filteredData = data; // SuperAdmin: global, Pleader: branch-scoped by backend

        const formattedData = await Promise.all(
          filteredData.map(async (status) => {
            const senderServiceNo = status.request?.employeeServiceNo;
            const receiverServiceNo = status.request?.receiverServiceNo;
            const isNonSltPlace = status.request?.isNonSltPlace;
            let senderDetails = null;
            let receiverDetails = null;

            if (senderServiceNo) {
              // Fetch user data for ANY service number (SLT or Non-SLT)
              try {
                senderDetails = await getCachedUser(
                  senderServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {
                // Silently handle missing users
              }
            }

            if (
              receiverServiceNo &&
              !isNonSltPlace &&
              !isNonSltIdentifier(receiverServiceNo)
            ) {
              try {
                receiverDetails = await getCachedUser(
                  receiverServiceNo,
                  searchUserByServiceNo
                );
              } catch (e) {
                // Silently handle missing users
              }
            } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
              receiverDetails = {
                name: status.request?.receiverName || "N/A",
                nic: status.request?.receiverNIC || receiverServiceNo,
                contactNo: status.request?.receiverContact || "N/A",
              };
            }

            return {
              refNo: status.referenceNumber,
              senderDetails: senderDetails,
              receiverDetails: receiverDetails,
              inLocation: status.request?.inLocation,
              outLocation: status.request?.outLocation,
              createdAt: new Date(status.createdAt).toLocaleString(),
              items: status.request?.items || [],
              comment: status.comment,
              requestDetails: { ...status.request },
              isNonSlt: status.request?.isNonSltPlace || false,
            };
          })
        );

        // Remove duplicates by reference number (keep the most recent one)
        const uniqueItems = formattedData.reduce((acc, item) => {
          const existing = acc.find((x) => x.refNo === item.refNo);
          if (!existing) {
            acc.push(item);
          } else {
            const existingDate = new Date(existing.createdAt);
            const currentDate = new Date(item.createdAt);
            if (currentDate > existingDate) {
              const index = acc.findIndex((x) => x.refNo === item.refNo);
              acc[index] = item;
            }
          }
          return acc;
        }, []);

        setRejectedItems(uniqueItems);
      } catch (error) {
        console.error("Error fetching rejected statuses:", error);
      }
    };
    fetchData();
  }, [activeTab, user]);

  // --- Approval Logic ---

  // First, rename the function (change sendRecieverNotificationEmail to sendReceiverNotificationEmail)
  const sendReceiverNotificationEmail = async (
    receiverData,
    requestData,
    referenceNumber
  ) => {
    try {
      if (!receiverData?.email) {
        console.warn(
          "Receiver email not available for notification:",
          receiverData
        );
        showToast("Receiver email not available for notification.", "warning");
        return false; // Return false instead of void
      }

      const emailSubject = `Gate Pass Request ${referenceNumber} - Approved by Dispatch`;

      // Create a more detailed email body
      const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="SLT Logo" style="max-height: 60px; margin-bottom: 10px;" />
          <h2 style="color: #3b82f6; margin-bottom: 5px;">Gate Pass Request Approved</h2>
          <p style="color: #757575; font-size: 14px;">Reference Number: ${referenceNumber}</p>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 4px; border-left: 4px solid #3b82f6;">
          <p>Dear ${receiverData.name},</p>
          <p>The gate pass request has been <strong>APPROVED</strong> by the Dispatch Officer and is ready for collection/delivery.</p>
          
          <div style="margin-top: 15px;">
            <p><strong>Summary:</strong></p>
            <ul style="padding-left: 20px; margin: 0;">
              <li><strong>Reference:</strong> ${referenceNumber}</li>
              <li><strong>From:</strong> ${requestData.outLocation}</li>
              <li><strong>To:</strong> ${requestData.inLocation}</li>
              <li><strong>Items Count:</strong> ${requestData.items.length}</li>
              <li><strong>Approval Date:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Item Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Item Name</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Serial No</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Category</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${requestData.items
                .map(
                  (item) => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${
                    item.itemName
                  }</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${
                    item.serialNo || "-"
                  }</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${
                    item.itemCategory || "-"
                  }</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
                    <span style="color: ${
                      item.itemReturnable ? "#10b981" : "#f59e0b"
                    }; font-weight: bold;">
                      ${item.itemReturnable ? "Returnable" : "Non-Returnable"}
                    </span>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #e8f5e9; border-radius: 4px;">
          <h4 style="color: #2e7d32; margin-bottom: 10px;">🚚 Next Steps:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Items will be dispatched from <strong>${
              requestData.outLocation
            }</strong></li>
            <li>Expected delivery/collection at <strong>${
              requestData.inLocation
            }</strong></li>
            <li>Please be available to receive the items</li>
            <li>Check all items upon receipt</li>
          </ul>
        </div>
        
        <div style="margin-bottom: 20px; text-align: center;">
          <p>You can view the complete gate pass details in the system:</p>
          <a href="${window.location.origin}/dispatch" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; margin-top: 10px;">
            View Gate Pass Details
          </a>
        </div>
        
        <div style="font-size: 12px; color: #757575; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
          <p><strong>Important:</strong> Please bring this reference number when collecting items.</p>
          <p>This is an automated email from the SLT Gate Pass Management System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Sri Lanka Telecom. All rights reserved.</p>
        </div>
      </div>
    `;

      // Send the email
      const result = await emailSent({
        to: receiverData.email,
        subject: emailSubject,
        html: emailBody,
      });

      console.log("Notification email sent to receiver:", receiverData.email);
      return true; // Return true on success
    } catch (error) {
      console.error("Failed to send notification email:", error);
      showToast("Failed to send receiver notification email.", "error");
      return false; // Return false on failure
    }
  };

  const sendRejectionEmailToSender = async (
    senderData,
    requestData,
    referenceNumber,
    rejectionComment
  ) => {
    try {
      if (!senderData?.email) {
        showToast("Sender email not available for notification.", "warning");
        return false; // Return false if no email
      }

      const emailSubject = `Gate Pass Request ${referenceNumber} - Rejected by Dispatch`;

      const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ef4444; margin-bottom: 5px;">Gate Pass Request Rejected</h2>
          <p style="color: #757575; font-size: 14px;">Reference Number: ${referenceNumber}</p>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #fef2f2; border-radius: 4px; border-left: 4px solid #ef4444;">
          <p>Dear ${senderData.name},</p>
          <p>We regret to inform you that your gate pass request (Ref: ${referenceNumber}) from ${
        requestData.outLocation
      } to ${
        requestData.inLocation
      } has been <strong>rejected</strong> by the Dispatch Officer.</p>
          
          <div style="margin-top: 15px;">
            <p><strong>Rejection Reason:</strong></p>
            <div style="background-color: #fecaca; padding: 10px; border-radius: 4px; margin-top: 5px;">
              <p style="margin: 0; font-style: italic;">"${rejectionComment}"</p>
            </div>
          </div>
          
          <div style="margin-top: 15px;">
            <p><strong>Item Summary:</strong></p>
            <ul style="padding-left: 20px;">
              <li>Total Items: ${requestData.items.length}</li>
              <li>Date/Time: ${new Date().toLocaleString()}</li>
            </ul>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Item Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Item</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Serial No</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Category</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0;">Status</th>
            </tr>
            ${requestData.items
              .map(
                (item) => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${
                  item.itemName
                }</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${
                  item.serialNo || "-"
                }</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${
                  item.itemCategory || "-"
                }</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${
                  item.itemReturnable ? "Returnable" : "Non-Returnable"
                }</td>
              </tr>
            `
              )
              .join("")}
          </table>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p>Please review the rejection reason and submit a new request if necessary.</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${
              window.location.origin
            }" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">View System</a>
          </div>
        </div>
        
        <div style="font-size: 12px; color: #757575; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
          <p>This is an automated email from the SLT Gate Pass Management System. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Sri Lanka Telecom. All rights reserved.</p>
        </div>
      </div>
    `;

      await emailSent({
        to: senderData.email,
        subject: emailSubject,
        html: emailBody,
      });

      return true; // Return true if email sent successfully
    } catch (error) {
      console.error("Failed to send rejection email:", error);
      return false; // Return false if email failed
    }
  };

  const sendReturnTOPetrolLeaderEmail = async (
    request,
    comment,
    selectedItemDetails
  ) => {
    try {
      // Get the executive officer details from the request
      const verifyServiceNo =
        request.requestDetails?.verifyOfficerServiceNumber ||
        request.request?.verifyOfficerServiceNumber;

      if (!verifyServiceNo) {
        console.error("Verify officer service number not found");
        showToast("Verify officer details not available", "error");
        return;
      }

      // Fetch executive officer details
      const verify = await searchReceiverByServiceNo(verifyServiceNo);

      if (!verify?.email) {
        console.error("Verify officer email not found");
        showToast("Verify officer email not available", "error");
        return;
      }

      const emailSubject = `Action Required: Review and Return Items - ${request.refNo}`;

      // Create a professional email body with HTML formatting
      const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2fd33dff; margin-bottom: 5px;">⚠️ Action Required: Review and Return Items</h2>
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
          
          <p style="margin-bottom: 15px;">We would like to inform you that ${
            selectedItemDetails.length
          } returnable item(s) under reference number <b>${
        request.refNo
      }</b> have been returned by the Receiver.</p>
          
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

        <!-- Items Table -->
        <div style="margin-bottom: 20px;">
          <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Items to be Returned</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Item Name</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Serial No</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Category</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${
                selectedItemDetails
                  ?.map(
                    (item) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.itemName || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.serialNo || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.itemCategory || "N/A"
                  }</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${
                    item.itemQuantity || "1"
                  }</td>
                </tr>
              `
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
        to: verify.email,
        subject: emailSubject,
        html: emailBody,
      });

      console.log("Verify officer notification email sent successfully");
      showToast("Return notification email sent to Verify officer", "success");

      return result;
    } catch (error) {
      console.error("Failed to send return email to verify officer:", error);
      showToast("Failed to send email to verify officer", "error");
      throw error;
    }
  };

  const handleEmailNotification = async (request, approvedItem) => {
    try {
      // Get receiver service number from multiple possible locations
      const receiverServiceNo =
        request?.receiverServiceNo ||
        request?.receiverDetails?.serviceNo ||
        approvedItem?.receiverDetails?.serviceNo;

      const isNonSltPlace = request?.isNonSltPlace || false;

      console.log("Debug - Email notification:", {
        receiverServiceNo,
        isNonSltPlace,
        request: request,
        approvedItemReceiver: approvedItem?.receiverDetails,
      });

      if (isNonSltPlace) {
        // Non-SLT receiver
        const receiverName = request?.receiverName || "Non-SLT Receiver";
        const receiverEmail = request?.receiverEmail;

        if (receiverEmail) {
          const emailSent = await sendReceiverNotificationEmail(
            { name: receiverName, email: receiverEmail },
            {
              outLocation: approvedItem.outLocation,
              inLocation: approvedItem.inLocation,
              items: approvedItem.items,
            },
            approvedItem.refNo
          );

          return {
            success: true,
            message: emailSent
              ? `Email sent to ${receiverName} (Non-SLT)`
              : `Failed to send email to ${receiverName} (Non-SLT)`,
            receiverFound: true,
            emailSent,
            receiverName,
          };
        } else {
          return {
            success: false,
            message: `Non-SLT receiver "${receiverName}" found but email not available`,
            receiverFound: true,
            emailSent: false,
            receiverName,
          };
        }
      } else if (receiverServiceNo) {
        // SLT receiver
        try {
          const receiverDetails = await searchReceiverByServiceNo(
            receiverServiceNo
          );

          if (receiverDetails) {
            const receiverName = receiverDetails.name || "SLT Employee";

            if (receiverDetails.email) {
              const emailSent = await sendReceiverNotificationEmail(
                receiverDetails,
                {
                  outLocation: approvedItem.outLocation,
                  inLocation: approvedItem.inLocation,
                  items: approvedItem.items,
                },
                approvedItem.refNo
              );

              return {
                success: true,
                message: emailSent
                  ? `Email sent to ${receiverName} (${receiverServiceNo})`
                  : `Failed to send email to ${receiverName} (${receiverServiceNo})`,
                receiverFound: true,
                emailSent,
                receiverName,
              };
            } else {
              return {
                success: false,
                message: `Receiver "${receiverName}" (${receiverServiceNo}) found but email not available`,
                receiverFound: true,
                emailSent: false,
                receiverName,
              };
            }
          } else {
            return {
              success: false,
              message: `Receiver with service number "${receiverServiceNo}" not found in SLT system`,
              receiverFound: false,
              emailSent: false,
              receiverName: null,
            };
          }
        } catch (error) {
          return {
            success: false,
            message: `Error fetching receiver "${receiverServiceNo}": ${error.message}`,
            receiverFound: false,
            emailSent: false,
            receiverName: null,
          };
        }
      } else {
        return {
          success: false,
          message: "No receiver service number provided in request",
          receiverFound: false,
          emailSent: false,
          receiverName: null,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Email notification error: ${error.message}`,
        receiverFound: false,
        emailSent: false,
        receiverName: null,
      };
    }
  };
  const getReceiverEmail = async (request) => {
    try {
      const receiverServiceNo = request?.receiverServiceNo;
      const isNonSltPlace = request?.isNonSltPlace || false;

      if (isNonSltPlace) {
        // For Non-SLT, check for email in request
        return request?.receiverEmail || null;
      } else if (receiverServiceNo) {
        // For SLT employees, fetch from system
        try {
          const receiver = await searchReceiverByServiceNo(receiverServiceNo);
          return receiver?.email || null;
        } catch (error) {
          console.warn("Could not fetch receiver email:", error);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting receiver email:", error);
      return null;
    }
  };
  const handleApprove = async (item) => {
    if (isSuperAdmin) {
      showToast("Super Admin has view-only access.", "warning");
      return;
    }

    try {
      const updatedStatus = await approveStatus(item.refNo, comment);
      const statusData = updatedStatus;

      const approvedItem = {
        ...item,
        refNo: statusData.referenceNumber,
        inLocation: statusData.request?.inLocation,
        outLocation: statusData.request?.outLocation,
        createdAt: new Date(statusData.createdAt).toLocaleString(),
        items: statusData.request?.items || [],
        comment: statusData.comment || "",
        requestDetails: { ...statusData.request },
      };

      // Update UI state
      setPendingItems(pendingItems.filter((i) => i.refNo !== item.refNo));
      setApprovedItems([...approvedItems, approvedItem]);

      // Cleanup
      setShowModal(false);
      setComment("");

      // Debug log to see what data we have
      console.log("Debug - Approval data:", {
        request: statusData.request,
        approvedItem: approvedItem,
        receiverServiceNo: statusData.request?.receiverServiceNo,
        itemReceiver: item?.receiverDetails?.serviceNo,
      });

      // Handle email notification
      const emailResult = await handleEmailNotification(
        statusData.request, // Pass the entire request object
        approvedItem
      );

      // Show appropriate messages
      if (emailResult.receiverFound) {
        if (emailResult.emailSent) {
          showToast(`✅ Approved! ${emailResult.message}`, "success");
        } else {
          showToast(`⚠️ Approved! ${emailResult.message}`, "warning");
        }
      } else {
        showToast(`❌ Approved! ${emailResult.message}`, "warning");
      }

      // Always show main approval success
      showToast(`✅ Gate Pass ${item.refNo} has been approved.`, "success");
    } catch (error) {
      console.error("Error approving status:", error.message);
      showToast(`❌ Approval Failed: ${error.message}`, "error");
    }
  };

  const handleReject = async (item) => {
    if (isSuperAdmin) {
      showToast("Super Admin has view-only access.", "warning");
      return;
    }

    try {
      if (!comment || comment.trim() === "") {
        showToast("Comment is required to reject the item.", "warning");
        return;
      }
      const updatedStatus = await rejectStatus(item.refNo, comment);

      const rejectedItem = {
        refNo: updatedStatus.referenceNumber,
        inLocation: updatedStatus.request?.inLocation,
        outLocation: updatedStatus.request?.outLocation,
        createdAt: new Date(updatedStatus.createdAt).toLocaleString(),
        items: updatedStatus.request?.items || [],
        comment: updatedStatus.comment || "",
        requestDetails: { ...updatedStatus.request },
      };

      setPendingItems(pendingItems.filter((i) => i.refNo !== item.refNo));
      setRejectedItems([...rejectedItems, rejectedItem]);

      setShowModal(false);
      setComment("");
      showToast("Rejected successfully", "success");

      // Send Rejection Email to Sender - FIXED VERSION
      try {
        // Use the sender details that are already available in the item object
        const senderDetails = item.senderDetails;

        if (senderDetails && senderDetails.email) {
          const emailSent = await sendRejectionEmailToSender(
            senderDetails,
            {
              outLocation: rejectedItem.outLocation,
              inLocation: rejectedItem.inLocation,
              items: rejectedItem.items,
            },
            rejectedItem.refNo,
            comment
          );

          if (emailSent) {
            showToast(
              "Rejection email sent to sender successfully.",
              "success"
            );
          } else {
            showToast(
              "Rejected but failed to send email notification.",
              "warning"
            );
          }
        } else {
          console.warn("Sender details or email not available:", senderDetails);
          showToast(
            "Rejected but sender email address not available.",
            "warning"
          );
        }
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
        showToast("Rejected but failed to send email notification.", "error");
      }
    } catch (error) {
      showToast("Error rejecting the item.", "error");
      console.error("Error rejecting status:", error.message);
    }
  };

  const sendReturnEmail = async (request, comment, itemDetails = []) => {
    try {
      if (!request.senderDetails?.email) {
        showToast("Sender email not available", "error");
        return;
      }

      const emailSubject = `Returnable Items Update: ${request.refNo}`;

      // Create items table for email
      const itemsTable =
        itemDetails.length > 0
          ? `
      <div style="margin: 20px 0;">
        <h3 style="color: #424242; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Returned Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Item Name</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Serial No</th>
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
                  item.itemName || "N/A"
                }</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                  item.serialNo || "N/A"
                }</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                  item.itemCategory || "N/A"
                }</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                  item.itemQuantity || "1"
                }</td>
              </tr>
            `
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
          <h2 style="color: #2fd33dff; margin-bottom: 5px;">Returnable Items Update</h2>
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

  const handleModelOpen = async (item) => {
  setSelectedItem(item);

  if (item.requestDetails?.transport.transporterServiceNo) {
    try {
      const transportResponse = await searchEmployeeByServiceNo(
        item.requestDetails.transport.transporterServiceNo
      );
      
      console.log("Transport response:", transportResponse); // Debug log
      
      // Extract the employee data from the nested response
      const employee = transportResponse?.data?.data?.[0];
      
      if (employee) {
        setTransportData({
          name: `${employee.employeeTitle || ""} ${employee.employeeFirstName || ""} ${employee.employeeSurname || ""}`.trim(),
          serviceNo: employee.employeeNo || item.requestDetails.transport.transporterServiceNo,
          designation: employee.designation || "-",
          section: employee.empSection || "-",
          group: employee.empGroup || "-",
          contactNo: employee.mobileNo || "-"
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

  // --- Enhanced Filtering ---
  // Hide Non-SLT requests in pending table for Petrol Leader 2 (PL2) users
  const isPL2 =
    user?.serviceNo === "PLE002" ||
    user?.role === "PL2" ||
    user?.username === "PLE002";

  const applyFilters = (items, excludeNonSlt = false) => {
    return items.filter((item) => {
      // PL2 specific filter (hide Non-SLT for PL2 in pending)
      if (excludeNonSlt && isPL2 && item.isNonSlt) return false;

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
        (companyTypeFilter === "slt" && !item.isNonSlt) ||
        (companyTypeFilter === "non-slt" && item.isNonSlt);

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

  const filteredPendingItems = applyFilters(pendingItems, true);
  const filteredApprovedItems = applyFilters(approvedItems);
  const filteredRejectedItems = applyFilters(rejectedItems);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome {user?.name || "Dispatch Officer"}
        </h1>
        <p className="text-gray-500 flex items-center">
          <FaInfoCircle className="mr-2 text-blue-500" />
          View gate pass requests for your assigned OUT locations:{" "}
          {user?.branches?.join(", ") || "No branches assigned"}
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              {pendingItems.length}
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
              {approvedItems.length}
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
              {rejectedItems.length}
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
            Gate Passes -{" "}
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
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
                  Date & Time
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(activeTab === "pending"
                ? filteredPendingItems
                : activeTab === "approved"
                ? filteredApprovedItems
                : filteredRejectedItems
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
                      {item.outLocation}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.inLocation}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {item.createdAt}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleModelOpen(item)}
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
          ? filteredPendingItems
          : activeTab === "approved"
          ? filteredApprovedItems
          : filteredRejectedItems
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
        sendReturnEmail={sendReturnEmail}
        sendReturnTOPetrolLeaderEmail={sendReturnTOPetrolLeaderEmail}
        setComment={setComment}
        showToast={showToast}
        transporterDetails={transportData}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
};

// --- Modal Component ---
const RequestDetailsModal = ({
  isOpen,
  onClose,
  request,
  activeTab,
  comment,
  setComment,
  handleApprove,
  handleReject,
  sendReturnEmail,
  sendReturnTOPetrolLeaderEmail,
  showToast,
  transporterDetails,
  isSuperAdmin,
}) => {
  const [currentTab, setCurrentTab] = useState("details");
  const tabOrder = ["details", "navigation"];
  const DispatchStatus = true;
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedItemImages, setSelectedItemImages] = useState([]);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !request) return null;

  const handleBulkReturn = async () => {
    if (isSuperAdmin) {
      showToast("Super Admin has view-only access.", "warning");
      return;
    }

    if (selectedItems.length === 0) {
      showToast("Please select at least one item to return", "warning");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to mark ${selectedItems.length} item(s) as 'return'?`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      console.log("Starting bulk return process...");
      console.log("Selected serial numbers:", selectedItems);
      console.log("Reference number:", request.refNo);

      // Get full details of selected items
      const selectedItemDetails = request.items.filter((item) =>
        selectedItems.includes(item.serialNo)
      );

      console.log("Selected item details:", selectedItemDetails);

      // Call backend to update DB
      const response = await markItemsAsReturned(request.refNo, selectedItems);

      console.log("Backend response:", response);

      // Now send the email notification WITH ITEM DETAILS
      await sendReturnEmail(
        request,
        "Items successfully returned by out petrol leader.",
        selectedItemDetails
      );
      await sendReturnTOPetrolLeaderEmail(
        request,
        "Items successfully returned by out petrol leader.",
        selectedItemDetails
      );
      // Show success message
      showToast(
        `Successfully marked ${
          response.updatedCount || selectedItems.length
        } item(s) as returned.`,
        "success"
      );

      console.log("Bulk return process completed successfully");

      // Clear selected items
      setSelectedItems([]);

      // Refresh / close modal
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Error marking items as returned:", error);
      console.error("Error details:", error.response?.data);

      showToast(
        error.message || "Failed to update items. Please try again.",
        "error"
      );
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
    setSelectedItemImages(item.itemPhotos || []); // Guard against null itemPhotos
    setSelectedItemName(item.itemName);
    setIsImageModalOpen(true);
  };

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

  const printReport = (request, transporterDetails) => {
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.top = "-9999px";
    document.body.appendChild(printFrame);

    const contentDocument = printFrame.contentDocument;

    // Helper to safely access deeply nested properties
    const safeAccess = (obj, path, defaultValue = "N/A") => {
      const parts = path.split(".");
      let current = obj;
      for (const part of parts) {
        current = current ? current[part] : undefined;
      }
      return current || defaultValue;
    };

    const statusDetails = request?.statusDetails || {};
    const isExecutiveCompleted =
      statusDetails.executiveOfficerStatus === 2 ||
      statusDetails.executiveOfficerStatus === 3;

    const isVerifyCompleted =
      statusDetails.verifyOfficerStatus === 2 ||
      statusDetails.verifyOfficerStatus === 3;

    const executiveSectionHtml = isExecutiveCompleted
      ? `
            <div class="section">
              <h2 class="section-title">Exerctive Officer Details</h2>
              <div class="grid">
                <div class="item"><span class="label">Name:</span> ${safeAccess(
                  request,
                  "executiveOfficerData.name"
                )}</div>
                <div class="item"><span class="label">Service No:</span> ${safeAccess(
                  request,
                  "executiveOfficerData.serviceNo"
                )}</div>
                <div class="item"><span class="label">Section:</span> ${safeAccess(
                  request,
                  "executiveOfficerData.section"
                )}</div>
                <div class="item"><span class="label">Group:</span> ${safeAccess(
                  request,
                  "executiveOfficerData.group"
                )}</div>
                <div class="item"><span class="label">Designation:</span> ${safeAccess(
                  request,
                  "executiveOfficerData.designation"
                )}</div>
                <div class="item"><span class="label">Contact:</span> ${safeAccess(
                  request,
                  "executiveOfficerData.contactNo"
                )}</div>
                <div class="itemComm"><span class="label">Exerctive Officer Comment:</span> ${safeAccess(
                  request.statusDetails,
                  "executiveOfficerComment"
                )}</div>
              </div>
            </div>
    `
      : "";

    const verifySectionHtml = isVerifyCompleted
      ? `
            <div class="section">
              <h2 class="section-title">Verify Officer Details</h2>
              <div class="grid">
                <div class="item"><span class="label">Name:</span> ${safeAccess(
                  request,
                  "verifyOfficerData.name"
                )}</div>
                <div class="item"><span class="label">Service No:</span> ${safeAccess(
                  request,
                  "verifyOfficerData.serviceNo"
                )}</div>
                <div class="item"><span class="label">Section:</span> ${safeAccess(
                  request,
                  "verifyOfficerData.section"
                )}</div>
                <div class="item"><span class="label">Group:</span> ${safeAccess(
                  request,
                  "verifyOfficerData.group"
                )}</div>
                <div class="item"><span class="label">Designation:</span> ${safeAccess(
                  request,
                  "verifyOfficerData.designation"
                )}</div>
                <div class="item"><span class="label">Contact:</span> ${safeAccess(
                  request,
                  "verifyOfficerData.contactNo"
                )}</div>
                <div class="item"><span class="label">Verify Officer Comment:</span> ${safeAccess(
                  request.statusDetails,
                  "verifyOfficerComment"
                )}</div>
              </div>
            </div>
    `
      : "";

    contentDocument.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>SLT Gate Pass - ${request.refNo}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
              .logo { max-height: 60px; margin-bottom: 10px; }
              .title { font-size: 24px; color: #003399; margin: 0; }
              .ref { font-size: 14px; color: #666; margin: 5px 0; }
              .date { font-size: 12px; color: #888; margin: 5px 0 15px; }
              .section { margin-bottom: 20px; }
              .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #eee; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
              .item { margin-bottom: 5px; }
              .itemComm{ margin-bottom: 40px; }
              .label { font-weight: bold; color: #555; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }
              @media print { body { margin: 0; padding: 15px; } }
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
                <div class="item"><span class="label">Name:</span> ${safeAccess(
                  request,
                  "senderDetails.name"
                )}</div>
                <div class="item"><span class="label">Service No:</span> ${safeAccess(
                  request,
                  "senderDetails.serviceNo"
                )}</div>
                <div class="item"><span class="label">Section:</span> ${safeAccess(
                  request,
                  "senderDetails.section"
                )}</div>
                <div class="item"><span class="label">Group:</span> ${safeAccess(
                  request,
                  "senderDetails.group"
                )}</div>
                <div class="item"><span class="label">Designation:</span> ${safeAccess(
                  request,
                  "senderDetails.designation"
                )}</div>
                <div class="item"><span class="label">Contact:</span> ${safeAccess(
                  request,
                  "senderDetails.contactNo"
                )}</div>
              </div>
            </div>
  
            <div class="section">
              <h2 class="section-title">Receiver Details</h2>
              <div class="grid">
                <div class="item"><span class="label">Name:</span> ${safeAccess(
                  request,
                  "receiverDetails.name"
                )}</div>
                <div class="item"><span class="label">Service No:</span> ${safeAccess(
                  request,
                  "receiverDetails.serviceNo"
                )}</div>
                <div class="item"><span class="label">Section:</span> ${safeAccess(
                  request,
                  "receiverDetails.section"
                )}</div>
                <div class="item"><span class="label">Group:</span> ${safeAccess(
                  request,
                  "receiverDetails.group"
                )}</div>
                <div class="item"><span class="label">Designation:</span> ${safeAccess(
                  request,
                  "receiverDetails.designation"
                )}</div>
                <div class="item"><span class="label">Contact:</span> ${safeAccess(
                  request,
                  "receiverDetails.contactNo"
                )}</div>
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
              <h2 class="section-title">Transport Details</h2>
              <div class="grid">
                <div class="item"><span class="label">Method:</span> ${safeAccess(
                  request,
                  "requestDetails.transport.transportMethod"
                )}</div>
                <div class="item"><span class="label">Type:</span> ${safeAccess(
                  request,
                  "requestDetails.transport.transporterType"
                )}</div>
                ${
                  safeAccess(
                    request?.requestDetails?.transport,
                    "transporterType"
                  ) === "SLT"
                    ? `
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
                ${
                  safeAccess(
                    request?.requestDetails?.transport,
                    "transportMethod"
                  ) === "Vehicle"
                    ? `
                <div class="item"><span class="label">Vehicle No:</span> ${safeAccess(
                  request?.requestDetails,
                  "vehicleNumber"
                )}</div>
                <div class="item"><span class="label">Vehicle Model:</span> ${safeAccess(
                  request?.requestDetails,
                  "vehicleModel"
                )}</div>
                `
                    : ""
                } 
                `
                    : `
                <div class="item"><span class="label">Transporter:</span> ${safeAccess(
                  request?.requestDetails?.transport,
                  "nonSLTTransporterName"
                )}</div>
                <div class="item"><span class="label">NIC:</span> ${safeAccess(
                  request?.requestDetails?.transport,
                  "nonSLTTransporterNIC"
                )}</div>
                <div class="item"><span class="label">Contact:</span> ${safeAccess(
                  request?.requestDetails?.transport,
                  "nonSLTTransporterPhone"
                )}</div>
                <div class="item"><span class="label">Email:</span> ${safeAccess(
                  request?.requestDetails?.transport,
                  "nonSLTTransporterEmail"
                )}</div>
                
                ${
                  safeAccess(
                    request?.requestDetails?.transport,
                    "transportMethod"
                  ) === "Vehicle"
                    ? `
                <div class="item"><span class="label">Vehicle No:</span> ${safeAccess(
                  request?.requestDetails,
                  "vehicleNumber"
                )}</div>
                <div class="item"><span class="label">Vehicle Model:</span> ${safeAccess(
                  request?.requestDetails,
                  "vehicleModel"
                )}</div>
                `
                    : ""
                }
                `
                }
              </div>
            </div>
  
           ${executiveSectionHtml}
          ${verifySectionHtml}
            
            <!-- Loading Details Section -->
            <div class="section">
              <h2 class="section-title">Loading Details</h2>
              <div class="grid">
                <div class="item"><span class="label">Loading Location:</span> ${safeAccess(
                  request?.requestDetails?.loading,
                  "loadingLocation"
                )}</div>
                <div class="item"><span class="label">Loading Time:</span> ${
                  safeAccess(request?.requestDetails?.loading, "loadingTime")
                    ? new Date(
                        safeAccess(
                          request?.requestDetails?.loading,
                          "loadingTime"
                        )
                      ).toLocaleString()
                    : "N/A"
                }</div>
                <div class="item"><span class="label">Staff Type:</span> ${safeAccess(
                  request?.requestDetails?.loading,
                  "staffType"
                )}</div>
                
                ${
                  safeAccess(request?.requestDetails?.loading, "staffType") ===
                  "SLT"
                    ? `
                  <div class="item"><span class="label">Staff Service No:</span> ${safeAccess(
                    request?.requestDetails?.loading,
                    "staffServiceNo"
                  )}</div>
                  <div class="item"><span class="label">Name:</span> ${safeAccess(
                    request,
                    "loadUserData.name"
                  )}</div>
                  <div class="item"><span class="label">Section:</span> ${safeAccess(
                    request,
                    "loadUserData.section"
                  )}</div>
                  <div class="item"><span class="label">Group:</span> ${safeAccess(
                    request,
                    "loadUserData.group"
                  )}</div>
                  <div class="item"><span class="label">Designation:</span> ${safeAccess(
                    request,
                    "loadUserData.designation"
                  )}</div>
                  <div class="item"><span class="label">Contact:</span> ${safeAccess(
                    request,
                    "loadUserData.contactNo"
                  )}</div>
                `
                    : `
                  <div class="item"><span class="label">Staff Name:</span> ${safeAccess(
                    request?.requestDetails?.loading,
                    "nonSLTStaffName"
                  )}</div>
                  <div class="item"><span class="label">Company:</span> ${safeAccess(
                    request?.requestDetails?.loading,
                    "nonSLTStaffCompany"
                  )}</div>
                  <div class="item"><span class="label">NIC:</span> ${safeAccess(
                    request?.requestDetails?.loading,
                    "nonSLTStaffNIC"
                  )}</div>
                  <div class="item"><span class="label">Contact:</span> ${safeAccess(
                    request?.requestDetails?.loading,
                    "nonSLTStaffContact"
                  )}</div>
                  <div class="item"><span class="label">Email:</span> ${safeAccess(
                    request?.requestDetails?.loading,
                    "nonSLTStaffEmail"
                  )}</div>
                `
                }
              </div>
            </div>
  
            <div class="section">
              <h2 class="section-title">Items</h2>
              <table>
                <thead>
                  <tr><th>Item Name</th><th>Serial No</th><th>Category</th><th>Model</th></tr>
                </thead>
                <tbody>
                  ${request.items
                    .map(
                      (item) => `
                    <tr>
                      <td>${item?.itemName || "-"}</td>
                      <td>${item?.serialNo || "-"}</td>
                      <td>${item?.itemCategory || "-"}</td>
                      <td>${item?.itemModel || "-"}</td>
                    </tr>
                  `
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

    printFrame.onload = function () {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    };
  };

  const generateItemDetailsPDF = (items, refNo) => {
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
    doc.text("SLT Gate Pass - Item Details", pageWidth / 2, 20, {
      align: "center",
    });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Reference: ${request.refNo}`, pageWidth / 2, 30, {
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
    doc.text("Item Details", margin, 45);

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

    items.forEach((item, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
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
        truncateText(item?.itemModel || "N/A", 15),
        margin + col1Width + col2Width + col3Width + col4Width + 3,
        yPos + 5.5
      );

      doc.line(
        margin,
        yPos + 8,
        margin + col1Width + col2Width + col3Width + col4Width + col5Width,
        yPos + 8
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
      { align: "center" }
    );

    doc.save(`SLT_GatePass_Items_${request.refNo}.pdf`);
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
          <div className="mt-2 text-white/80">Reference: {request.refNo}</div>
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
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center ${
              currentTab === "navigation"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setCurrentTab("navigation")}
          >
            <FaCheckCircle className="mr-2" /> Approval / Actions
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
                      {request.senderDetails?.serviceNo}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Name
                    </label>
                    <p className="text-gray-800">
                      {request.senderDetails?.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Section
                    </label>
                    <p className="text-gray-800">
                      {request.senderDetails?.section}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Group
                    </label>
                    <p className="text-gray-800">
                      {request.senderDetails?.group}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Designation
                    </label>
                    <p className="text-gray-800">
                      {request.senderDetails?.designation}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Contact
                    </label>
                    <p className="text-gray-800">
                      {request.senderDetails?.contactNo}
                    </p>
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
                        ?.filter(
                          (item) => item.status === "return to Petrol Leader"
                        )
                        .map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                disabled={isSuperAdmin}
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
                    disabled={
                      isSuperAdmin || selectedItems?.length === 0 || loading
                    }
                    className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                      isSuperAdmin || selectedItems?.length === 0
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
                        Out Location
                      </label>
                      <p className="text-gray-800">{request?.outLocation}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        In Location
                      </label>
                      <p className="text-gray-800">{request?.inLocation}</p>
                    </div>
                  </div>
                </div>

                {request.receiverDetails ? (
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
                          {request.receiverDetails?.name}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Group
                        </label>
                        <p className="text-gray-800">
                          {request.receiverDetails?.group}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Service No
                        </label>
                        <p className="text-gray-800">
                          {request.receiverDetails?.serviceNo}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Contact
                        </label>
                        <p className="text-gray-800">
                          {request.receiverDetails?.contactNo}
                        </p>
                      </div>
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

              {/* Transport Details Section */}
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
                          Vehicle Model
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
                        onClick={() => printReport(request, transporterDetails)}
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
                        <li>Items: {request.items.length}</li>
                        <li>From: {request.outLocation}</li>
                        <li>To: {request.inLocation}</li>
                      </ul>
                    </div>
                    {request?.requestDetails?.transport.transporterType && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          Transport Info
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          <li>
                            Method:{" "}
                            {request?.requestDetails?.transport
                              .transportMethod || "N/A"}
                          </li>
                          <li>
                            Type:{" "}
                            {request?.requestDetails?.transport
                              .transporterType || "N/A"}
                          </li>
                          {request?.requestDetails?.transport
                            .transporterType === "SLT" && (
                            <li>Name: {transporterDetails?.name || "N/A"}</li>
                          )}
                          {request?.requestDetails?.transport
                            .transporterType === "Non-SLT" && (
                            <li>
                              Name:{" "}
                              {request?.requestDetails?.transport
                                .nonSLTTransporterName || "N/A"}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    {request?.requestDetails?.loading?.staffType && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          Loading Info
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          <li>
                            Loader Type:{" "}
                            {request?.requestDetails?.loading?.staffType ||
                              "N/A"}
                          </li>
                          {request?.requestDetails?.loading?.staffType ===
                            "SLT" && (
                            <li>
                              Loader Name: {request.loadUserData?.name || "N/A"}
                            </li>
                          )}
                          {request?.requestDetails?.loading?.staffType ===
                            "Non-SLT" && (
                            <li>
                              Loader Name:{" "}
                              {request?.requestDetails?.loading
                                ?.nonSLTStaffName || "N/A"}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  {activeTab !== "pending" && request?.comment && (
                    <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-1">
                        Previous Comment ({activeTab})
                      </h4>
                      <p className="text-gray-600 text-sm">{request.comment}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Pleader comment (required for Reject) */}
        {currentTab === "navigation" && (
          <div className="space-y-6">
            {/* Approval Information */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                <FaCheckCircle className="mr-2" /> Approval Information
              </h3>
            </div>
            \
            {activeTab === "pending" && (
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Comment
                </label>
                <textarea
                  value={comment}
                  disabled={isSuperAdmin}
                  onChange={(e) => setComment(e.target.value)}
                  rows="3"
                  placeholder="Add your comments here..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex-shrink-0">
          <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
            <div className="flex flex-col md:flex-row gap-4">
              {currentTab === "details" && (
                <div className="flex items-center justify-between w-full ">
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

              {currentTab === "navigation" &&
                activeTab === "pending" &&
                !isSuperAdmin && (
                  <div className="md:w-full space-y-2">
                    <div className="flex justify-between mt-4">
                      <button
                        onClick={goToPreviousTab}
                        className="px-4 py-2 rounded-lg text-sm font-medium flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700"
                      >
                        <FaArrowLeft className="mr-2" /> Previous
                      </button>
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

              {currentTab === "navigation" && activeTab !== "pending" && (
                <div className="flex justify-end w-full">
                  <button
                    onClick={goToPreviousTab}
                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700"
                  >
                    <FaArrowLeft className="mr-2" /> Back to Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Image Viewer Modal ---
const ImageViewerModal = ({ images, isOpen, onClose, itemName }) => {
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

  if (!isOpen || imageUrls.length === 0) return null;

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
          <div className="h-80 md:h-96 overflow-hidden relative bg-black flex items-center justify-center">
            <img
              src={imageUrls[activeIndex]}
              alt={`${itemName} ${activeIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />

            {/* Navigation arrows */}
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
        <div className="p-4 flex justify-center gap-2 bg-gray-900 overflow-x-auto">
          {imageUrls.map((url, index) => (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer transition-all transform hover:scale-105 ${
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

export default Dispatch;
