import { Building2, Code } from "lucide-react";

interface FooterProps {
  version?: string;
}

export function Footer({ version = "1.0.0" }: FooterProps) {
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
            <span className="text-xs font-mono">v{version}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}