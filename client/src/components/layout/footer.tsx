import { Building2, Code } from "lucide-react";
import { useState, useEffect } from "react";

interface FooterProps {
  version?: string;
}

export function Footer({ version }: FooterProps) {
  const [appVersion, setAppVersion] = useState(version || "1.0.0");

  useEffect(() => {
    if (!version) {
      // Fetch version from API if not provided
      fetch('/api/version')
        .then(res => res.json())
        .then(data => setAppVersion(data.version))
        .catch(() => setAppVersion("1.0.0")); // Fallback on error
    }
  }, [version]);
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>SPLENS Reporting Platform</span>
            </div>
            <div className="hidden sm:flex items-center space-x-1 text-xs">
              <span>•</span>
              <span>SharePoint Reports Hub</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1" data-testid="app-version">
            <Code className="h-3 w-3" />
            <span className="text-xs font-mono">v{appVersion}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}