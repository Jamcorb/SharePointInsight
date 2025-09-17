import { PublicClientApplication, Configuration, AuthenticationResult } from "@azure/msal-browser";

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_AD_CLIENT_ID!,
    authority: import.meta.env.VITE_AZURE_AD_AUTHORITY!,
    redirectUri: import.meta.env.VITE_AZURE_AD_REDIRECT_URI!,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: [
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/Sites.Read.All",
    "https://graph.microsoft.com/Files.Read.All",
    "offline_access",
  ],
};

export const silentRequest = {
  scopes: loginRequest.scopes,
  account: null as any,
};

// Initialize MSAL
export async function initializeMsal(): Promise<void> {
  try {
    await msalInstance.initialize();
    console.log("✅ MSAL initialized successfully");
  } catch (error) {
    console.error("❌ MSAL initialization failed:", error);
    throw error;
  }
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
      console.warn("No accounts found, user needs to login");
      return null;
    }

    silentRequest.account = accounts[0];
    const response = await msalInstance.acquireTokenSilent(silentRequest);
    console.log("✅ Access token acquired silently");
    return response.accessToken;
  } catch (error) {
    console.error("Silent token acquisition failed:", error);
    
    // If silent acquisition fails, try with popup
    try {
      console.log("🔄 Attempting token acquisition with popup");
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
