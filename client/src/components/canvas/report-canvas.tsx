import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchemaCoverageMatrix } from "./schema-coverage-matrix";
import { Plus, Database, Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DroppedSource {
  siteId: string;
  listId: string;
  siteTitle: string;
  listTitle: string;
  siteUrl: string;
  type: "list" | "library";
  itemCount?: number;
  coverage?: number;
  uniqueColumns?: number;
}

interface ReportCanvasProps {
  droppedSources: DroppedSource[];
  onSourceAdded: (source: DroppedSource) => void;
  onSourceRemoved: (sourceId: string) => void;
  unionSchema?: any;
  className?: string;
}

export function ReportCanvas({
  droppedSources,
  onSourceAdded,
  onSourceRemoved,
  unionSchema,
  className,
}: ReportCanvasProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const sourceData = JSON.parse(e.dataTransfer.getData("application/json"));
      
      // Check if source already exists
      const sourceId = `${sourceData.siteId}:${sourceData.listId}`;
      const exists = droppedSources.some(s => `${s.siteId}:${s.listId}` === sourceId);
      
      if (!exists) {
        onSourceAdded({
          ...sourceData,
          // Mock data - in real app, this would come from the API
          itemCount: Math.floor(Math.random() * 5000) + 100,
          coverage: Math.floor(Math.random() * 40) + 60,
          uniqueColumns: Math.floor(Math.random() * 10) + 1,
        });
      }
    } catch (error) {
      console.error("Failed to parse dropped data:", error);
    }
  }, [droppedSources, onSourceAdded]);

  const removeSource = (sourceId: string) => {
    onSourceRemoved(sourceId);
  };

  const totalColumns = unionSchema?.totalColumns || 0;
  const totalSources = droppedSources.length;

  return (
    <div className={cn("flex-1 flex flex-col bg-background", className)}>
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Report Builder Canvas</h2>
            <p className="text-sm text-muted-foreground">
              Drag sources from the left panel to build your unified report
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {totalColumns > 0 && (
              <Badge variant="outline" className="schema-badge">
                <Database className="h-3 w-3 mr-1" />
                Union Schema: {totalColumns} columns
              </Badge>
            )}
            {totalSources > 0 && (
              <Badge variant="secondary">
                <Layers className="h-3 w-3 mr-1" />
                {totalSources} sources
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        {/* Drop Zone */}
        <div
          className={cn(
            "drag-zone min-h-32 border-2 border-dashed border-border rounded-2xl p-6 mb-6 bg-muted/30 transition-all duration-150",
            isDragOver && "drag-over border-primary bg-primary/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid="drop-zone-canvas"
        >
          {droppedSources.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Drop SharePoint sources here to include them in your report
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {droppedSources.map((source) => (
                  <SourceCard
                    key={`${source.siteId}:${source.listId}`}
                    source={source}
                    onRemove={() => removeSource(`${source.siteId}:${source.listId}`)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Schema Coverage Matrix */}
        {unionSchema && droppedSources.length > 0 && (
          <SchemaCoverageMatrix
            schema={unionSchema}
            sources={droppedSources}
          />
        )}
      </div>
    </div>
  );
}

interface SourceCardProps {
  source: DroppedSource;
  onRemove: () => void;
}

function SourceCard({ source, onRemove }: SourceCardProps) {
  const isLibrary = source.type === "library";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isLibrary ? "bg-orange-500" : "bg-primary"
            )} />
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm truncate" data-testid={`text-dropped-source-title-${source.listId}`}>
                {source.listTitle}
              </h4>
              <p className="text-xs text-muted-foreground truncate">
                {source.siteTitle}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            data-testid={`button-remove-source-${source.listId}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Items:</span>
            <span className="font-medium" data-testid={`text-source-item-count-${source.listId}`}>
              {source.itemCount?.toLocaleString() || 0}
            </span>
          </div>
          
          {source.coverage && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Schema Coverage:</span>
              <span className="font-medium text-primary">
                {source.coverage}%
              </span>
            </div>
          )}
          
          {source.uniqueColumns && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Unique Columns:</span>
              <span className="font-medium">
                {source.uniqueColumns}
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
