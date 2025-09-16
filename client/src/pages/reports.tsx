import { useAuth } from "@/hooks/use-auth";
import { TopNavigation } from "@/components/layout/top-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Users, BarChart } from "lucide-react";

export default function Reports() {
  const { user, tenant, logout } = useAuth();

  if (!user || !tenant) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNavigation
        user={user}
        tenant={tenant}
        onLogout={logout}
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Reports</h1>
            <p className="text-muted-foreground">
              Manage your saved reports and view execution history
            </p>
          </div>

          {/* Coming Soon Card */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <BarChart className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Reports Management</CardTitle>
              <CardDescription>
                Saved reports, scheduling, and execution history coming soon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 border border-border rounded-lg">
                  <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-medium text-sm">Saved Reports</h3>
                  <p className="text-xs text-muted-foreground">Save and reuse report configurations</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <Calendar className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-medium text-sm">Scheduling</h3>
                  <p className="text-xs text-muted-foreground">Automate report generation</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-medium text-sm">Sharing</h3>
                  <p className="text-xs text-muted-foreground">Share reports with teams</p>
                </div>
              </div>
              
              <div className="text-center">
                <Badge variant="secondary" className="mb-4">
                  MVP Feature
                </Badge>
                <p className="text-sm text-muted-foreground mb-4">
                  This feature is planned for a future release. For now, use the Report Builder 
                  to create and export reports on-demand.
                </p>
                <Button variant="outline" data-testid="button-back-to-builder">
                  <FileText className="h-4 w-4 mr-2" />
                  Back to Report Builder
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
