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
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly REQUEST_LIMIT = 200; // per minute
  private readonly RESET_INTERVAL = 60000; // 1 minute
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1 second

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    
    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => accessToken,
    };

    this.client = Client.initWithMiddleware({ authProvider });
  }

  /**
   * Smart throttling to prevent quota exhaustion
   */
  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    
    // Reset counter every minute
    if (now - this.lastResetTime > this.RESET_INTERVAL) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    // If approaching limit, add delay
    if (this.requestCount > this.REQUEST_LIMIT * 0.8) {
      const delay = Math.min(2000, (this.requestCount - this.REQUEST_LIMIT * 0.8) * 100);
      console.log(`⏱️ Throttling request, waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.requestCount++;
  }

  /**
   * Execute API request with retry logic and throttling
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.throttleRequest();
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a retryable error
        if (error.status === 429 || error.status >= 500) {
          const retryAfter = error.headers?.['retry-after'];
          const delay = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : this.BASE_DELAY * Math.pow(2, attempt - 1);
          
          if (attempt < this.MAX_RETRIES) {
            console.log(`🔄 ${context} failed (${error.status}), retrying in ${delay}ms (attempt ${attempt}/${this.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Non-retryable error or max retries exceeded
        break;
      }
    }
    
    const errorMessage = `❌ ${context} failed after ${this.MAX_RETRIES} attempts`;
    console.error(errorMessage, lastError);
    throw lastError || new Error(errorMessage);
  }




  async searchSites(query: string = ""): Promise<SharePointSite[]> {
    return this.executeWithRetry(async () => {
      console.log("🔍 Searching SharePoint sites with query:", query);
      
      let apiCall = this.client.api("/sites");
      
      if (query.trim()) {
        // Use search with query
        apiCall = apiCall.search(query);
      }
      
      const response = await apiCall
        .select("id,webUrl,displayName,description")
        .top(50)
        .get();

      console.log("✅ Successfully retrieved", response.value?.length || 0, "sites");
      return response.value || [];
    }, "Search SharePoint sites");
  }

  async getSiteById(siteId: string): Promise<SharePointSite | null> {
    try {
      return await this.executeWithRetry(async () => {
        console.log("🔍 Getting site by ID:", siteId);
        const site = await this.client
          .api(`/sites/${siteId}`)
          .select("id,webUrl,displayName,description")
          .get();

        console.log("✅ Successfully retrieved site:", site.displayName);
        return site;
      }, `Get site ${siteId}`);
    } catch (error) {
      console.error("❌ Error getting site:", error);
      return null;
    }
  }

  async getListsInSite(siteId: string): Promise<SharePointList[]> {
    return this.executeWithRetry(async () => {
      console.log("🔍 Getting lists for site:", siteId);
      const response = await this.client
        .api(`/sites/${siteId}/lists`)
        .select("id,displayName,description,baseTemplate,list")
        .filter("hidden eq false")
        .top(100)
        .get();

      console.log("✅ Successfully retrieved", response.value?.length || 0, "lists");
      return response.value || [];
    }, `Get lists for site ${siteId}`);
  }

  async getListColumns(siteId: string, listId: string): Promise<SharePointColumn[]> {
    return this.executeWithRetry(async () => {
      console.log("🔍 Getting columns for list:", listId, "in site:", siteId);
      const response = await this.client
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .select("id,name,displayName,columnGroup,description,required,indexed,hidden")
        .expand("columnDefinition")
        .top(200)
        .get();

      const columns = (response.value || []).map((col: any) => ({
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

      console.log("✅ Successfully retrieved", columns.length, "columns");
      return columns;
    }, `Get columns for list ${listId}`);
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
    return this.executeWithRetry(async () => {
      console.log("🔍 Getting list items for:", listId);
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
      
      console.log("✅ Successfully retrieved", response.value?.length || 0, "list items");
      return {
        items: response.value || [],
        hasMore: (response.value?.length || 0) === top,
      };
    }, `Get list items for ${listId}`);
  }

  async getListItemCount(siteId: string, listId: string): Promise<number> {
    try {
      return await this.executeWithRetry(async () => {
        console.log("🔍 Getting item count for list:", listId);
        const response = await this.client
          .api(`/sites/${siteId}/lists/${listId}`)
          .select("list")
          .get();

        const count = response.list?.itemCount || 0;
        console.log("✅ Item count:", count);
        return count;
      }, `Get item count for list ${listId}`);
    } catch (error) {
      console.error("❌ Error getting item count:", error);
      return 0;
    }
  }

  /**
   * Generate admin consent URL for enterprise access
   * Following SPLENS pattern for tenant admin permissions
   */
  generateAdminConsentUrl(tenantId?: string, redirectUri?: string): string | null {
    try {
      const clientId = process.env.VITE_AZURE_AD_CLIENT_ID;
      if (!clientId) {
        console.error("❌ Missing VITE_AZURE_AD_CLIENT_ID for admin consent URL");
        return null;
      }

      const tenant = tenantId || "common";
      const redirect = redirectUri || process.env.VITE_AZURE_AD_REDIRECT_URI || "http://localhost:5000/auth/callback";
      
      const scopes = [
        "https://graph.microsoft.com/Sites.Read.All",
        "https://graph.microsoft.com/Files.Read.All",
        "https://graph.microsoft.com/User.Read"
      ].join(" ");

      const consentUrl = `https://login.microsoftonline.com/${tenant}/adminconsent` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirect)}` +
        `&scope=${encodeURIComponent(scopes)}`;

      console.log("🔗 Generated admin consent URL for tenant:", tenant);
      return consentUrl;
    } catch (error) {
      console.error("❌ Failed to generate admin consent URL:", error);
      return null;
    }
  }

  /**
   * Extract tenant ID from current access token
   */
  getTenantId(): string | null {
    try {
      // Decode JWT token to get tenant ID
      const tokenPayload = JSON.parse(Buffer.from(this.accessToken.split('.')[1], 'base64').toString());
      return tokenPayload.tid || null;
    } catch (error) {
      console.error("❌ Failed to extract tenant ID from token:", error);
      return null;
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
