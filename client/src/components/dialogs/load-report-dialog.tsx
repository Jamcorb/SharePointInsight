import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Report } from "@shared/schema";
import { Search, Calendar, FileText, Trash2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface LoadReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: Report[];
  isLoading?: boolean;
  onLoadReport: (report: Report) => void;
  onDeleteReport?: (reportId: string) => void;
  isDeleting?: boolean;
}

export function LoadReportDialog({
  open,
  onOpenChange,
  reports = [],
  isLoading = false,
  onLoadReport,
  onDeleteReport,
  isDeleting = false,
}: LoadReportDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const filteredReports = reports.filter(report => 
    report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (report.description && report.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleLoadReport = () => {
    if (selectedReport) {
      onLoadReport(selectedReport);
      onOpenChange(false);
      setSelectedReport(null);
    }
  };

  const handleDeleteReport = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteReport) {
      onDeleteReport(reportId);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedReport(null);
      setSearchQuery("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Load Saved Report</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-reports"
            />
          </div>

          {/* Reports List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="w-full">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4 mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? "No reports found matching your search" : "No saved reports yet"}
                </p>
                <p className="text-xs mt-1">
                  {!searchQuery && "Create and save a report to see it here"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <Card
                    key={report.id}
                    className={cn(
                      "cursor-pointer border-border hover:border-primary/30 transition-all duration-150",
                      selectedReport?.id === report.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedReport(report)}
                    data-testid={`card-report-${report.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate" data-testid={`text-report-name-${report.id}`}>
                            {report.name}
                          </CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDistanceToNow(new Date(report.updatedAt), { addSuffix: true })}
                            </Badge>
                          </div>
                        </div>
                        {onDeleteReport && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => handleDeleteReport(report.id, e)}
                            disabled={isDeleting}
                            data-testid={`button-delete-report-${report.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    {report.description && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {report.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                data-testid="button-cancel-load"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLoadReport}
                disabled={!selectedReport}
                data-testid="button-load-report"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Load Report
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}