import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPendingStatuses,
  getApprovedStatuses,
  getRejectedStatuses,
  searchUserByServiceNo,
} from "../../services/ApproveService";
import { getCachedUser, setCachedUser } from "../../utils/userCache";

const initialState = {
  executivePending: [],
  executiveApproved: [],
  executiveRejected: [],
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

// Enrich helper
const enrichStatus = async (status, loggedUser) => {
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
      console.error("[ExecutiveSlice] Failed to fetch sender:", senderServiceNo);
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
    transportData,
    inLocation: status.request?.inLocation,
    outLocation: status.request?.outLocation,
    createdAt: new Date(status.request?.createdAt || status.createdAt).toLocaleString(),
    items: status.request?.items || [],
    comment: status.executiveOfficerComment || "",
    request: status.request,
    requestDetails: { ...status.request },
    statusDetails: status,
    rejectedBy: status.rejectedBy,
    rejectedByServiceNo: status.rejectedByServiceNo,
    rejectedByBranch: status.rejectedByBranch,
    rejectedAt: status.rejectedAt,
    rejectionLevel: status.rejectionLevel,
  };
};

// Fetch Executive Pending
export const fetchExecutivePending = createAsyncThunk(
  "executive/fetchPending",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getPendingStatuses(null, 20, 0);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status, loggedUser))
      );

      return {
        data: enrichedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch executive pending");
    }
  }
);

// Fetch Executive Approved
export const fetchExecutiveApproved = createAsyncThunk(
  "executive/fetchApproved",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getApprovedStatuses(20, 0);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status, loggedUser))
      );

      return {
        data: enrichedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch executive approved");
    }
  }
);

// Fetch Executive Rejected
export const fetchExecutiveRejected = createAsyncThunk(
  "executive/fetchRejected",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRejectedStatuses(20, 0);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status, loggedUser))
      );

      return {
        data: enrichedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch executive rejected");
    }
  }
);

// Load More Thunks
export const fetchMoreExecutivePending = createAsyncThunk(
  "executive/fetchMorePending",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { executive } = getState();
      const skip = executive.pagination.pending.skip;
      const response = await getPendingStatuses(null, 20, skip);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status, loggedUser))
      );

      return {
        data: enrichedData,
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch more executive pending");
    }
  }
);

export const fetchMoreExecutiveApproved = createAsyncThunk(
  "executive/fetchMoreApproved",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { executive } = getState();
      const skip = executive.pagination.approved.skip;
      const response = await getApprovedStatuses(20, skip);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status, loggedUser))
      );

      return {
        data: enrichedData,
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch more executive approved");
    }
  }
);

export const fetchMoreExecutiveRejected = createAsyncThunk(
  "executive/fetchMoreRejected",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { executive } = getState();
      const skip = executive.pagination.rejected.skip;
      const response = await getRejectedStatuses(20, skip);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status, loggedUser))
      );

      return {
        data: enrichedData,
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch more executive rejected");
    }
  }
);

const executiveSlice = createSlice({
  name: "executive",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Pending
      .addCase(fetchExecutivePending.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExecutivePending.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executivePending = action.payload.data;
        state.pagination.pending = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchExecutivePending.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Approved
      .addCase(fetchExecutiveApproved.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExecutiveApproved.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executiveApproved = action.payload.data;
        state.pagination.approved = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchExecutiveApproved.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Rejected
      .addCase(fetchExecutiveRejected.pending, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchExecutiveRejected.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executiveRejected = action.payload.data;
        state.pagination.rejected = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchExecutiveRejected.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Pending
      .addCase(fetchMoreExecutivePending.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreExecutivePending.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executivePending = [...state.executivePending, ...action.payload.data];
        state.pagination.pending = {
          skip: state.executivePending.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchMoreExecutivePending.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Approved
      .addCase(fetchMoreExecutiveApproved.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreExecutiveApproved.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executiveApproved = [...state.executiveApproved, ...action.payload.data];
        state.pagination.approved = {
          skip: state.executiveApproved.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchMoreExecutiveApproved.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Rejected
      .addCase(fetchMoreExecutiveRejected.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreExecutiveRejected.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executiveRejected = [...state.executiveRejected, ...action.payload.data];
        state.pagination.rejected = {
          skip: state.executiveRejected.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total
        };
      })
      .addCase(fetchMoreExecutiveRejected.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Selectors
export const selectExecutivePending = (state) => state.executive.executivePending;
export const selectExecutiveApproved = (state) => state.executive.executiveApproved;
export const selectExecutiveRejected = (state) => state.executive.executiveRejected;
export const selectExecutiveLoading = (state) => state.executive.isLoading;
export const selectExecutiveError = (state) => state.executive.error;

export default executiveSlice.reducer;
