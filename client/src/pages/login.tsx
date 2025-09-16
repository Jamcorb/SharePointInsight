import { useAuth } from "@/hooks/use-auth";
import { LoginButton } from "@/components/auth/login-button";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/builder");
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <LoginButton onLogin={handleLogin} isLoading={isLoading} />
      </div>
    </div>
  );
}
