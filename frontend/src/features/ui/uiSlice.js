import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Global loading state
  isGlobalLoading: false,
  loadingMessage: '',
  
  // Modals
  modals: {
    requestDetails: {
      isOpen: false,
      data: null,
    },
    imageViewer: {
      isOpen: false,
      images: [],
      currentIndex: 0,
    },
    confirmation: {
      isOpen: false,
      title: '',
      message: '',
      onConfirm: null,
      onCancel: null,
    },
  },
  
  // Notifications
  notifications: [],
  
  // Sidebar
  isSidebarOpen: true,
  
  // Active tab (for pages with tabs)
  activeTabs: {
    executiveApproval: 'pending',
    verify: 'pending',
    dispatch: 'pending',
    receive: 'pending',
  },
  
  // Toast notifications
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Global loading
    setGlobalLoading: (state, action) => {
      state.isGlobalLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || '';
    },
    
    // Modal actions
    openModal: (state, action) => {
      const { modalName, data } = action.payload;
      if (state.modals[modalName]) {
        state.modals[modalName].isOpen = true;
        if (data) {
          state.modals[modalName].data = data;
        }
      }
    },
    closeModal: (state, action) => {
      const modalName = action.payload;
      if (state.modals[modalName]) {
        state.modals[modalName].isOpen = false;
        state.modals[modalName].data = null;
      }
    },
    setModalData: (state, action) => {
      const { modalName, data } = action.payload;
      if (state.modals[modalName]) {
        state.modals[modalName].data = data;
      }
    },
    
    // Image viewer specific
    openImageViewer: (state, action) => {
      state.modals.imageViewer.isOpen = true;
      state.modals.imageViewer.images = action.payload.images || [];
      state.modals.imageViewer.currentIndex = action.payload.startIndex || 0;
    },
    setImageViewerIndex: (state, action) => {
      state.modals.imageViewer.currentIndex = action.payload;
    },
    
    // Confirmation modal
    openConfirmation: (state, action) => {
      state.modals.confirmation = {
        isOpen: true,
        title: action.payload.title,
        message: action.payload.message,
        onConfirm: action.payload.onConfirm,
        onCancel: action.payload.onCancel,
      };
    },
    
    // Notifications
    addNotification: (state, action) => {
      state.notifications.unshift({
        id: Date.now(),
        ...action.payload,
        read: false,
        timestamp: new Date().toISOString(),
      });
    },
    markNotificationAsRead: (state, action) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.read = true;
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    
    // Sidebar
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
    
    // Active tabs
    setActiveTab: (state, action) => {
      const { page, tab } = action.payload;
      if (state.activeTabs[page] !== undefined) {
        state.activeTabs[page] = tab;
      }
    },
    
    // Toast notifications (for react-toastify integration)
    addToast: (state, action) => {
      state.toasts.push({
        id: Date.now(),
        ...action.payload,
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  setGlobalLoading,
  openModal,
  closeModal,
  setModalData,
  openImageViewer,
  setImageViewerIndex,
  openConfirmation,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  clearAllNotifications,
  toggleSidebar,
  setSidebarOpen,
  setActiveTab,
  addToast,
  removeToast,
} = uiSlice.actions;

// Selectors
export const selectIsGlobalLoading = (state) => state.ui.isGlobalLoading;
export const selectLoadingMessage = (state) => state.ui.loadingMessage;
export const selectModal = (modalName) => (state) => state.ui.modals[modalName];
export const selectNotifications = (state) => state.ui.notifications;
export const selectUnreadNotificationsCount = (state) =>
  state.ui.notifications.filter((n) => !n.read).length;
export const selectIsSidebarOpen = (state) => state.ui.isSidebarOpen;
export const selectActiveTab = (page) => (state) => state.ui.activeTabs[page];
export const selectToasts = (state) => state.ui.toasts;

export default uiSlice.reducer;
