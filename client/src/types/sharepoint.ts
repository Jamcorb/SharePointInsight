export interface SharePointSite {
  id: string;
  webUrl: string;
  displayName: string;
  description?: string;
}

export interface SharePointList {
  id: string;
  displayName: string;
  description?: string;
  baseTemplate: number;
  list?: {
    contentTypesEnabled: boolean;
    hidden: boolean;
    template: string;
  };
}

export interface SharePointColumn {
  id: string;
  name: string;
  displayName: string;
  columnGroup?: string;
  description?: string;
  type: string;
  required: boolean;
  indexed: boolean;
  hidden: boolean;
}

export interface SharePointListItem {
  id: string;
  webUrl?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  fields: Record<string, any>;
}

export interface SourceMetadata {
  sourceId: string;
  siteUrl: string;
  siteTitle: string;
  listTitle: string;
  listId: string;
}
