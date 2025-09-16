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
    try {
      setIsLoading(true);
      await loginWithPopup();
      await refreshAuthContext();
      
      toast({
        title: "Signed in successfully",
        description: "Welcome to SP Reports Hub",
      });
    } catch (error: any) {
      console.error("Login failed:", error);
      toast({
        title: "Sign in failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [refreshAuthContext, toast]);

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
        await refreshAuthContext();
      } catch (error) {
        console.error("MSAL initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [refreshAuthContext]);

  return {
    ...authContext,
    isLoading,
    login,
    logout,
    refreshAuthContext,
  };
}
