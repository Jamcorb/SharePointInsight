import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createAuthHeaders } from "@/lib/auth";
import { UnionSchema, SchemaValidation, PreviewData, ReportConfig } from "@/types/schema";

interface UseSchemaProps {
  accessToken: string | null;
}

export function useSchema({ accessToken }: UseSchemaProps) {
  const queryClient = useQueryClient();

  // Generate union schema from sources
  const generateUnionSchema = useMutation({
    mutationFn: async (sources: Array<{ siteId: string; listId: string }>) => {
      if (!accessToken) throw new Error("No access token");
      
      const response = await fetch("/api/sources/schema", {
        method: "POST",
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({ sources }),
      });
      
      if (!response.ok) throw new Error("Failed to generate schema");
      
      const data = await response.json();
      return {
        schema: data.schema as UnionSchema,
        validation: data.validation as SchemaValidation,
      };
    },
    onSuccess: (data) => {
      // Cache the schema result
      queryClient.setQueryData(["schema", data.schema], data);
    },
  });

  // Generate report preview
  const generatePreview = useMutation({
    mutationFn: async (config: ReportConfig & { limit?: number }) => {
      if (!accessToken) throw new Error("No access token");
      
      const response = await fetch("/api/reports/preview", {
        method: "POST",
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify(config),
      });
      
      if (!response.ok) throw new Error("Failed to generate preview");
      
      const data = await response.json();
      return data as PreviewData;
    },
  });

  // Export report data
  const exportReport = useMutation({
    mutationFn: async (config: ReportConfig & { format?: "csv" | "xlsx"; includeSchema?: boolean }) => {
      if (!accessToken) throw new Error("No access token");
      
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify(config),
      });
      
      if (!response.ok) throw new Error("Failed to export report");
      
      // Handle file download
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
                      `sp-report-${Date.now()}.${config.format || "xlsx"}`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { filename, size: blob.size };
    },
  });

  return {
    generateUnionSchema,
    generatePreview,
    exportReport,
  };
}
