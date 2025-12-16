import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Toast types for different status messages
const TOAST_TYPES = {
  success: {
    icon: "✓",
    bgColor: "bg-emerald-500",
    textColor: "text-white",
    progressColor: "bg-emerald-300"
  },
  error: {
    icon: "✕",
    bgColor: "bg-rose-500",
    textColor: "text-white",
    progressColor: "bg-rose-300"
  },
  warning: {
    icon: "⚠",
    bgColor: "bg-amber-500",
    textColor: "text-gray-800",
    progressColor: "bg-amber-300"
  },
  info: {
    icon: "ℹ",
    bgColor: "bg-sky-500",
    textColor: "text-white",
    progressColor: "bg-sky-300"
  },
  loading: {
    icon: "⟳",
    bgColor: "bg-violet-500",
    textColor: "text-white",
    progressColor: "bg-violet-300"
  }
};

// Create a context for toast functionality
const ToastContext = createContext();

// Custom hook to use toast functionality
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Toast Provider component
export const ToastProvider = ({ children, position = "topRight" }) => {
  const [toasts, setToasts] = useState([]);
  const [toastPosition, setToastPosition] = useState(position);
  const intervalIdsRef = useRef({});
  
  // Determine position styling
  const getPositionClasses = () => {
    switch (toastPosition) {
      case "topRight":
        return "top-20 right-0 pt-4 pr-4";
      case "topLeft":
        return "top-0 left-0 pt-4 pl-4";
      case "bottomRight":
        return "bottom-0 right-0 pb-4 pr-4";
      case "bottomLeft":
        return "bottom-0 left-0 pb-4 pl-4";
      default:
        return "top-0 right-0 pt-4 pr-4";
    }
  };

  // Add a new toast
  const showToast = (message, type = "info", duration = 1500) => {
    const id = Date.now();
    const newToast = { id, message, type, duration, progress: 0 };
    
    setToasts(prevToasts => [...prevToasts, newToast]);
    
    // Set up progress tracking for this toast
    const intervalTime = 10;
    const steps = duration / intervalTime;
    const incrementValue = 100 / steps;
    
    intervalIdsRef.current[id] = setInterval(() => {
      setToasts(prevToasts => {
        const toastToUpdate = prevToasts.find(t => t.id === id);
        if (!toastToUpdate) {
          clearInterval(intervalIdsRef.current[id]);
          delete intervalIdsRef.current[id];
          return prevToasts;
        }
        
        const newProgress = toastToUpdate.progress + incrementValue;
        if (newProgress >= 100) {
          clearInterval(intervalIdsRef.current[id]);
          delete intervalIdsRef.current[id];
          
          // Schedule removal of the toast
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
          }, 100);
        }
        
        return prevToasts.map(t => 
          t.id === id ? { ...t, progress: Math.min(newProgress, 100) } : t
        );
      });
    }, intervalTime);
    
    return id;
  };

  // Remove a toast by id
  const hideToast = (id) => {
    // Clear the interval if it exists
    if (intervalIdsRef.current[id]) {
      clearInterval(intervalIdsRef.current[id]);
      delete intervalIdsRef.current[id];
    }
    
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  // Change toast position
  const changePosition = (newPosition) => {
    setToastPosition(newPosition);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear all intervals when component unmounts
      Object.values(intervalIdsRef.current).forEach(intervalId => {
        clearInterval(intervalId);
      });
    };
  }, []);

  const contextValue = {
    showToast,
    hideToast,
    changePosition
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className={`fixed ${getPositionClasses()} space-y-2 z-50`}>
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              id={toast.id}
              message={toast.message}
              type={toast.type}
              progress={toast.progress}
              onClose={() => hideToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// Individual Toast component
const Toast = ({ id, message, type, progress, onClose }) => {
  const toastConfig = TOAST_TYPES[type] || TOAST_TYPES.info;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.8 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className="relative overflow-hidden"
    >
      <div className={`${toastConfig.bgColor} ${toastConfig.textColor} rounded-lg shadow-lg backdrop-blur-sm flex items-center p-4 min-w-80 max-w-md border border-white/10`}>
        <div className="mr-3 text-xl">
          {type === "loading" ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              {toastConfig.icon}
            </motion.div>
          ) : (
            toastConfig.icon
          )}
        </div>
        <div className="flex-1 font-medium">{message}</div>
        <button
          onClick={onClose}
          className="ml-4 text-sm opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Close toast"
        >
          ✕
        </button>
      </div>
      
      {/* Progress bar */}
      <motion.div 
        className={`absolute bottom-0 left-0 h-1 ${toastConfig.progressColor}`}
        initial={{ width: "0%" }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </motion.div>
  );
};

export default ToastProvider;