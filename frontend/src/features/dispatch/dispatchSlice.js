import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPendingStatuses,
  getApprovedStatuses,
  getRejectedStatuses,
  searchUserByServiceNo,
} from "../../services/DispatchService";
import { getCachedUser, setCachedUser } from "../../utils/userCache";

const initialState = {
  dispatchPending: [],
  dispatchApproved: [],
  dispatchRejected: [],
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
  return false;
};

// Enrich helper
const enrichStatus = async (status) => {
  const senderServiceNo = status.request?.employeeServiceNo;
  const receiverServiceNo = status.request?.receiverServiceNo;
  const loadingDetails = status.request?.loading;
  const isNonSltPlace = status.request?.isNonSltPlace;
  let senderDetails = null;
  let receiverDetails = null;
  let loadUserData = null;
  let executiveOfficerData = null;
  let verifyOfficerData = null;

  if (senderServiceNo) {
    try {
      senderDetails = await getCachedUser(
        senderServiceNo,
        searchUserByServiceNo,
      );
    } catch (error) {}
  }

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

  if (loadingDetails?.staffType === "SLT" && loadingDetails.staffServiceNo) {
    try {
      loadUserData = await getCachedUser(
        loadingDetails.staffServiceNo,
        searchUserByServiceNo,
      );
    } catch (error) {}
  }

  if (status.executiveOfficerServiceNo) {
    try {
      executiveOfficerData = await getCachedUser(
        status.executiveOfficerServiceNo,
        searchUserByServiceNo,
      );
    } catch (error) {}
  }

  const vo = status.verifyOfficerServiceNumber || status.verifyOfficerServiceNo;
  if (vo) {
    try {
      verifyOfficerData = await getCachedUser(vo, searchUserByServiceNo);
    } catch (error) {}
  }

  return {
    refNo: status.referenceNumber,
    senderDetails,
    receiverDetails,
    transportData: status.request?.transport,
    loadingDetails,
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
    loadUserData,
    statusDetails: status,
    executiveOfficerData,
    verifyOfficerData,
    isNonSlt: status.request?.isNonSltPlace || false,
  };
};

// Fetch Dispatch Pending
export const fetchDispatchPending = createAsyncThunk(
  "dispatch/fetchPending",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getPendingStatuses(20, 0);
      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status)),
      );

      return {
        data: enrichedData,
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch dispatch pending",
      );
    }
  },
);

// Fetch Dispatch Approved
export const fetchDispatchApproved = createAsyncThunk(
  "dispatch/fetchApproved",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getApprovedStatuses(20, 0);
      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status)),
      );

      return {
        data: enrichedData,
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch dispatch approved",
      );
    }
  },
);

// Fetch Dispatch Rejected
export const fetchDispatchRejected = createAsyncThunk(
  "dispatch/fetchRejected",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRejectedStatuses(20, 0);
      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status)),
      );

      return {
        data: enrichedData,
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch dispatch rejected",
      );
    }
  },
);

// Load More Thunks
export const fetchMoreDispatchPending = createAsyncThunk(
  "dispatch/fetchMorePending",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { dispatch } = getState();
      const skip = dispatch.pagination.pending.skip;
      const response = await getPendingStatuses(20, skip);
      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status)),
      );

      return {
        data: enrichedData,
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch more dispatch pending",
      );
    }
  },
);

export const fetchMoreDispatchApproved = createAsyncThunk(
  "dispatch/fetchMoreApproved",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { dispatch } = getState();
      const skip = dispatch.pagination.approved.skip;
      const response = await getApprovedStatuses(20, skip);
      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status)),
      );

      return {
        data: enrichedData,
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch more dispatch approved",
      );
    }
  },
);

export const fetchMoreDispatchRejected = createAsyncThunk(
  "dispatch/fetchMoreRejected",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { dispatch } = getState();
      const skip = dispatch.pagination.rejected.skip;
      const response = await getRejectedStatuses(20, skip);
      const enrichedData = await Promise.all(
        (response.data || []).map(async (status) => enrichStatus(status)),
      );

      return {
        data: enrichedData,
        pagination: response.pagination,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch more dispatch rejected",
      );
    }
  },
);

const dispatchSlice = createSlice({
  name: "dispatch",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Pending
      .addCase(fetchDispatchPending.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDispatchPending.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dispatchPending = action.payload.data;
        state.pagination.pending = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchDispatchPending.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Approved
      .addCase(fetchDispatchApproved.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDispatchApproved.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dispatchApproved = action.payload.data;
        state.pagination.approved = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchDispatchApproved.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Rejected
      .addCase(fetchDispatchRejected.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDispatchRejected.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dispatchRejected = action.payload.data;
        state.pagination.rejected = {
          skip: action.payload.data.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchDispatchRejected.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Pending
      .addCase(fetchMoreDispatchPending.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreDispatchPending.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dispatchPending = [
          ...state.dispatchPending,
          ...action.payload.data,
        ];
        state.pagination.pending = {
          skip: state.dispatchPending.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchMoreDispatchPending.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Approved
      .addCase(fetchMoreDispatchApproved.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreDispatchApproved.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dispatchApproved = [
          ...state.dispatchApproved,
          ...action.payload.data,
        ];
        state.pagination.approved = {
          skip: state.dispatchApproved.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchMoreDispatchApproved.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch More Rejected
      .addCase(fetchMoreDispatchRejected.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreDispatchRejected.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dispatchRejected = [
          ...state.dispatchRejected,
          ...action.payload.data,
        ];
        state.pagination.rejected = {
          skip: state.dispatchRejected.length,
          hasMore: action.payload.pagination.hasMore,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchMoreDispatchRejected.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Selectors
export const selectDispatchPending = (state) => state.dispatch.dispatchPending;
export const selectDispatchApproved = (state) =>
  state.dispatch.dispatchApproved;
export const selectDispatchRejected = (state) =>
  state.dispatch.dispatchRejected;
export const selectDispatchLoading = (state) => state.dispatch.isLoading;
export const selectDispatchError = (state) => state.dispatch.error;

export default dispatchSlice.reducer;
