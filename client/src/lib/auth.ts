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
  console.log("🔍 Getting authentication context");
  
  if (!isAuthenticated()) {
    console.log("⚠️ User not authenticated");
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
      console.warn("⚠️ Failed to acquire access token");
      return {
        user: null,
        tenant: null,
        isAuthenticated: false,
        accessToken: null,
      };
    }

    console.log("✅ Access token acquired, verifying with backend");

    // Verify authentication with backend
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Authentication verification failed:", response.status, errorText);
      throw new Error(`Authentication verification failed: ${response.status}`);
    }

    const { user, tenant } = await response.json();
    console.log("✅ Authentication context verified successfully");

    return {
      user,
      tenant,
      isAuthenticated: true,
      accessToken,
    };
  } catch (error) {
    console.error("❌ Auth context error:", error);
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
