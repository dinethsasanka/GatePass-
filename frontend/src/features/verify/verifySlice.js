import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPendingStatuses,
  getApprovedStatuses,
  getRejectedStatuses,
  searchUserByServiceNo,
} from "../../services/VerifyService";
import { getCachedUser, setCachedUser } from "../../utils/userCache";

const initialState = {
  verifyPending: [],
  verifyApproved: [],
  verifyRejected: [],
  isLoading: false,
  error: null,
  pagination: {
    pending: { skip: 0, hasMore: true, total: 0 },
    approved: { skip: 0, hasMore: true, total: 0 },
    rejected: { skip: 0, hasMore: true, total: 0 },
  }
};

// Helper to check if service number is Non-SLT
const isNonSltIdentifier = (serviceNo) => {
  if (!serviceNo) return false;
  if (serviceNo.startsWith("NSL")) return true;
  if (/^\d{4,6}$/.test(serviceNo)) return true;
  return false;
};

// Fetch Verify Pending (status=2)
export const fetchVerifyPending = createAsyncThunk(
  "verify/fetchPending",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getPendingStatuses(20, 0);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => {
          const senderServiceNo = status.request?.employeeServiceNo;
          const receiverServiceNo = status.request?.receiverServiceNo;
          const transportData = status.request?.transport;
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
                searchUserByServiceNo
              );
            } catch (error) {
              console.error("[VerifySlice] Failed to fetch sender:", senderServiceNo);
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
          if (receiverServiceNo && !isNonSltPlace && !isNonSltIdentifier(receiverServiceNo)) {
            try {
              const userData = await searchUserByServiceNo(receiverServiceNo);
              if (userData) receiverDetails = userData;
            } catch (error) {}
          } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
            receiverDetails = {
              name: status.request?.receiverName || "N/A",
              nic: status.request?.receiverNIC || receiverServiceNo,
              contactNo: status.request?.receiverContact || "N/A",
            };
          }

          return {
            refNo: status.referenceNumber,
            senderDetails,
            receiverDetails,
            transportData,
            inLocation: status.request?.inLocation,
            outLocation: status.request?.outLocation,
            createdAt: new Date(status.request?.createdAt || status.createdAt).toLocaleString(),
            items: status.request?.items || [],
            comment: status.comment,
            request: status.request,
            requestDetails: { ...status.request },
          };
        })
      );

      return {
        data: enrichedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch verify pending");
    }
  }
);

// Fetch Verify Approved
export const fetchVerifyApproved = createAsyncThunk(
  "verify/fetchApproved",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getApprovedStatuses(20, 0);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => {
          const senderServiceNo = status.request?.employeeServiceNo;
          const receiverServiceNo = status.request?.receiverServiceNo;
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
            };
            setCachedUser(loggedUser.serviceNo, senderDetails);
          } else if (senderServiceNo) {
            try {
              senderDetails = await getCachedUser(senderServiceNo, searchUserByServiceNo);
            } catch (error) {}
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
          if (receiverServiceNo && !isNonSltPlace && !isNonSltIdentifier(receiverServiceNo)) {
            try {
              receiverDetails = await getCachedUser(receiverServiceNo, searchUserByServiceNo);
            } catch (error) {}
          } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
            receiverDetails = {
              name: status.request?.receiverName || "N/A",
              nic: status.request?.receiverNIC || receiverServiceNo,
              contactNo: status.request?.receiverContact || "N/A",
            };
          }

          return {
            refNo: status.referenceNumber,
            senderDetails,
            receiverDetails,
            transportData: status.request?.transport,
            loadingDetails: status.request?.loading,
            inLocation: status.request?.inLocation,
            outLocation: status.request?.outLocation,
            createdAt: new Date(status.request?.createdAt || status.createdAt).toLocaleString(),
            items: status.request?.items || [],
            comment: status.verifyOfficerComment,
            request: status.request,
            requestDetails: { ...status.request },
          };
        })
      );

      return {
        data: enrichedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch verify approved");
    }
  }
);

