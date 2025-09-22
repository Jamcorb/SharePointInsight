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
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔍 [AUTH CONTEXT] Starting authentication context retrieval...`);
  
  console.log(`[${timestamp}] 🔍 [AUTH CONTEXT] Checking if user is authenticated...`);
  if (!isAuthenticated()) {
    console.log(`[${timestamp}] ⚠️ [AUTH CONTEXT] User not authenticated - returning null context`);
    return {
      user: null,
      tenant: null,
      isAuthenticated: false,
      accessToken: null,
    };
  }

  try {
    console.log(`[${timestamp}] 🔍 [AUTH CONTEXT] User is authenticated, attempting silent token acquisition...`);
    const accessToken = await getAccessTokenSilent();
    if (!accessToken) {
      console.warn(`[${timestamp}] ⚠️ [AUTH CONTEXT] Failed to acquire access token silently`);
      return {
        user: null,
        tenant: null,
        isAuthenticated: false,
        accessToken: null,
      };
    }

    console.log(`[${timestamp}] ✅ [AUTH CONTEXT] Access token acquired, verifying with backend...`);

    // Verify authentication with backend
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${accessToken.substring(0, 20)}...(truncated)`,
      },
    });

    console.log(`[${timestamp}] 🔍 [AUTH CONTEXT] Backend response status: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${timestamp}] ❌ [AUTH CONTEXT] Authentication verification failed:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Authentication verification failed: ${response.status}`);
    }

    const { user, tenant } = await response.json();
    console.log(`[${timestamp}] ✅ [AUTH CONTEXT] Authentication context verified successfully:`, {
      user: { id: user.id, upn: user.upn, tenantId: user.tenantId },
      tenant: { id: tenant.id, name: tenant.name, domain: tenant.domain }
    });

    return {
      user,
      tenant,
      isAuthenticated: true,
      accessToken,
    };
  } catch (error) {
    console.error(`[${timestamp}] ❌ [AUTH CONTEXT] Auth context error:`, error);
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
