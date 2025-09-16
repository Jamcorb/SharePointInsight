import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnSelector } from "./column-selector";
import { DataPreview } from "./data-preview";
import { UnionSchema } from "@/types/schema";
import { Columns, Filter, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportDesignerProps {
  unionSchema: UnionSchema | null;
  selectedColumns: string[];
  onSelectedColumnsChange: (columns: string[]) => void;
  previewData: any[];
  isLoading?: boolean;
  className?: string;
}

export function ReportDesigner({
  unionSchema,
  selectedColumns,
  onSelectedColumnsChange,
  previewData,
  isLoading = false,
  className,
}: ReportDesignerProps) {
  const [activeTab, setActiveTab] = useState("columns");

  const totalRows = previewData.length;
  const selectedColumnCount = selectedColumns.length;
  const totalColumnCount = unionSchema?.totalColumns || 0;

  return (
    <div className={cn("w-96 bg-card border-l border-border flex flex-col", className)}>
      <CardHeader className="p-6 border-b border-border">
        <CardTitle className="text-lg font-semibold">Report Designer</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure columns, filters, and export options
        </p>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border">
          <TabsList className="w-full grid grid-cols-3 h-auto p-0">
            <TabsTrigger 
              value="columns" 
              className="flex-1 px-4 py-3 text-sm font-medium data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              data-testid="tab-columns"
            >
              <Columns className="h-4 w-4 mr-2" />
              Columns
            </TabsTrigger>
            <TabsTrigger 
              value="filters" 
              className="flex-1 px-4 py-3 text-sm font-medium data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              data-testid="tab-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </TabsTrigger>
            <TabsTrigger 
              value="charts" 
              className="flex-1 px-4 py-3 text-sm font-medium data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              data-testid="tab-charts"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Charts
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="columns" className="h-full p-0 m-0">
            <ColumnSelector
              unionSchema={unionSchema}
              selectedColumns={selectedColumns}
              onSelectedColumnsChange={onSelectedColumnsChange}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="filters" className="h-full p-6 m-0">
            <div className="text-center text-muted-foreground py-8">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Filters coming soon</p>
              <p className="text-xs mt-1">
                Advanced filtering and search capabilities will be available in a future release
              </p>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="h-full p-6 m-0">
            <div className="text-center text-muted-foreground py-8">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Charts coming soon</p>
              <p className="text-xs mt-1">
                Data visualization and charting capabilities will be available in a future release
              </p>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Data Preview Section */}
      <div className="border-t border-border">
        <DataPreview
          data={previewData}
          columns={selectedColumns}
          totalRows={totalRows}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
