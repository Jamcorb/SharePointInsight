import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SourceCardWithMetadata } from "./source-card-with-metadata";
import { useSources } from "@/hooks/use-sources";
import { SharePointSite, SharePointList } from "@/types/sharepoint";
import { Search, Filter, List, Folder, Globe, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceBrowserProps {
  accessToken: string;
  className?: string;
}

interface SiteWithLists extends SharePointSite {
  lists?: SharePointList[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

export function SourceBrowser({ accessToken, className }: SourceBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>(["lists"]);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  
  const { useSearchSites, useListsInSite } = useSources({ accessToken });
  
  // Search sites based on query
  const { data: searchResults = [], isLoading: isSearching } = useSearchSites(searchQuery);
  
  // Group sites with their lists
  const sitesWithLists = useMemo(() => {
    const sites: SiteWithLists[] = [];
    
    searchResults.forEach(site => {
      const isExpanded = expandedSites.has(site.id);
      sites.push({
        ...site,
        lists: [],
        isExpanded,
        isLoading: false,
      });
    });
    
    return sites;
  }, [searchResults, expandedSites]);

  const toggleSiteExpanded = (siteId: string) => {
    setExpandedSites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(siteId)) {
        newSet.delete(siteId);
      } else {
        newSet.add(siteId);
      }
      return newSet;
    });
  };

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const getFilteredLists = (lists: SharePointList[]) => {
    return lists.filter(list => {
      const isLibrary = list.baseTemplate === 101;
      
      if (selectedFilters.includes("lists") && !isLibrary) return true;
      if (selectedFilters.includes("libraries") && isLibrary) return true;
      
      return false;
    });
  };

  return (
    <div className={cn("w-80 bg-card border-r border-border flex flex-col", className)}>
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold mb-4">SharePoint Sources</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search sites and lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-sources"
          />
        </div>

        {/* Filter Options */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedFilters.includes("lists") ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => toggleFilter("lists")}
            data-testid="filter-lists"
          >
            <List className="h-3 w-3 mr-1" />
            Lists
          </Badge>
          <Badge
            variant={selectedFilters.includes("libraries") ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => toggleFilter("libraries")}
            data-testid="filter-libraries"
          >
            <Folder className="h-3 w-3 mr-1" />
            Libraries
          </Badge>
          <Badge
            variant="secondary"
            className="cursor-pointer"
            data-testid="filter-templates"
          >
            <Filter className="h-3 w-3 mr-1" />
            Templates
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        {isSearching ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <div className="ml-6 space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : sitesWithLists.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery ? "No sites found" : "Start typing to search SharePoint sites"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sitesWithLists.map((site) => (
              <SiteSection
                key={site.id}
                site={site}
                isExpanded={site.isExpanded || false}
                onToggleExpanded={() => toggleSiteExpanded(site.id)}
                accessToken={accessToken}
                selectedFilters={selectedFilters}
                getFilteredLists={getFilteredLists}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface SiteSectionProps {
  site: SiteWithLists;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  accessToken: string;
  selectedFilters: string[];
  getFilteredLists: (lists: SharePointList[]) => SharePointList[];
}

function SiteSection({ 
  site, 
  isExpanded, 
  onToggleExpanded, 
  accessToken, 
  selectedFilters, 
  getFilteredLists 
}: SiteSectionProps) {
  const { useListsInSite } = useSources({ accessToken });
  const { data: lists = [], isLoading: isLoadingLists } = useListsInSite(
    isExpanded ? site.id : ""
  );

  const filteredLists = useMemo(() => getFilteredLists(lists), [lists, getFilteredLists]);
  const domain = new URL(site.webUrl).hostname;

  return (
    <div>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start p-0 h-auto"
            data-testid={`button-toggle-site-${site.id}`}
          >
            <div className="flex items-center text-sm font-medium text-foreground">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />
              )}
              <Globe className="h-4 w-4 mr-2 text-primary" />
              <div className="text-left flex-1 min-w-0">
                <div className="truncate" data-testid={`text-site-title-${site.id}`}>
                  {site.displayName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {domain}
                </div>
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="ml-6 mt-3 space-y-2">
            {isLoadingLists ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : filteredLists.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">
                No {selectedFilters.join(" or ")} found
              </div>
            ) : (
              filteredLists.map((list) => (
                <SourceCardWithMetadata
                  key={list.id}
                  site={site}
                  list={list}
                  accessToken={accessToken}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
