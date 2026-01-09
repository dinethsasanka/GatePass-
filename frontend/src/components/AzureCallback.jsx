import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PublicClientApplication } from "@azure/msal-browser";
import axios from "axios";
import { useToast } from "./ToastProvider";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Azure AD configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    // Use 'common' to allow personal Microsoft accounts and work/school accounts
    authority: `https://login.microsoftonline.com/common`,
    redirectUri:
      import.meta.env.VITE_AZURE_REDIRECT_URI ||
      "http://localhost:5173/callback",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

const AzureCallback = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
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

          // Send access token to backend
          const backendResponse = await axios.post(
            `${API_BASE_URL}/auth/azure-login`,
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

            localStorage.setItem("user", JSON.stringify(userData));
            localStorage.setItem(
              "role",
              String(backendResponse.data.role).trim()
            );
            localStorage.setItem(
              "token",
              String(backendResponse.data.token).trim()
            );

            console.log("Data stored successfully in localStorage");

            showToast("Azure login successful! Redirecting...", "success");

            // Navigate to new request page
            window.location.href = "/newrequest";
          }
        } else {
          // Check URL parameters (both hash and query)
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1)
          );
          const searchParams = new URLSearchParams(window.location.search);

          const code = hashParams.get("code") || searchParams.get("code");
          const state = hashParams.get("state") || searchParams.get("state");

          console.log(
            "URL params - code:",
            code ? "present" : "missing",
            "state:",
            state ? "present" : "missing"
          );

          if (code) {
            console.log(
              "Authorization code present, waiting for MSAL to process..."
            );

            // Wait for MSAL to process
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Try handling redirect again
            const retryResponse = await msalInstance.handleRedirectPromise();
            console.log("Retry response:", retryResponse);

            if (retryResponse && retryResponse.accessToken) {
              console.log("Retry successful, sending token to backend...");

              const backendResponse = await axios.post(
                `${API_BASE_URL}/auth/azure-login`,
                {
                  accessToken: retryResponse.accessToken,
                }
              );

              if (backendResponse.data.token) {
                const userData = {
                  ...backendResponse.data,
                  token: backendResponse.data.token,
                };

                localStorage.setItem("user", JSON.stringify(userData));
                localStorage.setItem(
                  "role",
                  String(backendResponse.data.role).trim()
                );
                localStorage.setItem(
                  "token",
                  String(backendResponse.data.token).trim()
                );

                console.log("Data stored successfully in localStorage (retry)");

                showToast("Azure login successful! Redirecting...", "success");

                window.location.href = "/newrequest";
                return;
              }
            } else {
              console.error("MSAL still returning null after retry");
              showToast("Authentication failed. Please try again.", "error");
              window.location.href = "/login";
            }
          } else {
            console.error("No authorization code in URL");
            showToast("Authentication failed. Please try again.", "error");
            window.location.href = "/login";
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
        
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate, showToast]);

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
