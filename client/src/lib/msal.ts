import { PublicClientApplication, Configuration, AuthenticationResult } from "@azure/msal-browser";

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_AD_CLIENT_ID || "your-client-id",
    authority: import.meta.env.VITE_AZURE_AD_AUTHORITY || "https://login.microsoftonline.com/common",
    redirectUri: import.meta.env.VITE_AZURE_AD_REDIRECT_URI || window.location.origin + "/auth/callback",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: [
    "User.Read",
    "Sites.Read.All",
    "Files.Read.All",
    "offline_access",
  ],
};

export const silentRequest = {
  scopes: loginRequest.scopes,
  account: null as any,
};

// Initialize MSAL
export async function initializeMsal(): Promise<void> {
  await msalInstance.initialize();
}

// Login with popup
export async function loginWithPopup(): Promise<AuthenticationResult> {
  try {
    const response = await msalInstance.loginPopup(loginRequest);
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
}

// Login with redirect
export async function loginWithRedirect(): Promise<void> {
  try {
    await msalInstance.loginRedirect(loginRequest);
  } catch (error) {
    console.error("Login redirect failed:", error);
    throw error;
  }
}

// Get access token silently
export async function getAccessTokenSilent(): Promise<string | null> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      return null;
    }

    silentRequest.account = accounts[0];
    const response = await msalInstance.acquireTokenSilent(silentRequest);
    return response.accessToken;
  } catch (error) {
    console.error("Silent token acquisition failed:", error);
    
    // If silent acquisition fails, try with popup
    try {
      const response = await msalInstance.acquireTokenPopup(loginRequest);
      return response.accessToken;
    } catch (popupError) {
      console.error("Popup token acquisition failed:", popupError);
      return null;
    }
  }
}

// Logout
export async function logout(): Promise<void> {
  try {
    await msalInstance.logoutPopup();
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0;
}

// Get current account
export function getCurrentAccount() {
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}
