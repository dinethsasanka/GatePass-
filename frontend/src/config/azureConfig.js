/**
 * Azure AD / MSAL Configuration
 * Centralized configuration to ensure consistency across the application
 */

const azureTenantId = import.meta.env.VITE_AZURE_TENANT_ID?.trim() || "common";
const azureClientId = import.meta.env.VITE_AZURE_CLIENT_ID?.trim() || "";
const azureAuthority =
  import.meta.env.VITE_AZURE_AUTHORITY?.trim().replace(/\/$/, "") ||
  `https://login.microsoftonline.com/${azureTenantId}`;

export const msalConfig = {
  auth: {
    clientId: azureClientId,
    authority: azureAuthority,
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

export const getAzureConfigIssues = () => {
  const issues = [];

  if (!azureClientId || azureClientId === "undefined") {
    issues.push("VITE_AZURE_CLIENT_ID is missing or invalid");
  }

  if (!azureAuthority || azureAuthority.includes("/undefined")) {
    issues.push("Azure authority is invalid (check tenant/authority env values)");
  }

  if (!msalConfig.auth.redirectUri || msalConfig.auth.redirectUri.includes("undefined")) {
    issues.push("VITE_AZURE_REDIRECT_URI is missing or invalid");
  }

  return issues;
};
