import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SharePointList, SharePointSite } from "@/types/sharepoint";
import { List, Folder, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceCardProps {
  site: SharePointSite;
  list: SharePointList;
  itemCount?: number;
  columnCount?: number;
  coverage?: number;
  isDragging?: boolean;
  className?: string;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function SourceCard({
  site,
  list,
  itemCount = 0,
  columnCount = 0,
  coverage = 0,
  isDragging = false,
  className,
  onDragStart,
  onDragEnd,
}: SourceCardProps) {
  const isLibrary = list.baseTemplate === 101;
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      siteId: site.id,
      listId: list.id,
      siteTitle: site.displayName,
      listTitle: list.displayName,
      siteUrl: site.webUrl,
      type: isLibrary ? "library" : "list",
    }));
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(e);
  };

  return (
    <Card
      className={cn(
        "source-card p-3 cursor-move border-border hover:border-primary/30 transition-all duration-140",
        isDragging && "opacity-50",
        className
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      data-testid={`card-source-${list.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {isLibrary ? (
            <Folder className="h-4 w-4 text-orange-500 flex-shrink-0" />
          ) : (
            <List className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" data-testid={`text-list-title-${list.id}`}>
              {list.displayName}
            </p>
            {list.description && (
              <p className="text-xs text-muted-foreground truncate">
                {list.description}
              </p>
            )}
          </div>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
      
      <div className="text-xs text-muted-foreground mb-2">
        <span className="capitalize">{isLibrary ? "Document Library" : "Custom List"}</span>
        {itemCount > 0 && (
          <>
            {" • "}
            <span data-testid={`text-item-count-${list.id}`}>
              {itemCount.toLocaleString()} items
            </span>
          </>
        )}
      </div>
      
      {columnCount > 0 && (
        <div className="flex items-center space-x-2">
          <div 
            className="coverage-indicator w-3 h-1.5 rounded-full"
            style={{ "--coverage": `${coverage}%` } as React.CSSProperties}
          />
          <span className="text-xs text-muted-foreground" data-testid={`text-column-count-${list.id}`}>
            {columnCount} columns
          </span>
          {coverage > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {coverage}%
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}
