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
};

// Helper to check if service number is Non-SLT
const isNonSltIdentifier = (serviceNo) => {
  if (!serviceNo) return false;
  if (serviceNo.startsWith("NSL")) return true;
  return false;
};

// Fetch Dispatch Pending (status=4 - Petrol Leader pending)
export const fetchDispatchPending = createAsyncThunk(
  "dispatch/fetchPending",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getPendingStatuses();
      const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const enrichedData = await Promise.all(
        response.map(async (status) => {
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
                searchUserByServiceNo
              );
            } catch (error) {}
          }

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

          if (loadingDetails?.staffType === "SLT" && loadingDetails.staffServiceNo) {
            try {
              loadUserData = await getCachedUser(
                loadingDetails.staffServiceNo,
                searchUserByServiceNo
              );
            } catch (error) {}
          }

          if (status.executiveOfficerServiceNo) {
            try {
              executiveOfficerData = await getCachedUser(
                status.executiveOfficerServiceNo,
                searchUserByServiceNo
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
            comment: status.comment || status.verifyOfficerComment || status.dispatchComment || "",
            requestDetails: { ...status.request },
            loadUserData,
            statusDetails: status,
            executiveOfficerData,
            verifyOfficerData,
          };
        })
      );

      // Remove duplicates by refNo, keeping most recent
      const uniqueItems = enrichedData.reduce((acc, item) => {
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

      return uniqueItems;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch dispatch pending");
    }
  }
);

// Fetch Dispatch Approved
export const fetchDispatchApproved = createAsyncThunk(
  "dispatch/fetchApproved",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getApprovedStatuses();

      const enrichedData = await Promise.all(
        response.map(async (status) => {
          const senderServiceNo = status.request?.employeeServiceNo;
          const receiverServiceNo = status.request?.receiverServiceNo;
          const isNonSltPlace = status.request?.isNonSltPlace;
          let senderDetails = null;
          let receiverDetails = null;

          if (senderServiceNo) {
            try {
              senderDetails = await getCachedUser(senderServiceNo, searchUserByServiceNo);
            } catch (error) {}
          }

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
            inLocation: status.request?.inLocation,
            outLocation: status.request?.outLocation,
            createdAt: new Date(status.createdAt).toLocaleString(),
            items: status.request?.items || [],
            comment: status.comment,
            requestDetails: { ...status.request },
          };
        })
      );

      const uniqueItems = enrichedData.reduce((acc, item) => {
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

      return uniqueItems;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch dispatch approved");
    }
  }
);

// Fetch Dispatch Rejected
export const fetchDispatchRejected = createAsyncThunk(
  "dispatch/fetchRejected",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRejectedStatuses();

      const enrichedData = await Promise.all(
        response.map(async (status) => {
          const senderServiceNo = status.request?.employeeServiceNo;
          const receiverServiceNo = status.request?.receiverServiceNo;
          const isNonSltPlace = status.request?.isNonSltPlace;
          let senderDetails = null;
          let receiverDetails = null;

          if (senderServiceNo) {
            try {
              senderDetails = await getCachedUser(senderServiceNo, searchUserByServiceNo);
            } catch (error) {}
          }

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

      const uniqueItems = enrichedData.reduce((acc, item) => {
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

      return uniqueItems;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch dispatch rejected");
    }
  }
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
        state.dispatchPending = action.payload;
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
        state.dispatchApproved = action.payload;
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
        state.dispatchRejected = action.payload;
      })
      .addCase(fetchDispatchRejected.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Selectors
export const selectDispatchPending = (state) => state.dispatch.dispatchPending;
export const selectDispatchApproved = (state) => state.dispatch.dispatchApproved;
export const selectDispatchRejected = (state) => state.dispatch.dispatchRejected;
export const selectDispatchLoading = (state) => state.dispatch.isLoading;
export const selectDispatchError = (state) => state.dispatch.error;

export default dispatchSlice.reducer;
