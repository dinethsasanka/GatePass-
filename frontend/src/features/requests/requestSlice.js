import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getGatePassRequest,
  createGatePassRequest,
  cancelRequest,
} from "../../services/requestService";
import {
  getPendingStatuses,
  getApprovedStatuses,
  getRejectedStatuses,
} from "../../services/approveService";

const initialState = {
  // All requests
  allRequests: [],
  // Pending requests (for Executive Approval)
  pendingRequests: [],
  approvedRequests: [],
  rejectedRequests: [],
  // My requests (user's own requests)
  myRequests: [],
  // Current selected request
  currentRequest: null,
  // Loading states
  isLoading: false,
  isCreating: false,
  isDeleting: false,
  // Error states
  error: null,
  createError: null,
  deleteError: null,
  // Filters
  filters: {
    searchTerm: "",
    locationFilter: "",
    companyTypeFilter: "all",
    dateFrom: "",
    dateTo: "",
  },
  // Pagination
  currentPage: 1,
  totalPages: 1,
  totalRequests: 0,
};

// Async thunks
export const fetchAllRequests = createAsyncThunk(
  "requests/fetchAll",
  async (serviceNo, { rejectWithValue }) => {
    try {
      const response = await getGatePassRequest(serviceNo);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch requests");
    }
  }
);

export const fetchPendingRequests = createAsyncThunk(
  "requests/fetchPending",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getPendingStatuses();
      return response;
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch pending requests"
      );
    }
  }
);

export const fetchApprovedRequests = createAsyncThunk(
  "requests/fetchApproved",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getApprovedStatuses();
      return response;
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch approved requests"
      );
    }
  }
);

export const fetchRejectedRequests = createAsyncThunk(
  "requests/fetchRejected",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRejectedStatuses();
      return response;
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch rejected requests"
      );
    }
  }
);

