import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PublicClientApplication } from "@azure/msal-browser";
import axios from "../services/axiosConfig";
import { useToast } from "./ToastProvider";
import { msalConfig } from "../config/azureConfig";

const msalInstance = new PublicClientApplication(msalConfig);

const AzureCallback = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const hasHandled = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode double-invocation
    if (hasHandled.current) return;
    hasHandled.current = true;

    const handleCallback = async () => {
      try {
        console.log("AzureCallback: Starting to handle redirect...");
        console.log("Full URL:", window.location.href);
        
        // Clear the Azure loading state
        sessionStorage.removeItem('azureLoginInProgress');

        // Initialize MSAL
        await msalInstance.initialize();

        // Handle redirect response
        const response = await msalInstance.handleRedirectPromise();

        console.log("AzureCallback: Redirect response:", response);

        if (response && response.accessToken) {
          console.log("Azure redirect successful, access token received");
          console.log("Sending token to backend: POST /auth/azure-login");

          // Send access token to backend
          const backendResponse = await axios.post(
            "/auth/azure-login",
            {
              accessToken: response.accessToken,
            }
          );

          console.log("Backend response:", backendResponse.data);

          if (backendResponse.data.token) {
            // Store user data with token
            const userData = {
              ...backendResponse.data,
              token: backendResponse.data.token,
            };

            console.log("📝 Storing user data:", {
              hasToken: !!userData.token,
              hasRole: !!userData.role,
              userId: userData.userId,
              role: userData.role
            });

            localStorage.setItem("user", JSON.stringify(userData));
            localStorage.setItem(
              "role",
              String(backendResponse.data.role).trim()
            );
            localStorage.setItem(
              "token",
              String(backendResponse.data.token).trim()
            );

            console.log("✅ Data stored successfully in localStorage");
            showToast("Azure login successful! Redirecting...", "success");

            setTimeout(() => {
              console.log("🚀 Navigating to /newrequest");
              window.location.href = "/newrequest";
            }, 200);
          } else {
            console.error("❌ No token in backend response!");
            showToast("Login failed - no token received", "error");
            window.location.href = "/login";
          }
        } else {
          // MSAL returned null — check if auth code is still in URL
          const searchParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const code = searchParams.get("code") || hashParams.get("code");

          if (code) {
            // Auth code present but MSAL already processed it — this is the
            // second Strict Mode invocation. Do nothing and let the first handle it.
            console.log("Auth code present but MSAL returned null — likely already processed.");
          } else {
            console.error("No authorization code in URL and no MSAL response");
            showToast("Authentication failed. Please try again.", "error");
            setTimeout(() => { window.location.href = "/login"; }, 2000);
          }
        }
      } catch (error) {
        console.error("Azure callback error:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          response: error.response?.data
        });
        
        sessionStorage.removeItem('azureLoginInProgress');
        showToast("Azure login failed: " + error.message, "error");
        
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    };

    handleCallback();
  }, []); // Empty deps — only run once on mount

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Processing Azure login...</p>
      </div>
    </div>
  );
};

export default AzureCallback;
