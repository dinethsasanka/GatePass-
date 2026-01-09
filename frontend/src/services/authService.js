import axios from "axios";
import { PublicClientApplication } from "@azure/msal-browser";

export const API_BASE_URL = import.meta.env.VITE_API_URL;

// Azure AD configuration
const msalConfig = {
  auth: {
    clientId:
      import.meta.env.VITE_AZURE_CLIENT_ID ||
      "fb3e75a7-554f-41f8-9da3-2b162c255349",
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

// Initialize MSAL instance
let msalInitialized = false;
const initializeMsal = async () => {
  if (!msalInitialized) {
    await msalInstance.initialize();
    msalInitialized = true;
  }
};

export const authService = {
  login: async (userId, password, userType) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        userId,
        password,
        userType,
      });

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  },

  azureLogin: async () => {
    try {
      // Initialize MSAL before using it
      await initializeMsal();

      // Force clear any existing interaction state
      try {
        // Clear all MSAL session storage
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('msal.')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => {
          console.log("Removing MSAL key:", key);
          sessionStorage.removeItem(key);
        });
        
        // Clear MSAL cache
        await msalInstance.clearCache();
        console.log("MSAL cache cleared");
      } catch (e) {
        console.log("Error clearing MSAL state:", e);
      }

      const loginRequest = {
        scopes: ["openid", "profile", "email", "User.Read"],
        // Use 'select_account' to show all Microsoft accounts on the device
        // This will show personal and work accounts that have signed in to any Microsoft service
        prompt: "select_account",
        // This allows showing all accounts, not just those from your tenant
        domainHint: undefined,
      };

      console.log("Initiating Azure redirect login...");
      
      // Use redirect flow
      await msalInstance.loginRedirect(loginRequest);

      // Note: This function won't return - user will be redirected
      // The callback component will handle the response
    } catch (error) {
      console.error("Azure login error:", error);
      throw new Error(error.message || "Azure login failed");
    }
  },

  logout: async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    sessionStorage.removeItem("azureLoginInProgress");

    try {
      // Initialize MSAL before using it
      await initializeMsal();
      
      const accounts = msalInstance.getAllAccounts();
      
      if (accounts.length > 0) {
        // Clear MSAL cache and logout
        await msalInstance.clearCache();
        
        // Optionally do a full logout redirect (commented out to avoid redirect loop)
        // await msalInstance.logoutRedirect({
        //   account: accounts[0]
        // });
      }
    } catch (error) {
      console.error("MSAL logout error:", error);
      // Continue with logout even if MSAL logout fails
    }
    
    // Clear session storage completely
    sessionStorage.clear();
  },

  getToken: () => {
    return localStorage.getItem("token");
  },
};
