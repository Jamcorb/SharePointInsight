import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataPreviewProps {
  data: any[];
  columns: string[];
  totalRows: number;
  isLoading?: boolean;
  className?: string;
}

export function DataPreview({
  data,
  columns,
  totalRows,
  isLoading = false,
  className,
}: DataPreviewProps) {
  // Show first 3 columns for preview, or all if less than 3
  const previewColumns = columns.slice(0, 3);
  
  // Show first 5 rows for preview
  const previewData = data.slice(0, 5);

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }
    
    if (typeof value === "object") {
      // Handle lookup, person, taxonomy objects
      if (value.title || value.displayName || value.label) {
        return value.title || value.displayName || value.label;
      }
      return JSON.stringify(value);
    }
    
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    
    if (Array.isArray(value)) {
      return value.join("; ");
    }
    
    return String(value);
  };

  return (
    <div className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Data Preview</h3>
        <span className="text-xs text-muted-foreground" data-testid="text-preview-row-count">
          {totalRows.toLocaleString()} total rows
        </span>
      </div>
      
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center text-muted-foreground py-4">
          <Eye className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No data to preview</p>
          <p className="text-xs">Run a report to see data preview</p>
        </div>
      ) : (
        <>
          <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
            <ScrollArea className="max-h-40">
              <table className="w-full text-xs" data-testid="table-data-preview">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {previewColumns.map((column, index) => (
                      <th 
                        key={column}
                        className="text-left py-2 px-3 font-medium border-r border-border last:border-r-0"
                        data-testid={`header-preview-column-${index}`}
                      >
                        <div className="truncate" title={column}>
                          {column}
                        </div>
                      </th>
                    ))}
                    {columns.length > 3 && (
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                        +{columns.length - 3} more
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, rowIndex) => (
                    <tr 
                      key={rowIndex}
                      className="border-b border-border/50 last:border-b-0"
                      data-testid={`row-preview-${rowIndex}`}
                    >
                      {previewColumns.map((column, colIndex) => (
                        <td 
                          key={column}
                          className="py-2 px-3 border-r border-border/50 last:border-r-0"
                          data-testid={`cell-preview-${rowIndex}-${colIndex}`}
                        >
                          <div className="truncate max-w-32" title={formatCellValue(row[column])}>
                            {formatCellValue(row[column]) || (
                              <span className="text-muted-foreground italic">empty</span>
                            )}
                          </div>
                        </td>
                      ))}
                      {columns.length > 3 && (
                        <td className="py-2 px-3 text-muted-foreground">
                          ...
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
          
          {(data.length > 5 || columns.length > 3) && (
            <div className="mt-3 text-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                data-testid="button-view-full-preview"
              >
                <Eye className="h-3 w-3 mr-1" />
                View Full Preview
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
