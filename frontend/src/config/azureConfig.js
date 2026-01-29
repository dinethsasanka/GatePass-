/**
 * Azure AD / MSAL Configuration
 * Centralized configuration to ensure consistency across the application
 */

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "fb3e75a7-554f-41f8-9da3-2b162c255349",
    authority: `https://login.microsoftonline.com/common`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin + "/callback" : "http://localhost:5173/callback",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read", "offline_access"]
};
