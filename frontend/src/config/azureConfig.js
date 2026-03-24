/**
 * Azure AD / MSAL Configuration
 * Centralized configuration to ensure consistency across the application
 */

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri:
      import.meta.env.VITE_AZURE_REDIRECT_URI?.trim() ||
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
