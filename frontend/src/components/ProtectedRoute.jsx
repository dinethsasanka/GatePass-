import { Navigate, Outlet } from "react-router-dom";
import { useToast } from '../components/ToastProvider';
import { useEffect, useRef } from 'react';

const ProtectedRoute = ({ allowedRoles }) => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const userRole = localStorage.getItem("role");
    const { showToast } = useToast();
    const hasShownToast = useRef(false);

    // DEBUG: Log what we're seeing
    console.log("🛡️ ProtectedRoute Check:", {
        hasUser: !!user,
        hasToken: !!user?.token,
        userRole,
        userId: user?.userId,
        allowedRoles,
        isAllowed: userRole && allowedRoles.includes(userRole)
    });

    useEffect(() => {
        // Only show toast once to prevent infinite re-renders
        if (!hasShownToast.current) {
            if (!user || !user.token) {
                console.log("⚠️ No user or token found, will redirect to login");
                // showToast("Session expired or not logged in. Please login again.", "error");
                hasShownToast.current = true;
            } else if (!allowedRoles.includes(userRole)) {
                console.log("⚠️ User role not allowed:", userRole, "allowed:", allowedRoles);
                showToast("Access denied. You don't have permission to view this page.", "error");
                hasShownToast.current = true;
            } else {
                console.log("✅ ProtectedRoute: Access granted");
            }
        }
    }, [user, userRole, allowedRoles, showToast]);

    if (!user || !user.token) {
        console.log("❌ Redirecting to login - no auth");
        return <Navigate to="/" replace />;
    }

    if (!allowedRoles.includes(userRole)) {
        console.log("❌ Redirecting to login - role not allowed");
        return <Navigate to="/" replace />;
    }
    
    console.log("✅ Rendering protected content");
    return <Outlet />;
};

export default ProtectedRoute;