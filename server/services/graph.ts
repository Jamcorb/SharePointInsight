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
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    
    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => accessToken,
    };

    this.client = Client.initWithMiddleware({ authProvider });
  }

  private isTestMode(): boolean {
    return process.env.NODE_ENV === 'development' && this.accessToken === 'test-token-789';
  }

  private getMockSites(): SharePointSite[] {
    return [
      {
        id: "contoso.sharepoint.com,12345678-1234-1234-1234-123456789abc,87654321-4321-4321-4321-cba987654321",
        webUrl: "https://contoso.sharepoint.com/sites/TeamSite",
        displayName: "Team Collaboration Site",
        description: "Main collaboration site for the team"
      },
      {
        id: "contoso.sharepoint.com,abcdef12-3456-7890-abcd-ef1234567890,fedcba98-7654-3210-fedc-ba0987654321", 
        webUrl: "https://contoso.sharepoint.com/sites/ProjectAlpha",
        displayName: "Project Alpha",
        description: "Project Alpha documentation and resources"
      },
      {
        id: "contoso.sharepoint.com,98765432-1098-7654-3210-fedcba098765,13579246-8024-6801-3579-246801357924",
        webUrl: "https://contoso.sharepoint.com/sites/HRPortal", 
        displayName: "HR Portal",
        description: "Human Resources portal and documents"
      }
    ];
  }

  private getMockLists(siteId: string): SharePointList[] {
    return [
      {
        id: "12345678-1234-5678-9abc-123456789def",
        displayName: "Tasks",
        description: "Team task tracking list",
        baseTemplate: 107,
        list: {
          contentTypesEnabled: true,
          hidden: false,
          template: "genericList"
        }
      },
      {
        id: "87654321-4321-8765-dcba-987654321fed",
        displayName: "Documents",
        description: "Document library for team files",
        baseTemplate: 101,
        list: {
          contentTypesEnabled: false,
          hidden: false,
          template: "documentLibrary"
        }
      },
      {
        id: "abcdef12-5678-9012-3456-abcdef123456",
        displayName: "Announcements",
        description: "Team announcements and news",
        baseTemplate: 104,
        list: {
          contentTypesEnabled: true,
          hidden: false,
          template: "announcements"
        }
      }
    ];
  }

  async searchSites(query: string = ""): Promise<SharePointSite[]> {
    // Return mock data in test mode
    if (this.isTestMode()) {
      console.log("🧪 GraphService: Returning mock sites data");
      const mockSites = this.getMockSites();
      
      // Filter by query if provided
      if (query.trim()) {
        return mockSites.filter(site => 
          site.displayName.toLowerCase().includes(query.toLowerCase()) ||
          (site.description && site.description.toLowerCase().includes(query.toLowerCase()))
        );
      }
      
      return mockSites;
    }

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
    // Return mock data in test mode
    if (this.isTestMode()) {
      console.log("🧪 GraphService: Returning mock site data for", siteId);
      const mockSites = this.getMockSites();
      return mockSites.find(site => site.id === siteId) || mockSites[0];
    }

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
    // Return mock data in test mode
    if (this.isTestMode()) {
      console.log("🧪 GraphService: Returning mock lists data for", siteId);
      return this.getMockLists(siteId);
    }

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
