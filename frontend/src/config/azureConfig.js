/**
 * Azure AD / MSAL Configuration
 * Centralized configuration to ensure consistency across the application
 */

// Validate required environment variables
if (!import.meta.env.VITE_AZURE_CLIENT_ID) {
  console.error(
    "⚠️  VITE_AZURE_CLIENT_ID is not set - Azure login will not work",
  );
}

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/common`,
    redirectUri:
      import.meta.env.VITE_AZURE_REDIRECT_URI ||
      (typeof window !== "undefined"
        ? window.location.origin + "/callback"
        : "http://localhost:5173/callback"),
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read", "offline_access"],
};
