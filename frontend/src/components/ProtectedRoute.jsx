import { Navigate, Outlet } from "react-router-dom";
import { useToast } from '../components/ToastProvider';
import { useEffect, useRef } from 'react';

const ProtectedRoute = ({ allowedRoles }) => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const userRole = localStorage.getItem("role");
    const { showToast } = useToast();
    const hasShownToast = useRef(false);

    useEffect(() => {
        // Only show toast once to prevent infinite re-renders
        if (!hasShownToast.current) {
            if (!user || !user.token) {
                // showToast("Session expired or not logged in. Please login again.", "error");
                hasShownToast.current = true;
            } else if (!allowedRoles.includes(userRole)) {
                showToast("Access denied. You don't have permission to view this page.", "error");
                hasShownToast.current = true;
            }
        }
    }, [user, userRole, allowedRoles, showToast]);

    if (!user || !user.token) {
        return <Navigate to="/" replace />;
    }

    if (!allowedRoles.includes(userRole)) {
        return <Navigate to="/" replace />;
    }
    
    return <Outlet />;
};

export default ProtectedRoute;