export const createNewRequest = createAsyncThunk(
  "requests/create",
  async (requestData, { rejectWithValue }) => {
    try {
      const response = await createGatePassRequest(requestData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create request");
    }
  }
);

export const removeRequest = createAsyncThunk(
  "requests/delete",
  async (referenceNumber, { rejectWithValue }) => {
    try {
      await cancelRequest(referenceNumber);
      return referenceNumber;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to cancel request");
    }
  }
);

const requestSlice = createSlice({
  name: "requests",
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        searchTerm: "",
        locationFilter: "",
        companyTypeFilter: "all",
        dateFrom: "",
        dateTo: "",
      };
    },
    setCurrentRequest: (state, action) => {
      state.currentRequest = action.payload;
    },
    clearCurrentRequest: (state) => {
      state.currentRequest = null;
    },
    clearError: (state) => {
      state.error = null;
      state.createError = null;
      state.deleteError = null;
    },
    // Real-time update handlers
    addNewRequest: (state, action) => {
      state.pendingRequests.unshift(action.payload);
      state.allRequests.unshift(action.payload);
    },
    updateRequestStatus: (state, action) => {
      const { requestId, newStatus } = action.payload;
      // Update in all requests
      const allIndex = state.allRequests.findIndex(
        (req) => req.id === requestId
      );
      if (allIndex !== -1) {
        state.allRequests[allIndex].status = newStatus;
      }
      // Move between pending/approved/rejected arrays
      state.pendingRequests = state.pendingRequests.filter(
        (req) => req.id !== requestId
      );
      state.approvedRequests = state.approvedRequests.filter(
        (req) => req.id !== requestId
      );
      state.rejectedRequests = state.rejectedRequests.filter(
        (req) => req.id !== requestId
      );
    },
    updateRequest: (state, action) => {
      const updatedRequest = action.payload;
      // Update in all arrays
      const updateInArray = (array) => {
        const index = array.findIndex((req) => req.id === updatedRequest.id);
        if (index !== -1) {
          array[index] = { ...array[index], ...updatedRequest };
        }
      };
      updateInArray(state.allRequests);
      updateInArray(state.pendingRequests);
      updateInArray(state.approvedRequests);
      updateInArray(state.rejectedRequests);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all requests
      .addCase(fetchAllRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allRequests = action.payload;
      })
      .addCase(fetchAllRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch pending requests
      .addCase(fetchPendingRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPendingRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingRequests = action.payload;
      })
      .addCase(fetchPendingRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch approved requests
      .addCase(fetchApprovedRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchApprovedRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.approvedRequests = action.payload;
      })
      .addCase(fetchApprovedRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch rejected requests
      .addCase(fetchRejectedRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRejectedRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rejectedRequests = action.payload;
      })
      .addCase(fetchRejectedRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create request
      .addCase(createNewRequest.pending, (state) => {
        state.isCreating = true;
        state.createError = null;
      })
      .addCase(createNewRequest.fulfilled, (state, action) => {
        state.isCreating = false;
        state.allRequests.unshift(action.payload);
        state.pendingRequests.unshift(action.payload);
      })
      .addCase(createNewRequest.rejected, (state, action) => {
        state.isCreating = false;
        state.createError = action.payload;
      })
      // Delete request
      .addCase(removeRequest.pending, (state) => {
        state.isDeleting = true;
        state.deleteError = null;
      })
      .addCase(removeRequest.fulfilled, (state, action) => {
        state.isDeleting = false;
        const requestId = action.payload;
        state.allRequests = state.allRequests.filter(
          (req) => req.id !== requestId
        );
        state.pendingRequests = state.pendingRequests.filter(
          (req) => req.id !== requestId
        );
        state.approvedRequests = state.approvedRequests.filter(
          (req) => req.id !== requestId
        );
        state.rejectedRequests = state.rejectedRequests.filter(
          (req) => req.id !== requestId
        );
      })
      .addCase(removeRequest.rejected, (state, action) => {
        state.isDeleting = false;
        state.deleteError = action.payload;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setCurrentRequest,
  clearCurrentRequest,
  clearError,
  addNewRequest,
  updateRequestStatus,
  updateRequest,
} = requestSlice.actions;

// Selectors
export const selectAllRequests = (state) => state.requests.allRequests;
export const selectPendingRequests = (state) => state.requests.pendingRequests;
export const selectApprovedRequests = (state) =>
  state.requests.approvedRequests;
export const selectRejectedRequests = (state) =>
  state.requests.rejectedRequests;
export const selectCurrentRequest = (state) => state.requests.currentRequest;
export const selectRequestsLoading = (state) => state.requests.isLoading;
export const selectRequestsError = (state) => state.requests.error;
export const selectFilters = (state) => state.requests.filters;

// Filtered selectors with memoization
export const selectFilteredPendingRequests = (state) => {
  const requests = state.requests.pendingRequests;
  const filters = state.requests.filters;

  return requests.filter((item) => {
    const matchesSearch =
      !filters.searchTerm ||
      item.refNo?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      item.senderDetails?.name
        ?.toLowerCase()
        .includes(filters.searchTerm.toLowerCase());

    const matchesLocation =
      !filters.locationFilter ||
      item.inLocation
        ?.toLowerCase()
        .includes(filters.locationFilter.toLowerCase()) ||
      item.outLocation
        ?.toLowerCase()
        .includes(filters.locationFilter.toLowerCase());

    const matchesCompanyType =
      filters.companyTypeFilter === "all" ||
      (filters.companyTypeFilter === "slt" && !item.request?.isNonSltPlace) ||
      (filters.companyTypeFilter === "non-slt" && item.request?.isNonSltPlace);

    const itemDate = new Date(item.createdAt);
    const matchesDateFrom =
      !filters.dateFrom || itemDate >= new Date(filters.dateFrom);
    const matchesDateTo =
      !filters.dateTo || itemDate <= new Date(filters.dateTo + "T23:59:59");

    return (
      matchesSearch &&
      matchesLocation &&
      matchesCompanyType &&
      matchesDateFrom &&
      matchesDateTo
    );
  });
};

export default requestSlice.reducer;