// Fetch Verify Rejected
export const fetchVerifyRejected = createAsyncThunk(
  "verify/fetchRejected",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRejectedStatuses(20, 0);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => {
          const senderServiceNo = status.request?.employeeServiceNo;
          const receiverServiceNo = status.request?.receiverServiceNo;
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
            };
            setCachedUser(loggedUser.serviceNo, senderDetails);
          } else if (senderServiceNo) {
            try {
              senderDetails = await getCachedUser(senderServiceNo, searchUserByServiceNo);
            } catch (error) {}
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
          if (receiverServiceNo && !isNonSltPlace && !isNonSltIdentifier(receiverServiceNo)) {
            try {
              receiverDetails = await getCachedUser(receiverServiceNo, searchUserByServiceNo);
            } catch (error) {}
          } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
            receiverDetails = {
              name: status.request?.receiverName || "N/A",
              nic: status.request?.receiverNIC || receiverServiceNo,
              contactNo: status.request?.receiverContact || "N/A",
            };
          }

          return {
            refNo: status.referenceNumber,
            senderDetails,
            receiverDetails,
            transportData: status.request?.transport,
            loadingDetails: status.request?.loading,
            inLocation: status.request?.inLocation,
            outLocation: status.request?.outLocation,
            createdAt: new Date(status.request?.createdAt || status.createdAt).toLocaleString(),
            items: status.request?.items || [],
            comment: status.verifyOfficerComment,
            request: status.request,
            requestDetails: { ...status.request },
            statusDetails: status,
            rejectedBy: status.rejectedBy,
            rejectedByServiceNo: status.rejectedByServiceNo,
            rejectedByBranch: status.rejectedByBranch,
            rejectedAt: status.rejectedAt,
            rejectionLevel: status.rejectionLevel,
          };
        })
      );

      return {
        data: enrichedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch verify rejected");
    }
  }
);

// Load More Thunks
export const fetchMoreVerifyPending = createAsyncThunk(
  "verify/fetchMorePending",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { verify } = getState();
      const skip = verify.pagination.pending.skip;
      const response = await getPendingStatuses(20, skip);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => {
          const senderServiceNo = status.request?.employeeServiceNo;
          const receiverServiceNo = status.request?.receiverServiceNo;
          const transportData = status.request?.transport;
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
                searchUserByServiceNo
              );
            } catch (error) {
              console.error("[VerifySlice] Failed to fetch sender:", senderServiceNo);
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
          if (receiverServiceNo && !isNonSltPlace && !isNonSltIdentifier(receiverServiceNo)) {
            try {
              const userData = await searchUserByServiceNo(receiverServiceNo);
              if (userData) receiverDetails = userData;
            } catch (error) {}
          } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
            receiverDetails = {
              name: status.request?.receiverName || "N/A",
              nic: status.request?.receiverNIC || receiverServiceNo,
              contactNo: status.request?.receiverContact || "N/A",
            };
          }

          return {
            refNo: status.referenceNumber,
            senderDetails,
            receiverDetails,
            transportData,
            inLocation: status.request?.inLocation,
            outLocation: status.request?.outLocation,
            createdAt: new Date(status.request?.createdAt || status.createdAt).toLocaleString(),
            items: status.request?.items || [],
            comment: status.comment,
            request: status.request,
            requestDetails: { ...status.request },
          };
        })
      );

      return {
        data: enrichedData,
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch more verify pending");
    }
  }
);

export const fetchMoreVerifyApproved = createAsyncThunk(
  "verify/fetchMoreApproved",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { verify } = getState();
      const skip = verify.pagination.approved.skip;
      const response = await getApprovedStatuses(20, skip);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => {
          const senderServiceNo = status.request?.employeeServiceNo;
          const receiverServiceNo = status.request?.receiverServiceNo;
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
            };
            setCachedUser(loggedUser.serviceNo, senderDetails);
          } else if (senderServiceNo) {
            try {
              senderDetails = await getCachedUser(senderServiceNo, searchUserByServiceNo);
            } catch (error) {}
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
          if (receiverServiceNo && !isNonSltPlace && !isNonSltIdentifier(receiverServiceNo)) {
            try {
              receiverDetails = await getCachedUser(receiverServiceNo, searchUserByServiceNo);
            } catch (error) {}
          } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
            receiverDetails = {
              name: status.request?.receiverName || "N/A",
              nic: status.request?.receiverNIC || receiverServiceNo,
              contactNo: status.request?.receiverContact || "N/A",
            };
          }

          return {
            refNo: status.referenceNumber,
            senderDetails,
            receiverDetails,
            transportData: status.request?.transport,
            loadingDetails: status.request?.loading,
            inLocation: status.request?.inLocation,
            outLocation: status.request?.outLocation,
            createdAt: new Date(status.request?.createdAt || status.createdAt).toLocaleString(),
            items: status.request?.items || [],
            comment: status.verifyOfficerComment,
            request: status.request,
            requestDetails: { ...status.request },
          };
        })
      );

      return {
        data: enrichedData,
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch more verify approved");
    }
  }
);

