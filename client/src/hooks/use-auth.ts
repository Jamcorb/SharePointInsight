import { useState, useEffect, useCallback } from "react";
import { AuthContext, getAuthContext } from "@/lib/auth";
import { loginWithPopup, logout as msalLogout, initializeMsal } from "@/lib/msal";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const [authContext, setAuthContext] = useState<AuthContext>({
    user: null,
    tenant: null,
    isAuthenticated: false,
    accessToken: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refreshAuthContext = useCallback(async () => {
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
    }
  }, []);

  const login = useCallback(async () => {
    const timestamp = new Date().toISOString();
    try {
      console.log(`[${timestamp}] 🚀 [LOGIN] Starting login process...`);
      setIsLoading(true);
      // Use popup flow for better SPA experience - preserves application state
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
        
        // Wait a moment for tokens to be available, then refresh auth context
        console.log(`[${timestamp}] 🔍 [LOGIN] Waiting 500ms then refreshing auth context...`);
        setTimeout(async () => {
          console.log(`[${new Date().toISOString()}] 🔄 [LOGIN] Refreshing authentication context...`);
          await refreshAuthContext();
          
          // Navigate to builder if on login page
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
      toast({
        title: "Sign in failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      console.log(`[${timestamp}] 🏁 [LOGIN] Login process completed, setting loading to false`);
      setIsLoading(false);
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
