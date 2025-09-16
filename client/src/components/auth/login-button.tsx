import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, ChartBar } from "lucide-react";

interface LoginButtonProps {
  onLogin: () => void;
  isLoading: boolean;
}

export function LoginButton({ onLogin, isLoading }: LoginButtonProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-4">
          <ChartBar className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">SP Reports Hub</CardTitle>
        <CardDescription className="text-sm uppercase tracking-wide text-muted-foreground">
          SPLENS REPORTING
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          <p>Enterprise SharePoint reporting tool with drag-and-drop canvas for multi-site data collation and normalized exports.</p>
        </div>
        <Button
          onClick={onLogin}
          disabled={isLoading}
          className="w-full"
          size="lg"
          data-testid="button-login"
        >
          <Building className="mr-2 h-4 w-4" />
          {isLoading ? "Signing in..." : "Sign in with Microsoft"}
        </Button>
        <div className="text-xs text-center text-muted-foreground">
          <p>Requires SharePoint access permissions</p>
        </div>
      </CardContent>
    </Card>
  );
}
