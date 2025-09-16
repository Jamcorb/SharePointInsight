import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UnionSchema } from "@/types/schema";
import { Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DroppedSource {
  siteId: string;
  listId: string;
  siteTitle: string;
  listTitle: string;
  siteUrl: string;
  type: "list" | "library";
}

interface SchemaCoverageMatrixProps {
  schema: UnionSchema;
  sources: DroppedSource[];
  className?: string;
}

export function SchemaCoverageMatrix({ schema, sources, className }: SchemaCoverageMatrixProps) {
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "text":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "number":
      case "currency":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "datetime":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "boolean":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "choice":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "lookup":
      case "person":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "taxonomy":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 90) return "text-green-600 dark:text-green-400";
    if (coverage >= 50) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  // Display first 10 columns, sorted by coverage (descending)
  const displayColumns = schema.columns
    .slice()
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 10);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Schema Coverage Matrix</CardTitle>
        <p className="text-sm text-muted-foreground">
          Showing top {displayColumns.length} columns by coverage across {sources.length} sources
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-full">
            <table className="w-full text-sm" data-testid="table-schema-coverage">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium min-w-48">Column Name</th>
                  <th className="text-center py-3 px-3 font-medium">Type</th>
                  {sources.slice(0, 5).map((source, index) => (
                    <th 
                      key={`${source.siteId}:${source.listId}`}
                      className="text-center py-3 px-3 font-medium min-w-32"
                      data-testid={`header-source-${index}`}
                    >
                      <div className="truncate" title={`${source.siteTitle} / ${source.listTitle}`}>
                        {source.listTitle}
                      </div>
                      <div className="text-xs text-muted-foreground font-normal truncate">
                        {source.siteTitle}
                      </div>
                    </th>
                  ))}
                  {sources.length > 5 && (
                    <th className="text-center py-3 px-3 font-medium">
                      +{sources.length - 5} more
                    </th>
                  )}
                  <th className="text-center py-3 px-3 font-medium">Coverage</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {displayColumns.map((column, columnIndex) => {
                  const matrixRow = schema.coverageMatrix.matrix[
                    schema.columns.findIndex(c => c.displayName === column.displayName)
                  ] || [];

                  return (
                    <tr 
                      key={column.displayName}
                      className="border-b border-border/50 hover:bg-muted/50"
                      data-testid={`row-column-${columnIndex}`}
                    >
                      <td className="py-3 px-3 font-medium">
                        <div className="flex items-center space-x-2">
                          <span className="truncate" title={column.displayName}>
                            {column.displayName}
                          </span>
                          {column.typeConflicts.length > 0 && (
                            <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      
                      <td className="py-3 px-3 text-center">
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs px-2 py-1", getTypeColor(column.type))}
                        >
                          {column.type}
                        </Badge>
                      </td>
                      
                      {sources.slice(0, 5).map((source, sourceIndex) => {
                        const hasColumn = matrixRow[sourceIndex] || false;
                        return (
                          <td 
                            key={`${source.siteId}:${source.listId}`}
                            className="py-3 px-3 text-center"
                            data-testid={`cell-coverage-${columnIndex}-${sourceIndex}`}
                          >
                            {hasColumn ? (
                              <Check className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-red-500 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                      
                      {sources.length > 5 && (
                        <td className="py-3 px-3 text-center text-muted-foreground">
                          {column.sources.length - 5 > 0 ? `+${column.sources.length - 5}` : "—"}
                        </td>
                      )}
                      
                      <td className="py-3 px-3 text-center">
                        <span 
                          className={cn("font-medium", getCoverageColor(column.coverage))}
                          data-testid={`text-coverage-${columnIndex}`}
                        >
                          {column.coverage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {schema.columns.length > 10 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Showing {displayColumns.length} of {schema.columns.length} columns
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
