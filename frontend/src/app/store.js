import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import requestsReducer from '../features/requests/requestSlice';
import uiReducer from '../features/ui/uiSlice';
import verifyReducer from '../features/verify/verifySlice';
import executiveReducer from '../features/executive/executiveSlice';
import dispatchReducer from '../features/dispatch/dispatchSlice';
import receiveReducer from '../features/receive/receiveSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    requests: requestsReducer,
    ui: uiReducer,
    verify: verifyReducer,
    executive: executiveReducer,
    dispatch: dispatchReducer,
    receive: receiveReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for socket.io compatibility
        ignoredActions: ['socket/connected', 'socket/disconnected'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.socket', 'meta.socket'],
        // Ignore these paths in the state
        ignoredPaths: ['socket.instance'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
