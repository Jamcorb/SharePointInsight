import { PublicClientApplication, Configuration, AuthenticationResult } from "@azure/msal-browser";

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_AD_CLIENT_ID!.trim(),
    authority: import.meta.env.VITE_AZURE_AD_AUTHORITY!.trim(),
    redirectUri: `${window.location.origin}/redirect.html`, // Dedicated redirect page to prevent app reload
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: false, // Important for SPA
    supportsNestedAppAuth: false, // Disable nested popup detection
  },
  cache: {
    cacheLocation: "localStorage", // Better for popup flow and cross-tab SSO
    storeAuthStateInCookie: false,
  },
  system: {
    iframeHashTimeout: 10000, // Increase timeout for popup handling
    loadFrameTimeout: 10000,
    loggerOptions: {
      loggerCallback: (level: any, message: string, containsPii: boolean) => {
        if (containsPii) return;
        
        const timestamp = new Date().toISOString();
        const levelMap: Record<number, string> = { 0: '🔴 ERROR', 1: '🟡 WARN', 2: '🔵 INFO', 3: '🟢 VERBOSE' };
        
        // Log all levels for authentication debugging
        console.log(`[${timestamp}] [MSAL ${levelMap[level] || 'UNKNOWN'}] ${message}`);
      },
      piiLoggingEnabled: false,
      logLevel: 3, // Maximum verbosity (0=Error, 1=Warning, 2=Info, 3=Verbose)
    },
  },
};

// Global singleton pattern to prevent multiple MSAL instances across hot reloads
declare global {
  interface Window {
    __msalInstance?: PublicClientApplication;
  }
}

export const msalInstance = (() => {
  // Check if there's already a global instance
  if (typeof window !== 'undefined' && window.__msalInstance) {
    return window.__msalInstance;
  }
  
  // Create new instance and store globally
  const instance = new PublicClientApplication(msalConfig);
  if (typeof window !== 'undefined') {
    window.__msalInstance = instance;
  }
  
  return instance;
})();

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

// Initialize MSAL (singleton)
let _msalInitialized = false;

export async function initializeMsal(): Promise<void> {
  if (_msalInitialized) {
    console.log("✅ MSAL already initialized");
    return;
  }
  
  try {
    await msalInstance.initialize();
    _msalInitialized = true;
    console.log("✅ MSAL initialized successfully");
  } catch (error) {
    console.error("❌ MSAL initialization failed:", error);
    throw error;
  }
}

// Login with popup (enhanced with robust error handling)
export async function loginWithPopup(): Promise<AuthenticationResult> {
  try {
    console.log("🚀 [AUTH] Starting popup login with request:", loginRequest);
    
    // Try silent token acquisition first
    console.log("🔕 [AUTH] Attempting silent token acquisition first...");
    try {
      const silentRequest = {
        ...loginRequest,
        account: msalInstance.getAllAccounts()[0],
      };
      const silentResult = await msalInstance.acquireTokenSilent(silentRequest);
      console.log("✅ [AUTH] Silent token acquisition successful!");
      return silentResult;
    } catch (silentError: any) {
      console.log("🔕 [AUTH] Silent token acquisition failed, proceeding with popup:", silentError.errorCode);
    }
    
    // Enhanced popup configuration with better sizing and consent handling
    const popupRequest = {
      ...loginRequest,
      prompt: "select_account", // Force account selection to avoid consent issues
      popupWindowAttributes: {
        popupSize: {
          height: 700, // Increased height for consent screens
          width: 600,  // Increased width for better visibility
        },
        popupPosition: {
          top: Math.max(0, (screen.height - 700) / 2),
          left: Math.max(0, (screen.width - 600) / 2),
        },
      },
    };
    
    console.log("🔍 [AUTH] Using enhanced popup configuration:", {
      height: popupRequest.popupWindowAttributes.popupSize?.height,
      width: popupRequest.popupWindowAttributes.popupSize?.width,
      prompt: popupRequest.prompt,
      centered: true
    });
    
    const response = await msalInstance.loginPopup(popupRequest);
    console.log("✅ [AUTH] Popup login successful:", {
      account: response.account?.username,
      tenantId: response.account?.tenantId,
      scopes: response.scopes,
      tokenType: response.tokenType
    });
    return response;
  } catch (error: any) {
    console.error("❌ [AUTH] Popup login failed:", {
      error: error.message,
      errorCode: error.errorCode,
      subError: error.subError,
      correlationId: error.correlationId
    });
    
    // Enhanced error handling for common issues
    if (error.errorCode === 'user_cancelled') {
      console.error("🚨 [AUTH] User cancelled authentication or popup was closed");
      console.log("📝 [AUTH] This could be due to:");
      console.log("1. Multiple consent screens requiring user interaction");
      console.log("2. Popup blocker preventing proper window display");
      console.log("3. User manually closing the authentication window");
    } else if (error.errorCode === 'block_nested_popups') {
      console.error("🚨 [AUTH] Popup blocked - nested popup detected");
      console.log("📝 [AUTH] Possible solutions:");
      console.log("1. Ensure the application is not running in an iframe");
      console.log("2. Check browser popup blocker settings");
      console.log("3. Try using redirect flow instead");
    } else if (error.errorCode === 'interaction_in_progress') {
      console.error("🚨 [AUTH] Multiple authentication attempts detected");
      console.log("📝 [AUTH] Please wait for current authentication to complete");
    }
    
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

// Get access token silently (no automatic popup fallback)
export async function getAccessTokenSilent(): Promise<string | null> {
  try {
    console.log("🔍 [AUTH] Attempting silent token acquisition...");
    const accounts = msalInstance.getAllAccounts();
    console.log("🔍 [AUTH] Found accounts:", accounts.length);
    
    if (accounts.length === 0) {
      console.warn("⚠️ [AUTH] No accounts found, user needs to login");
      return null;
    }

    console.log("🔍 [AUTH] Using account:", {
      username: accounts[0].username,
      tenantId: accounts[0].tenantId,
      environment: accounts[0].environment
    });
    
    silentRequest.account = accounts[0];
    console.log("🔍 [AUTH] Silent request:", {
      scopes: silentRequest.scopes,
      account: accounts[0].username
    });
    
    const response = await msalInstance.acquireTokenSilent(silentRequest);
    console.log("✅ [AUTH] Silent token acquisition successful:", {
      scopes: response.scopes,
      expiresOn: response.expiresOn,
      tokenType: response.tokenType
    });
    return response.accessToken;
  } catch (error) {
    console.error("❌ [AUTH] Silent token acquisition failed:", error);
    // Return null instead of triggering popup - let calling code decide what to do
    return null;
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
  const authenticated = accounts.length > 0;
  console.log("🔍 [AUTH] Authentication check:", {
    accountCount: accounts.length,
    authenticated,
    accounts: accounts.map(acc => ({ username: acc.username, tenantId: acc.tenantId }))
  });
  return authenticated;
}

// Get current account
export function getCurrentAccount() {
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}
