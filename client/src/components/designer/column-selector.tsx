import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UnionSchema } from "@/types/schema";
import { Plus, Download, GripVertical, Pin, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnSelectorProps {
  unionSchema: UnionSchema | null;
  selectedColumns: string[];
  onSelectedColumnsChange: (columns: string[]) => void;
  isLoading?: boolean;
}

export function ColumnSelector({
  unionSchema,
  selectedColumns,
  onSelectedColumnsChange,
  isLoading = false,
}: ColumnSelectorProps) {
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set());

  const sortedColumns = useMemo(() => {
    if (!unionSchema) return [];
    
    // Sort by: pinned first, then by coverage (desc), then by name
    return unionSchema.columns.slice().sort((a, b) => {
      const aIsPinned = pinnedColumns.has(a.displayName);
      const bIsPinned = pinnedColumns.has(b.displayName);
      
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;
      
      if (b.coverage !== a.coverage) {
        return b.coverage - a.coverage;
      }
      
      return a.displayName.localeCompare(b.displayName);
    });
  }, [unionSchema, pinnedColumns]);

  const handleColumnToggle = (columnName: string) => {
    const newSelection = selectedColumns.includes(columnName)
      ? selectedColumns.filter(c => c !== columnName)
      : [...selectedColumns, columnName];
    
    onSelectedColumnsChange(newSelection);
  };

  const handleSelectAll = () => {
    if (!unionSchema) return;
    
    const allColumns = unionSchema.columns.map(col => col.displayName);
    onSelectedColumnsChange(allColumns);
  };

  const handleSelectNone = () => {
    onSelectedColumnsChange([]);
  };

  const handlePinToggle = (columnName: string) => {
    const newPinned = new Set(pinnedColumns);
    if (newPinned.has(columnName)) {
      newPinned.delete(columnName);
    } else {
      newPinned.add(columnName);
    }
    setPinnedColumns(newPinned);
  };

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
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getCoverageIndicatorStyle = (coverage: number) => {
    return { "--coverage": `${coverage}%` } as React.CSSProperties;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!unionSchema) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <div className="py-8">
          <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Add sources to see columns</p>
        </div>
      </div>
    );
  }

  const selectedCount = selectedColumns.length;
  const totalCount = unionSchema.totalColumns;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" data-testid="text-column-selection-count">
            Selected Columns ({selectedCount}/{totalCount})
          </span>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
              data-testid="button-select-all-columns"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectNone}
              className="text-xs"
              data-testid="button-select-no-columns"
            >
              None
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-2">
          {sortedColumns.map((column, index) => {
            const isSelected = selectedColumns.includes(column.displayName);
            const isPinned = pinnedColumns.has(column.displayName);
            const hasLowCoverage = column.coverage < 50;
            const hasTypeConflicts = column.typeConflicts.length > 0;

            return (
              <div
                key={column.displayName}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  isSelected ? "bg-muted/50 border-border" : "bg-muted/30 border-border border-dashed",
                  hasLowCoverage && "bg-red-50 dark:bg-red-950/20"
                )}
                data-testid={`column-item-${index}`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleColumnToggle(column.displayName)}
                    className="flex-shrink-0"
                    data-testid={`checkbox-column-${index}`}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span 
                        className="text-sm font-medium truncate"
                        title={column.displayName}
                        data-testid={`text-column-name-${index}`}
                      >
                        {column.displayName}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs px-1.5 py-0.5 flex-shrink-0", getTypeColor(column.type))}
                      >
                        {column.type}
                      </Badge>
                      {hasTypeConflicts && (
                        <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div 
                        className="coverage-indicator w-2 h-2 rounded-full flex-shrink-0"
                        style={getCoverageIndicatorStyle(column.coverage)}
                      />
                      <span 
                        className={cn(
                          "text-xs",
                          hasLowCoverage ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                        )}
                        data-testid={`text-column-coverage-${index}`}
                      >
                        {column.coverage}% coverage
                      </span>
                      {hasLowCoverage && (
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          Low
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handlePinToggle(column.displayName)}
                    data-testid={`button-pin-column-${index}`}
                  >
                    <Pin className={cn("h-3 w-3", isPinned && "fill-current")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 cursor-grab"
                    data-testid={`button-drag-column-${index}`}
                  >
                    <GripVertical className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-6 border-t border-border">
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            data-testid="button-add-derived-column"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Derived Column
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            data-testid="button-export-schema"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Schema
          </Button>
        </div>
      </div>
    </div>
  );
}
