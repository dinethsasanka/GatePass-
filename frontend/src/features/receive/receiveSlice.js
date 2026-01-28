import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPendingStatuses,
  getApprovedStatuses,
  getRejectedStatuses,
  searchUserByServiceNo,
} from "../../services/receiveService";
import { getCachedUser, setCachedUser } from "../../utils/userCache";

const initialState = {
  receivePending: [],
  receiveApproved: [],
  receiveRejected: [],
  isLoading: false,
  error: null,
  pagination: {
    pending: { skip: 0, hasMore: true, total: 0 },
    approved: { skip: 0, hasMore: true, total: 0 },
    rejected: { skip: 0, hasMore: true, total: 0 },
  },
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
        searchUserByServiceNo,
      );
    } catch (error) {
      console.error("[ReceiveSlice] Failed to fetch sender:", senderServiceNo);
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
      receiverDetails = await getCachedUser(
        receiverServiceNo,
        searchUserByServiceNo,
      );
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
    loadingDetails: status.request?.loading,
    unloadingDetails: status.request?.unloading,
    inLocation: status.request?.inLocation,
    outLocation: status.request?.outLocation,
    createdAt: new Date(
      status.request?.createdAt || status.createdAt,
    ).toLocaleString(),
    items: status.request?.items || [],
    comment: status.comment,
    request: status.request,
    requestDetails: { ...status.request },
    rejectedBy: status.rejectedBy,
    rejectedByServiceNo: status.rejectedByServiceNo,
    rejectedByBranch: status.rejectedByBranch,
    rejectedAt: status.rejectedAt,
    rejectionLevel: status.rejectionLevel,
  };
};

// Fetch Receive Pending
export const fetchReceivePending = createAsyncThunk(
  "receive/fetchPending",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getPendingStatuses(null, 20, 0);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) =>
          enrichStatus(status, loggedUser),
        ),
      );

      return {
        data: enrichedData.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        ),
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch receive pending",
      );
    }
  },
);

// Fetch Receive Approved
export const fetchReceiveApproved = createAsyncThunk(
  "receive/fetchApproved",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getApprovedStatuses(null, 20, 0);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) =>
          enrichStatus(status, loggedUser),
        ),
      );

      return {
        data: enrichedData.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        ),
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch receive approved",
      );
    }
  },
);

// Fetch Receive Rejected
export const fetchReceiveRejected = createAsyncThunk(
  "receive/fetchRejected",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRejectedStatuses(null, 20, 0);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) =>
          enrichStatus(status, loggedUser),
        ),
      );

      return {
        data: enrichedData.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        ),
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch receive rejected",
      );
    }
  },
);

// Load More Thunks
export const fetchMoreReceivePending = createAsyncThunk(
  "receive/fetchMorePending",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { receive } = getState();
      const skip = receive.pagination.pending.skip;
      const response = await getPendingStatuses(null, 20, skip);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) =>
          enrichStatus(status, loggedUser),
        ),
      );

      return {
        data: enrichedData,
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch more receive pending",
      );
    }
  },
);

export const fetchMoreReceiveApproved = createAsyncThunk(
  "receive/fetchMoreApproved",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { receive } = getState();
      const skip = receive.pagination.approved.skip;
      const response = await getApprovedStatuses(null, 20, skip);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) =>
          enrichStatus(status, loggedUser),
        ),
      );

      return {
        data: enrichedData,
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch more receive approved",
      );
    }
  },
);

export const fetchMoreReceiveRejected = createAsyncThunk(
  "receive/fetchMoreRejected",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { receive } = getState();
      const skip = receive.pagination.rejected.skip;
      const response = await getRejectedStatuses(null, 20, skip);
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) =>
          enrichStatus(status, loggedUser),
        ),
      );

      return {
        data: enrichedData,
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch more receive rejected",
      );
    }
  },
);

const receiveSlice = createSlice({
  name: "receive",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Pending
      .addCase(fetchReceivePending.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReceivePending.fulfilled, (state, action) => {
        state.isLoading = false;
        state.receivePending = action.payload.data;
        state.pagination.pending = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchReceivePending.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Approved
      .addCase(fetchReceiveApproved.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReceiveApproved.fulfilled, (state, action) => {
        state.isLoading = false;
        state.receiveApproved = action.payload.data;
        state.pagination.approved = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchReceiveApproved.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Rejected
      .addCase(fetchReceiveRejected.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReceiveRejected.fulfilled, (state, action) => {
        state.isLoading = false;
        state.receiveRejected = action.payload.data;
        state.pagination.rejected = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchReceiveRejected.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Pending
      .addCase(fetchMoreReceivePending.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreReceivePending.fulfilled, (state, action) => {
        state.isLoading = false;
        state.receivePending = [
          ...state.receivePending,
          ...action.payload.data,
        ];
        state.pagination.pending = {
          skip: state.receivePending.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchMoreReceivePending.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Approved
      .addCase(fetchMoreReceiveApproved.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreReceiveApproved.fulfilled, (state, action) => {
        state.isLoading = false;
        state.receiveApproved = [
          ...state.receiveApproved,
          ...action.payload.data,
        ];
        state.pagination.approved = {
          skip: state.receiveApproved.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchMoreReceiveApproved.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Rejected
      .addCase(fetchMoreReceiveRejected.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreReceiveRejected.fulfilled, (state, action) => {
        state.isLoading = false;
        state.receiveRejected = [
          ...state.receiveRejected,
          ...action.payload.data,
        ];
        state.pagination.rejected = {
          skip: state.receiveRejected.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchMoreReceiveRejected.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Selectors
export const selectReceivePending = (state) => state.receive.receivePending;
export const selectReceiveApproved = (state) => state.receive.receiveApproved;
export const selectReceiveRejected = (state) => state.receive.receiveRejected;
export const selectReceiveLoading = (state) => state.receive.isLoading;
export const selectReceiveError = (state) => state.receive.error;

export default receiveSlice.reducer;
