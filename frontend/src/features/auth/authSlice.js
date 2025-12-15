import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';

// Get initial user from localStorage
const userFromStorage = localStorage.getItem('user')
  ? JSON.parse(localStorage.getItem('user'))
  : null;

const tokenFromStorage = localStorage.getItem('token') || null;

const initialState = {
  user: userFromStorage,
  token: tokenFromStorage,
  isAuthenticated: !!tokenFromStorage,
  isLoading: false,
  error: null,
  loginMethod: localStorage.getItem('loginMethod') || null, // 'credentials' or 'azure'
};

// Async thunks for authentication
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ userId, userType, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(userId, password, userType);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const loginWithAzureAD = createAsyncThunk(
  'auth/azureLogin',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.azureLogin();
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Azure login failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loginMethod = null;
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('loginMethod');
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loginMethod = 'credentials';
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('loginMethod', 'credentials');
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Azure Login
      .addCase(loginWithAzureAD.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithAzureAD.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loginMethod = 'azure';
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('loginMethod', 'azure');
      })
      .addCase(loginWithAzureAD.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError, updateUser } = authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectLoginMethod = (state) => state.auth.loginMethod;

export default authSlice.reducer;
