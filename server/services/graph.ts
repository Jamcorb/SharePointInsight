import { Client } from "@microsoft/microsoft-graph-client";
import { AuthenticationProvider } from "@microsoft/microsoft-graph-client";

interface SharePointSite {
  id: string;
  webUrl: string;
  displayName: string;
  description?: string;
}

interface SharePointList {
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

interface SharePointColumn {
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

interface SharePointListItem {
  id: string;
  webUrl?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  fields: Record<string, any>;
}

export class GraphService {
  private client: Client;

  constructor(accessToken: string) {
    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => accessToken,
    };

    this.client = Client.initWithMiddleware({ authProvider });
  }

  async searchSites(query: string = ""): Promise<SharePointSite[]> {
    try {
      const response = await this.client
        .api("/sites")
        .search(query)
        .select("id,webUrl,displayName,description")
        .top(50)
        .get();

      return response.value || [];
    } catch (error) {
      console.error("Error searching sites:", error);
      throw new Error("Failed to search SharePoint sites");
    }
  }

  async getSiteById(siteId: string): Promise<SharePointSite | null> {
    try {
      const site = await this.client
        .api(`/sites/${siteId}`)
        .select("id,webUrl,displayName,description")
        .get();

      return site;
    } catch (error) {
      console.error("Error getting site:", error);
      return null;
    }
  }

  async getListsInSite(siteId: string): Promise<SharePointList[]> {
    try {
      const response = await this.client
        .api(`/sites/${siteId}/lists`)
        .select("id,displayName,description,baseTemplate,list")
        .filter("hidden eq false")
        .top(100)
        .get();

      return response.value || [];
    } catch (error) {
      console.error("Error getting lists:", error);
      throw new Error("Failed to get SharePoint lists");
    }
  }

  async getListColumns(siteId: string, listId: string): Promise<SharePointColumn[]> {
    try {
      const response = await this.client
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .select("id,name,displayName,columnGroup,description,required,indexed,hidden")
        .expand("columnDefinition")
        .top(200)
        .get();

      return (response.value || []).map((col: any) => ({
        id: col.id,
        name: col.name,
        displayName: col.displayName,
        columnGroup: col.columnGroup,
        description: col.description,
        type: this.getColumnType(col),
        required: col.required || false,
        indexed: col.indexed || false,
        hidden: col.hidden || false,
      }));
    } catch (error) {
      console.error("Error getting columns:", error);
      throw new Error("Failed to get list columns");
    }
  }

  async getListItems(
    siteId: string,
    listId: string,
    options: {
      select?: string[];
      filter?: string;
      orderBy?: string;
      top?: number;
      skip?: number;
    } = {}
  ): Promise<{ items: SharePointListItem[]; hasMore: boolean }> {
    try {
      let query = this.client.api(`/sites/${siteId}/lists/${listId}/items`);

      if (options.select) {
        query = query.select(options.select.join(","));
      }

      if (options.filter) {
        query = query.filter(options.filter);
      }

      if (options.orderBy) {
        query = query.orderby(options.orderBy);
      }

      const top = options.top || 200;
      query = query.top(top);

      if (options.skip) {
        query = query.skip(options.skip);
      }

      query = query.expand("fields");

      const response = await query.get();
      
      return {
        items: response.value || [],
        hasMore: (response.value?.length || 0) === top,
      };
    } catch (error) {
      console.error("Error getting list items:", error);
      throw new Error("Failed to get list items");
    }
  }

  async getListItemCount(siteId: string, listId: string): Promise<number> {
    try {
      const response = await this.client
        .api(`/sites/${siteId}/lists/${listId}`)
        .select("list")
        .get();

      return response.list?.itemCount || 0;
    } catch (error) {
      console.error("Error getting item count:", error);
      return 0;
    }
  }

  private getColumnType(column: any): string {
    if (column.text) return "text";
    if (column.number) return "number";
    if (column.currency) return "currency";
    if (column.dateTime) return "dateTime";
    if (column.boolean) return "boolean";
    if (column.choice) return "choice";
    if (column.lookup) return "lookup";
    if (column.personOrGroup) return "person";
    if (column.calculated) return "calculated";
    if (column.term) return "taxonomy";
    if (column.hyperlinkOrPicture) return "url";
    return "unknown";
  }
}

export async function createGraphService(accessToken: string): Promise<GraphService> {
  return new GraphService(accessToken);
}
