import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createAuthHeaders } from "@/lib/auth";
import { SharePointSite, SharePointList } from "@/types/sharepoint";
import { Source } from "@shared/schema";

interface UseSourcesProps {
  accessToken: string | null;
}

export function useSources({ accessToken }: UseSourcesProps) {
  const queryClient = useQueryClient();

  // Search SharePoint sites
  const useSearchSites = (query: string = "") => {
    const trimmedQuery = query.trim();

    return useQuery({
      queryKey: ["/api/sites", { query }],
      queryFn: async () => {
        if (trimmedQuery.length === 0) {
          return [];
        }

        if (!accessToken) throw new Error("No access token");

        const response = await fetch(`/api/sites?query=${encodeURIComponent(trimmedQuery)}`, {
          headers: createAuthHeaders(accessToken),
        });

        if (!response.ok) throw new Error("Failed to search sites");

        const data = await response.json();
        return data.sites as SharePointSite[];
      },
      enabled: !!accessToken && trimmedQuery.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Get lists in a site
  const useListsInSite = (siteId: string) => {
    return useQuery({
      queryKey: ["/api/sites", siteId, "lists"],
      queryFn: async () => {
        if (!accessToken) throw new Error("No access token");
        
        const response = await fetch(`/api/sites/${siteId}/lists`, {
          headers: createAuthHeaders(accessToken),
        });
        
        if (!response.ok) throw new Error("Failed to fetch lists");
        
        const data = await response.json();
        return data.lists as SharePointList[];
      },
      enabled: !!accessToken && !!siteId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Get list metadata
  const useListMetadata = (siteId: string, listId: string) => {
    return useQuery({
      queryKey: ["/api/sites", siteId, "lists", listId, "metadata"],
      queryFn: async () => {
        if (!accessToken) throw new Error("No access token");
        
        const response = await fetch(`/api/sites/${siteId}/lists/${listId}/metadata`, {
          headers: createAuthHeaders(accessToken),
        });
        
        if (!response.ok) throw new Error("Failed to fetch list metadata");
        
        const data = await response.json();
        return data as { itemCount: number; columnCount: number; columns: number };
      },
      enabled: !!accessToken && !!siteId && !!listId,
      staleTime: 10 * 60 * 1000, // 10 minutes - metadata changes infrequently
    });
  };

  // Get tenant sources
  const useTenantSources = () => {
    return useQuery({
      queryKey: ["/api/sources"],
      queryFn: async () => {
        if (!accessToken) throw new Error("No access token");
        
        const response = await fetch("/api/sources", {
          headers: createAuthHeaders(accessToken),
        });
        
        if (!response.ok) throw new Error("Failed to fetch sources");
        
        const data = await response.json();
        return data.sources as Source[];
      },
      enabled: !!accessToken,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  return {
    useSearchSites,
    useListsInSite,
    useListMetadata,
    useTenantSources,
  };
}
