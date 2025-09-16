import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createAuthHeaders } from "@/lib/auth";
import { Report } from "@shared/schema";

interface UseReportsProps {
  accessToken: string | null;
}

export function useReports({ accessToken }: UseReportsProps) {
  const queryClient = useQueryClient();

  // Get all reports for the current tenant
  const useReportsList = () => {
    return useQuery({
      queryKey: ["/api/reports"],
      queryFn: async () => {
        if (!accessToken) throw new Error("No access token");
        
        const response = await fetch("/api/reports", {
          headers: createAuthHeaders(accessToken),
        });
        
        if (!response.ok) throw new Error("Failed to fetch reports");
        
        const data = await response.json();
        return data.reports as Report[];
      },
      enabled: !!accessToken,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Get a specific report
  const useReport = (reportId: string) => {
    return useQuery({
      queryKey: ["/api/reports", reportId],
      queryFn: async () => {
        if (!accessToken) throw new Error("No access token");
        
        const response = await fetch(`/api/reports/${reportId}`, {
          headers: createAuthHeaders(accessToken),
        });
        
        if (!response.ok) throw new Error("Failed to fetch report");
        
        const data = await response.json();
        return data.report as Report;
      },
      enabled: !!accessToken && !!reportId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Create a new report
  const createReport = useMutation({
    mutationFn: async (reportData: {
      name: string;
      description?: string;
      configJson: any;
    }) => {
      if (!accessToken) throw new Error("No access token");
      
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify(reportData),
      });
      
      if (!response.ok) throw new Error("Failed to create report");
      
      const data = await response.json();
      return data.report as Report;
    },
    onSuccess: () => {
      // Invalidate and refetch reports list
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });

  // Update a report
  const updateReport = useMutation({
    mutationFn: async ({ 
      reportId, 
      updates 
    }: { 
      reportId: string; 
      updates: {
        name?: string;
        description?: string;
        configJson?: any;
      };
    }) => {
      if (!accessToken) throw new Error("No access token");
      
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PUT",
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error("Failed to update report");
      
      const data = await response.json();
      return data.report as Report;
    },
    onSuccess: (_, { reportId }) => {
      // Invalidate reports list and specific report
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports", reportId] });
    },
  });

  // Delete a report
  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      if (!accessToken) throw new Error("No access token");
      
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
        headers: createAuthHeaders(accessToken),
      });
      
      if (!response.ok) throw new Error("Failed to delete report");
      
      return true;
    },
    onSuccess: (_, reportId) => {
      // Invalidate reports list and remove specific report from cache
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.removeQueries({ queryKey: ["/api/reports", reportId] });
    },
  });

  return {
    useReportsList,
    useReport,
    createReport,
    updateReport,
    deleteReport,
  };
}