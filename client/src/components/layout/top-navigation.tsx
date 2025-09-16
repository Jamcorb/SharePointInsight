import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AuthUser, AuthTenant } from "@/lib/auth";
import { ChartBar, Building, Save, Play, Download, ChevronDown, User, LogOut, FolderOpen, FileText } from "lucide-react";

interface TopNavigationProps {
  user: AuthUser;
  tenant: AuthTenant;
  currentReportName?: string;
  onSaveView?: () => void;
  onLoadReport?: () => void;
  onRunReport?: () => void;
  onExport?: () => void;
  onLogout: () => void;
  isLoading?: boolean;
}

export function TopNavigation({ 
  user, 
  tenant, 
  currentReportName,
  onSaveView, 
  onLoadReport,
  onRunReport, 
  onExport, 
  onLogout,
  isLoading = false,
}: TopNavigationProps) {
  const userInitials = user.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChartBar className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">SP Reports Hub</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">SPLENS REPORTING</p>
            </div>
          </div>
          
          {/* Current Report Display */}
          {currentReportName && (
            <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800" data-testid="current-report-display">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{currentReportName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Tenant Switcher */}
          <div className="flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg" data-testid="tenant-display">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{tenant.name}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {onLoadReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadReport}
                disabled={isLoading}
                data-testid="button-load-report"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Load
              </Button>
            )}
            
            {onSaveView && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onSaveView}
                disabled={isLoading}
                data-testid="button-save-view"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
            
            {onRunReport && (
              <Button
                size="sm"
                onClick={onRunReport}
                disabled={isLoading}
                data-testid="button-run-report"
              >
                <Play className="h-4 w-4 mr-2" />
                Run Report
              </Button>
            )}
            
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={isLoading}
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-2" data-testid="button-user-menu">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium" data-testid="text-user-name">{user.name}</p>
                <p className="text-xs text-muted-foreground" data-testid="text-user-email">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
