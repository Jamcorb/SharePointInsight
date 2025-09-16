import { getAccessTokenSilent, getCurrentAccount, isAuthenticated } from "./msal";

export interface AuthUser {
  id: string;
  upn: string;
  tenantId: string;
  name: string;
  email: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  domain: string;
}

export interface AuthContext {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isAuthenticated: boolean;
  accessToken: string | null;
}

export async function getAuthContext(): Promise<AuthContext> {
  // Check for test mode via URL parameter or development environment
  const urlParams = new URLSearchParams(window.location.search);
  const isTestMode = urlParams.get('testMode') === 'true' || 
                    window.location.hostname.includes('replit') || 
                    import.meta.env.DEV;
  
  console.log("🔍 Test mode check:", { 
    urlTestMode: urlParams.get('testMode'), 
    hostname: window.location.hostname, 
    isDev: import.meta.env.DEV,
    isTestMode 
  });
  
  // Test mode bypass - allows inspecting interface without OAuth
  if (isTestMode) {
    console.log("🧪 Running in test mode - bypassing authentication");
    return {
      user: {
        id: "12345678-1234-1234-1234-123456789abc",
        upn: "testuser@contoso.com",
        tenantId: "87654321-4321-4321-4321-cba987654321",
        name: "Test Admin",
        email: "testuser@contoso.com"
      },
      tenant: {
        id: "87654321-4321-4321-4321-cba987654321",
        name: "Contoso Test Corp",
        domain: "contoso.com"
      },
      isAuthenticated: true,
      accessToken: "test-token-789",
    };
  }

  if (!isAuthenticated()) {
    return {
      user: null,
      tenant: null,
      isAuthenticated: false,
      accessToken: null,
    };
  }

  try {
    const accessToken = await getAccessTokenSilent();
    if (!accessToken) {
      return {
        user: null,
        tenant: null,
        isAuthenticated: false,
        accessToken: null,
      };
    }

    // Verify authentication with backend
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Authentication verification failed");
    }

    const { user, tenant } = await response.json();

    return {
      user,
      tenant,
      isAuthenticated: true,
      accessToken,
    };
  } catch (error) {
    console.error("Auth context error:", error);
    return {
      user: null,
      tenant: null,
      isAuthenticated: false,
      accessToken: null,
    };
  }
}

export function createAuthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}
