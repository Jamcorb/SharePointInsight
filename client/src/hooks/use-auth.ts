import { useState, useEffect, useCallback } from "react";
import { AuthContext, getAuthContext } from "@/lib/auth";
import { loginWithRedirect, logout as msalLogout, initializeMsal } from "@/lib/msal";
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
    try {
      setIsLoading(true);
      // Use redirect flow instead of popup for better SPA compatibility
      await loginWithRedirect();
      // Note: loginWithRedirect doesn't return - the page redirects to Azure AD
    } catch (error: any) {
      console.error("Login failed:", error);
      toast({
        title: "Sign in failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [toast]);

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
        
        // Handle redirect response after returning from Azure AD
        const { msalInstance } = await import("@/lib/msal");
        const response = await msalInstance.handleRedirectPromise();
        
        if (response) {
          console.log("✅ Authentication redirect successful");
          toast({
            title: "Signed in successfully",
            description: "Welcome to SP Reports Hub",
          });
          
          // Immediately redirect to builder after successful authentication
          // Don't wait for backend verification to prevent redirect delays
          if (window.location.pathname === "/" || window.location.pathname === "/login") {
            window.location.href = "/builder";
            return; // Exit early, don't continue with auth context refresh
          }
        }
        
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
