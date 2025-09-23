import { useState, useEffect, useCallback, useRef } from "react";
import { AuthContext, getAuthContext } from "@/lib/auth";
import { loginWithPopup, loginWithRedirect, logout as msalLogout, initializeMsal } from "@/lib/msal";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  // State hooks first
  const [authContext, setAuthContext] = useState<AuthContext>({
    user: null,
    tenant: null,
    isAuthenticated: false,
    accessToken: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Ref hooks next (prevent multiple concurrent operations)
  const authOperationInProgress = useRef(false);
  const contextRefreshInProgress = useRef(false);
  
  // Other hooks last
  const { toast } = useToast();

  const refreshAuthContext = useCallback(async () => {
    // Prevent multiple concurrent context refreshes
    if (contextRefreshInProgress.current) {
      console.log("🔒 [AUTH CONTEXT] Context refresh already in progress, skipping...");
      return;
    }
    
    contextRefreshInProgress.current = true;
    try {
      const context = await getAuthContext();
      setAuthContext(context);
    } catch (error) {
      console.error("Failed to refresh auth context:", error);
      setAuthContext({
        user: null,
        tenant: null,
        isAuthenticated: false,
        accessToken: null,
      });
    } finally {
      contextRefreshInProgress.current = false;
    }
  }, []);

  const login = useCallback(async () => {
    // Prevent multiple concurrent login attempts
    if (authOperationInProgress.current) {
      console.log("🔒 [AUTH] Authentication already in progress, ignoring additional login attempt");
      return;
    }

    const startRedirectLogin = async (reason: string) => {
      const redirectTimestamp = new Date().toISOString();
      console.warn(`[${redirectTimestamp}] 🔁 [LOGIN] Switching to redirect flow: ${reason}`);
      toast({
        title: "Redirecting to Microsoft",
        description: "We'll take you to Microsoft to finish signing in.",
      });

      authOperationInProgress.current = true;
      setIsLoading(true);

      try {
        await loginWithRedirect();
      } catch (redirectError: any) {
        console.error(`[${redirectTimestamp}] ❌ [LOGIN] Redirect login failed:`, {
          error: redirectError.message,
          errorCode: redirectError.errorCode,
          subError: redirectError.subError,
          correlationId: redirectError.correlationId
        });
        toast({
          title: "Sign in failed",
          description: redirectError.message || "Please try again",
          variant: "destructive",
        });
        throw redirectError;
      } finally {
        console.log(`[${redirectTimestamp}] 🏁 [LOGIN] Redirect flow completed`);
        authOperationInProgress.current = false;
        setIsLoading(false);
      }
    };

    const isInPopup = window.opener && window.opener !== window;
    const isEmbeddedFrame = window.self !== window.top;

    if (isInPopup) {
      await startRedirectLogin("application is running inside a popup window");
      return;
    }

    if (isEmbeddedFrame) {
      await startRedirectLogin("application is hosted inside an iframe or embedded canvas");
      return;
    }

    const timestamp = new Date().toISOString();
    let redirectFallbackReason: string | null = null;

    try {
      console.log(`[${timestamp}] 🚀 [LOGIN] Starting login process...`);
      authOperationInProgress.current = true;
      setIsLoading(true);

      const response = await loginWithPopup();

      if (response) {
        console.log(`[${timestamp}] ✅ [LOGIN] Authentication popup successful, account:`, {
          username: response.account?.username,
          tenantId: response.account?.tenantId
        });
        toast({
          title: "Signed in successfully",
          description: "Welcome to SP Reports Hub",
        });

        console.log(`[${timestamp}] 🔍 [LOGIN] Waiting 500ms then refreshing auth context...`);
        setTimeout(async () => {
          console.log(`[${new Date().toISOString()}] 🔄 [LOGIN] Refreshing authentication context...`);
          await refreshAuthContext();

          const currentPath = window.location.pathname;
          console.log(`[${new Date().toISOString()}] 🔍 [LOGIN] Current path: ${currentPath}`);
          if (currentPath === "/" || currentPath === "/login") {
            console.log(`[${new Date().toISOString()}] 📍 [LOGIN] Navigating to /builder...`);
            window.location.href = "/builder";
          }
        }, 500);
      } else {
        console.warn(`[${timestamp}] ⚠️ [LOGIN] Login response was null or undefined`);
      }
    } catch (error: any) {
      console.error(`[${timestamp}] ❌ [LOGIN] Login failed:`, {
        error: error.message,
        errorCode: error.errorCode,
        subError: error.subError,
        correlationId: error.correlationId
      });

      if (error?.errorCode === "block_nested_popups") {
        redirectFallbackReason = "MSAL blocked the popup because the browser detected an embedded context";
      } else if (error?.errorCode === "popup_window_error") {
        redirectFallbackReason = "the browser could not open the authentication popup";
      } else {
        toast({
          title: "Sign in failed",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    } finally {
      console.log(`[${timestamp}] 🏁 [LOGIN] Login process completed, setting loading to false`);
      authOperationInProgress.current = false;
      setIsLoading(false);
    }

    if (redirectFallbackReason) {
      await startRedirectLogin(redirectFallbackReason);
    }
  }, [toast, refreshAuthContext]);

  const logout = useCallback(async () => {
    try {
      await msalLogout();
      setAuthContext({
        user: null,
        tenant: null,
        isAuthenticated: false,
        accessToken: null,
      });
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    } catch (error: any) {
      console.error("Logout failed:", error);
      toast({
        title: "Sign out failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    async function initialize() {
      try {
        await initializeMsal();
        
        // Initialize authentication context (no redirect handling needed for popup flow)
        
        await refreshAuthContext();
      } catch (error) {
        console.error("MSAL initialization failed:", error);
        toast({
          title: "Sign in failed", 
          description: "Authentication initialization failed",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [refreshAuthContext, toast]);

  return {
    ...authContext,
    isLoading,
    login,
    logout,
    refreshAuthContext,
  };
}