export const fetchMoreVerifyRejected = createAsyncThunk(
  "verify/fetchMoreRejected",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { verify } = getState();
      const skip = verify.pagination.rejected.skip;
      const response = await getRejectedStatuses(20, skip);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => {
          const senderServiceNo = status.request?.employeeServiceNo;
          const receiverServiceNo = status.request?.receiverServiceNo;
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
            };
            setCachedUser(loggedUser.serviceNo, senderDetails);
          } else if (senderServiceNo) {
            try {
              senderDetails = await getCachedUser(senderServiceNo, searchUserByServiceNo);
            } catch (error) {}
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
          if (receiverServiceNo && !isNonSltPlace && !isNonSltIdentifier(receiverServiceNo)) {
            try {
              receiverDetails = await getCachedUser(receiverServiceNo, searchUserByServiceNo);
            } catch (error) {}
          } else if (isNonSltPlace || isNonSltIdentifier(receiverServiceNo)) {
            receiverDetails = {
              name: status.request?.receiverName || "N/A",
              nic: status.request?.receiverNIC || receiverServiceNo,
              contactNo: status.request?.receiverContact || "N/A",
            };
          }

          return {
            refNo: status.referenceNumber,
            senderDetails,
            receiverDetails,
            transportData: status.request?.transport,
            loadingDetails: status.request?.loading,
            inLocation: status.request?.inLocation,
            outLocation: status.request?.outLocation,
            createdAt: new Date(status.request?.createdAt || status.createdAt).toLocaleString(),
            items: status.request?.items || [],
            comment: status.verifyOfficerComment,
            request: status.request,
            requestDetails: { ...status.request },
            statusDetails: status,
            rejectedBy: status.rejectedBy,
            rejectedByServiceNo: status.rejectedByServiceNo,
            rejectedByBranch: status.rejectedByBranch,
            rejectedAt: status.rejectedAt,
            rejectionLevel: status.rejectionLevel,
          };
        })
      );

      return {
        data: enrichedData,
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch more verify rejected");
    }
  }
);

const verifySlice = createSlice({
  name: "verify",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Pending
      .addCase(fetchVerifyPending.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVerifyPending.fulfilled, (state, action) => {
        state.isLoading = false;
        state.verifyPending = action.payload.data;
        state.pagination.pending = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchVerifyPending.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Approved
      .addCase(fetchVerifyApproved.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVerifyApproved.fulfilled, (state, action) => {
        state.isLoading = false;
        state.verifyApproved = action.payload.data;
        state.pagination.approved = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchVerifyApproved.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Rejected
      .addCase(fetchVerifyRejected.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVerifyRejected.fulfilled, (state, action) => {
        state.isLoading = false;
        state.verifyRejected = action.payload.data;
        state.pagination.rejected = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchVerifyRejected.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Pending
      .addCase(fetchMoreVerifyPending.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreVerifyPending.fulfilled, (state, action) => {
        state.isLoading = false;
        state.verifyPending = [...state.verifyPending, ...action.payload.data];
        state.pagination.pending = {
          skip: state.verifyPending.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchMoreVerifyPending.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Approved
      .addCase(fetchMoreVerifyApproved.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreVerifyApproved.fulfilled, (state, action) => {
        state.isLoading = false;
        state.verifyApproved = [...state.verifyApproved, ...action.payload.data];
        state.pagination.approved = {
          skip: state.verifyApproved.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchMoreVerifyApproved.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Rejected
      .addCase(fetchMoreVerifyRejected.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreVerifyRejected.fulfilled, (state, action) => {
        state.isLoading = false;
        state.verifyRejected = [...state.verifyRejected, ...action.payload.data];
        state.pagination.rejected = {
          skip: state.verifyRejected.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchMoreVerifyRejected.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Selectors
export const selectVerifyPending = (state) => state.verify.verifyPending;
export const selectVerifyApproved = (state) => state.verify.verifyApproved;
export const selectVerifyRejected = (state) => state.verify.verifyRejected;
export const selectVerifyLoading = (state) => state.verify.isLoading;
export const selectVerifyError = (state) => state.verify.error;

export default verifySlice.reducer;
