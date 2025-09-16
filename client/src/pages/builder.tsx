import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSchema } from "@/hooks/use-schema";
import { TopNavigation } from "@/components/layout/top-navigation";
import { SourceBrowser } from "@/components/sources/source-browser";
import { ReportCanvas } from "@/components/canvas/report-canvas";
import { ReportDesigner } from "@/components/designer/report-designer";
import { useToast } from "@/hooks/use-toast";
import { UnionSchema, ReportConfig } from "@/types/schema";

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

export default function Builder() {
  const { user, tenant, logout, accessToken } = useAuth();
  const { generateUnionSchema, generatePreview, exportReport } = useSchema({ accessToken });
  const { toast } = useToast();
  
  const [droppedSources, setDroppedSources] = useState<DroppedSource[]>([]);
  const [unionSchema, setUnionSchema] = useState<UnionSchema | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const handleSourceAdded = useCallback(async (source: DroppedSource) => {
    setDroppedSources(prev => [...prev, source]);
    
    // Auto-generate schema when sources are added
    const newSources = [...droppedSources, source];
    if (newSources.length > 0) {
      setIsGeneratingSchema(true);
      try {
        const schemaRequest = newSources.map(s => ({
          siteId: s.siteId,
          listId: s.listId,
        }));
        
        const result = await generateUnionSchema.mutateAsync(schemaRequest);
        setUnionSchema(result.schema);
        
        // Auto-select all columns with >50% coverage
        const highCoverageColumns = result.schema.columns
          .filter(col => col.coverage >= 50)
          .map(col => col.displayName);
        setSelectedColumns(highCoverageColumns);
        
        if (result.validation.warnings.length > 0) {
          toast({
            title: "Schema warnings",
            description: `${result.validation.warnings.length} warnings found in union schema`,
            variant: "default",
          });
        }
        
        toast({
          title: "Schema updated",
          description: `Union schema built with ${result.schema.totalColumns} columns`,
        });
      } catch (error) {
        console.error("Schema generation failed:", error);
        toast({
          title: "Schema generation failed",
          description: "Failed to build union schema",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingSchema(false);
      }
    }
  }, [droppedSources, generateUnionSchema, toast]);

  const handleSourceRemoved = useCallback(async (sourceId: string) => {
    setDroppedSources(prev => prev.filter(s => `${s.siteId}:${s.listId}` !== sourceId));
    
    // Regenerate schema if sources remain
    const remainingSources = droppedSources.filter(s => `${s.siteId}:${s.listId}` !== sourceId);
    if (remainingSources.length > 0) {
      setIsGeneratingSchema(true);
      try {
        const schemaRequest = remainingSources.map(s => ({
          siteId: s.siteId,
          listId: s.listId,
        }));
        
        const result = await generateUnionSchema.mutateAsync(schemaRequest);
        setUnionSchema(result.schema);
        
        // Update selected columns to only include available ones
        const availableColumns = result.schema.columns.map(col => col.displayName);
        setSelectedColumns(prev => prev.filter(col => availableColumns.includes(col)));
        
        toast({
          title: "Schema updated",
          description: `Union schema rebuilt with ${result.schema.totalColumns} columns`,
        });
      } catch (error) {
        console.error("Schema regeneration failed:", error);
      } finally {
        setIsGeneratingSchema(false);
      }
    } else {
      setUnionSchema(null);
      setSelectedColumns([]);
      setPreviewData([]);
    }
  }, [droppedSources, generateUnionSchema, toast]);

  const handleRunReport = useCallback(async () => {
    if (droppedSources.length === 0) {
      toast({
        title: "No sources selected",
        description: "Add sources to the canvas before running a report",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPreview(true);
    try {
      const sourceIds = droppedSources.map(s => `${s.siteId}:${s.listId}`);
      const config: ReportConfig = {
        sources: sourceIds,
        columns: selectedColumns.length > 0 ? selectedColumns : undefined,
        filters: {},
      };

      const result = await generatePreview.mutateAsync({ ...config, limit: 1000 });
      setPreviewData(result.data);
      
      toast({
        title: "Report generated",
        description: `Preview showing ${result.data.length} rows`,
      });
    } catch (error) {
      console.error("Report generation failed:", error);
      toast({
        title: "Report generation failed",
        description: "Failed to generate report preview",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [droppedSources, selectedColumns, generatePreview, toast]);

  const handleExport = useCallback(async () => {
    if (droppedSources.length === 0) {
      toast({
        title: "No sources selected",
        description: "Add sources to the canvas before exporting",
        variant: "destructive",
      });
      return;
    }

    try {
      const sourceIds = droppedSources.map(s => `${s.siteId}:${s.listId}`);
      const config: ReportConfig = {
        sources: sourceIds,
        columns: selectedColumns.length > 0 ? selectedColumns : undefined,
        filters: {},
      };

      await exportReport.mutateAsync({ 
        ...config, 
        format: "xlsx",
        includeSchema: true,
      });
      
      toast({
        title: "Export started",
        description: "Your report is being exported",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  }, [droppedSources, selectedColumns, exportReport, toast]);

  const handleSaveView = useCallback(() => {
    toast({
      title: "Save view",
      description: "Saved view functionality coming soon",
    });
  }, [toast]);

  if (!user || !tenant || !accessToken) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNavigation
        user={user}
        tenant={tenant}
        onSaveView={handleSaveView}
        onRunReport={handleRunReport}
        onExport={handleExport}
        onLogout={logout}
        isLoading={isGeneratingSchema || isGeneratingPreview || exportReport.isPending}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <SourceBrowser accessToken={accessToken} />
        
        <ReportCanvas
          droppedSources={droppedSources}
          onSourceAdded={handleSourceAdded}
          onSourceRemoved={handleSourceRemoved}
          unionSchema={unionSchema}
        />
        
        <ReportDesigner
          unionSchema={unionSchema}
          selectedColumns={selectedColumns}
          onSelectedColumnsChange={setSelectedColumns}
          previewData={previewData}
          isLoading={isGeneratingSchema || isGeneratingPreview}
        />
      </div>
    </div>
  );
}
