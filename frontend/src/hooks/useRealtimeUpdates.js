import { useEffect, useCallback, useRef } from "react";
import { useSocket } from "../contexts/SocketContext";

/**
 * Custom hook for handling real-time request updates
 * @param {Function} onUpdate - Callback when request is updated
 * @param {Function} onNewRequest - Callback when new request is created
 * @param {Function} onApproval - Callback when request is approved
 * @param {Function} onRejection - Callback when request is rejected
 * @param {Function} onCompletion - Callback when request is completed
 */
export const useRequestUpdates = ({
  onUpdate,
  onNewRequest,
  onApproval,
  onRejection,
  onCompletion,
  onBulkUpdate,
}) => {
  const { socket, isConnected } = useSocket();
  const listenersRef = useRef(new Set());

  const handleUpdate = useCallback(
    (data) => {
      console.log("📡 Request updated:", data);
      if (onUpdate) onUpdate(data);
    },
    [onUpdate]
  );

  const handleNewRequest = useCallback(
    (data) => {
      console.log("📡 New request:", data);
      if (onNewRequest) onNewRequest(data);
    },
    [onNewRequest]
  );

  const handleApproval = useCallback(
    (data) => {
      console.log("✅ Request approved:", data);
      if (onApproval) onApproval(data);
    },
    [onApproval]
  );

  const handleRejection = useCallback(
    (data) => {
      console.log("❌ Request rejected:", data);
      if (onRejection) onRejection(data);
    },
    [onRejection]
  );

  const handleCompletion = useCallback(
    (data) => {
      console.log("🎉 Request completed:", data);
      if (onCompletion) onCompletion(data);
    },
    [onCompletion]
  );

  const handleBulkUpdate = useCallback(
    (data) => {
      console.log("📦 Bulk update:", data);
      if (onBulkUpdate) onBulkUpdate(data);
    },
    [onBulkUpdate]
  );

  useEffect(() => {
    if (!socket) return;

    // Remove old listeners
    listenersRef.current.forEach((event) => {
      socket.off(event);
    });
    listenersRef.current.clear();

    // Add new listeners
    const events = [
      { name: "request-updated", handler: handleUpdate },
      { name: "new-request", handler: handleNewRequest },
      { name: "request-approved", handler: handleApproval },
      { name: "request-rejected", handler: handleRejection },
      { name: "request-completed", handler: handleCompletion },
      { name: "bulk-update", handler: handleBulkUpdate },
    ];

    events.forEach(({ name, handler }) => {
      if (handler) {
        socket.on(name, handler);
        listenersRef.current.add(name);
      }
    });

    // Cleanup
    return () => {
      listenersRef.current.forEach((event) => {
        socket.off(event);
      });
      listenersRef.current.clear();
    };
  }, [
    socket,
    handleUpdate,
    handleNewRequest,
    handleApproval,
    handleRejection,
    handleCompletion,
    handleBulkUpdate,
  ]);

  return { isConnected };
};

/**
 * Custom hook for handling notifications
 */
export const useNotifications = (onNotification) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !onNotification) return;

    const handleNotification = (data) => {
      console.log("🔔 Notification:", data);
      onNotification(data);
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, onNotification]);
};

/**
 * Custom hook for auto-refetching data on real-time updates
 * @param {Function} fetchFunction - Function to call for refetching
 * @param {Array} dependencies - Dependencies for the fetch function
 * @param {Object} filters - Filters for which updates should trigger refetch
 */
export const useAutoRefetch = (
  fetchFunction,
  dependencies = [],
  filters = {}
) => {
  const { socket } = useSocket();
  const lastFetchRef = useRef(Date.now());
  const DEBOUNCE_MS = 500; // Prevent too frequent refetches

  const debouncedFetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchRef.current < DEBOUNCE_MS) {
      return; // Skip if too soon
    }
    lastFetchRef.current = now;

    if (fetchFunction) {
      fetchFunction();
    }
  }, [fetchFunction]);

  useEffect(() => {
    if (!socket) return;

    const shouldRefetch = (data) => {
      // Apply filters if provided
      if (filters.status && data.request?.status !== filters.status) {
        return false;
      }
      if (
        filters.serviceNo &&
        data.request?.employeeServiceNo !== filters.serviceNo
      ) {
        return false;
      }
      return true;
    };

    const handleUpdate = (data) => {
      if (shouldRefetch(data)) {
        debouncedFetch();
      }
    };

    // Listen to all update events
    socket.on("request-updated", handleUpdate);
    socket.on("new-request", handleUpdate);
    socket.on("request-approved", handleUpdate);
    socket.on("request-rejected", handleUpdate);
    socket.on("request-completed", handleUpdate);

    return () => {
      socket.off("request-updated", handleUpdate);
      socket.off("new-request", handleUpdate);
      socket.off("request-approved", handleUpdate);
      socket.off("request-rejected", handleUpdate);
      socket.off("request-completed", handleUpdate);
    };
  }, [socket, debouncedFetch, filters]);
};
