import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const SOCKET_URL =
      import.meta.env.VITE_API_URL?.replace("/api", "") ||
      import.meta.env.VITE_SOCKET_URL ||
      "http://localhost:5000";

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on("connect", () => {
      setIsConnected(true);

      // Rejoin rooms on reconnection
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const role = localStorage.getItem("role");

      if (user.serviceNo) {
        newSocket.emit("join-user-room", user.serviceNo);
      }

      if (role) {
        newSocket.emit("join-role-room", role);
      }

      if (user.branches && Array.isArray(user.branches)) {
        user.branches.forEach((branch) => {
          newSocket.emit("join-branch-room", branch);
        });
      }
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
      setIsConnected(false);
    });

    newSocket.on("reconnect", (attemptNumber) => {
      // Successfully reconnected
    });

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const joinUserRoom = (serviceNo) => {
    if (socket && serviceNo) {
      socket.emit("join-user-room", serviceNo);
    }
  };

  const joinRoleRoom = (role) => {
    if (socket && role) {
      socket.emit("join-role-room", role);
    }
  };

  const joinBranchRoom = (branch) => {
    if (socket && branch) {
      socket.emit("join-branch-room", branch);
    }
  };

  const value = {
    socket,
    isConnected,
    joinUserRoom,
    joinRoleRoom,
    joinBranchRoom,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
