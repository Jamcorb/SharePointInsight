import { SharePointList, SharePointSite } from "@/types/sharepoint";
import { useSources } from "@/hooks/use-sources";
import { SourceCard } from "./source-card";
import { Skeleton } from "@/components/ui/skeleton";

interface SourceCardWithMetadataProps {
  site: SharePointSite;
  list: SharePointList;
  accessToken: string;
  isDragging?: boolean;
  className?: string;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function SourceCardWithMetadata({
  site,
  list,
  accessToken,
  isDragging = false,
  className,
  onDragStart,
  onDragEnd,
}: SourceCardWithMetadataProps) {
  const { useListMetadata } = useSources({ accessToken });
  const { data: metadata, isLoading } = useListMetadata(site.id, list.id);

  if (isLoading) {
    return (
      <div className="p-3 border border-border rounded-lg">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  return (
    <SourceCard
      site={site}
      list={list}
      itemCount={metadata?.itemCount || 0}
      columnCount={metadata?.columnCount || 0}
      coverage={metadata?.columnCount ? Math.min(100, Math.max(60, metadata.columnCount * 4)) : 0}
      isDragging={isDragging}
      className={className}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  );
}