import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, validateTenant, type AuthenticatedRequest } from "./services/auth";
import { createGraphService } from "./services/graph";
import { SchemaService } from "./services/schema";
import { ExportService } from "./services/export";
import { z } from "zod";

// Validation schemas
const searchSitesSchema = z.object({
  query: z.string().optional(),
});

const sourceSchemaRequestSchema = z.object({
  sources: z.array(z.object({
    siteId: z.string(),
    listId: z.string(),
  })),
});

const reportPreviewSchema = z.object({
  sources: z.array(z.string()), // source IDs
  columns: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  limit: z.number().min(1).max(10000).default(1000),
});

const exportRequestSchema = z.object({
  reportId: z.string().optional(),
  sources: z.array(z.string()),
  columns: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  format: z.enum(["csv", "xlsx"]).default("xlsx"),
  includeSchema: z.boolean().default(true),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint (no auth required)
  app.get("/api/health", async (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development" 
    });
  });

  // Authentication check endpoint
  app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    res.json({
      user: req.user,
      tenant: req.tenant,
    });
  });

  // Sites discovery
  app.get("/api/sites", requireAuth, validateTenant, async (req: AuthenticatedRequest, res) => {
    try {
      const { query } = searchSitesSchema.parse(req.query);
      const accessToken = req.headers.authorization?.split(" ")[1];
      
      if (!accessToken) {
        return res.status(401).json({ error: "Access token required" });
      }

      const graphService = await createGraphService(accessToken);
      const sites = await graphService.searchSites(query);
      
      res.json({ sites });
    } catch (error) {
      console.error("Sites search error:", error);
      res.status(500).json({ error: "Failed to search sites" });
    }
  });

  // Lists in site
  app.get("/api/sites/:siteId/lists", requireAuth, validateTenant, async (req: AuthenticatedRequest, res) => {
    try {
      const { siteId } = req.params;
      const accessToken = req.headers.authorization?.split(" ")[1];
      
      if (!accessToken) {
        return res.status(401).json({ error: "Access token required" });
      }

      const graphService = await createGraphService(accessToken);
      const lists = await graphService.getListsInSite(siteId);
      
      res.json({ lists });
    } catch (error) {
      console.error("Lists fetch error:", error);
      res.status(500).json({ error: "Failed to fetch lists" });
    }
  });

  // Union schema generation
  app.post("/api/sources/schema", requireAuth, validateTenant, async (req: AuthenticatedRequest, res) => {
    try {
      const { sources } = sourceSchemaRequestSchema.parse(req.body);
      const accessToken = req.headers.authorization?.split(" ")[1];
      
      if (!accessToken) {
        return res.status(401).json({ error: "Access token required" });
      }

      const graphService = await createGraphService(accessToken);
      const sourceColumns: any[] = [];

      // Fetch columns for each source
      for (const source of sources) {
        try {
          const site = await graphService.getSiteById(source.siteId);
          const lists = await graphService.getListsInSite(source.siteId);
          const list = lists.find(l => l.id === source.listId);
          const columns = await graphService.getListColumns(source.siteId, source.listId);
          const itemCount = await graphService.getListItemCount(source.siteId, source.listId);

          if (site && list) {
            // Store or update source in database
            const existingSource = await storage.getSourcesByTenant(req.tenant!.id);
            const existing = existingSource.find(s => s.siteId === source.siteId && s.listId === source.listId);

            if (!existing) {
              await storage.createSource({
                tenantId: req.tenant!.id,
                siteId: source.siteId,
                siteUrl: site.webUrl,
                siteTitle: site.displayName,
                listId: source.listId,
                listTitle: list.displayName,
                type: list.baseTemplate === 101 ? "library" : "list",
                itemCount,
                columns: columns,
              });
            }

            // Add columns to collection
            columns.forEach(col => {
              sourceColumns.push({
                ...col,
                sourceId: `${source.siteId}:${source.listId}`,
                sourceName: `${site.displayName} / ${list.displayName}`,
              });
            });
          }
        } catch (sourceError) {
          console.error(`Error processing source ${source.siteId}:${source.listId}:`, sourceError);
          // Continue with other sources
        }
      }

      const unionSchema = SchemaService.buildUnionSchema(sourceColumns);
      const validation = SchemaService.validateColumnTypes(unionSchema);

      res.json({
        schema: unionSchema,
        validation,
      });
    } catch (error) {
      console.error("Schema generation error:", error);
      res.status(500).json({ error: "Failed to generate union schema" });
    }
  });

  // Report preview
  app.post("/api/reports/preview", requireAuth, validateTenant, async (req: AuthenticatedRequest, res) => {
    try {
      const { sources: sourceIds, columns, filters, limit } = reportPreviewSchema.parse(req.body);
      const accessToken = req.headers.authorization?.split(" ")[1];
      
      if (!accessToken) {
        return res.status(401).json({ error: "Access token required" });
      }

      const graphService = await createGraphService(accessToken);
      const sources = await storage.getSourcesByTenant(req.tenant!.id);
      const selectedSources = sources.filter(s => sourceIds.includes(s.id));

      if (selectedSources.length === 0) {
        return res.status(400).json({ error: "No valid sources found" });
      }

      // Build union schema for selected sources
      const sourceColumns: any[] = [];
      selectedSources.forEach(source => {
        if (Array.isArray(source.columns)) {
          source.columns.forEach((col: any) => {
            sourceColumns.push({
              ...col,
              sourceId: source.id,
              sourceName: `${source.siteTitle} / ${source.listTitle}`,
            });
          });
        }
      });

      const unionSchema = SchemaService.buildUnionSchema(sourceColumns);
      
      // Fetch sample data from each source
      const allRows: any[] = [];
      const itemsPerSource = Math.ceil(limit / selectedSources.length);

      for (const source of selectedSources) {
        try {
          const result = await graphService.getListItems(source.siteId, source.listId, {
            top: itemsPerSource,
            select: columns || undefined,
          });

          result.items.forEach(item => {
            const normalizedRow = SchemaService.normalizeDataRow(item, unionSchema, {
              sourceId: source.id,
              siteUrl: source.siteUrl,
              siteTitle: source.siteTitle,
              listTitle: source.listTitle,
              listId: source.listId,
            });
            allRows.push(normalizedRow);
          });
        } catch (sourceError) {
          console.error(`Error fetching data from source ${source.id}:`, sourceError);
          // Continue with other sources
        }
      }

      // Apply basic filtering if provided
      let filteredRows = allRows;
      if (filters) {
        // Basic text search implementation
        if (filters.search && typeof filters.search === "string") {
          const searchTerm = filters.search.toLowerCase();
          filteredRows = allRows.filter(row => 
            Object.values(row).some(value => 
              String(value || "").toLowerCase().includes(searchTerm)
            )
          );
        }
      }

      res.json({
        data: filteredRows.slice(0, limit),
        schema: unionSchema,
        totalRows: filteredRows.length,
        hasMore: filteredRows.length > limit,
      });
    } catch (error) {
      console.error("Preview generation error:", error);
      res.status(500).json({ error: "Failed to generate preview" });
    }
  });

  // Export data
  app.post("/api/reports/export", requireAuth, validateTenant, async (req: AuthenticatedRequest, res) => {
    try {
      const { sources: sourceIds, columns, filters, format, includeSchema } = exportRequestSchema.parse(req.body);
      const accessToken = req.headers.authorization?.split(" ")[1];
      
      if (!accessToken) {
        return res.status(401).json({ error: "Access token required" });
      }

      const graphService = await createGraphService(accessToken);
      const sources = await storage.getSourcesByTenant(req.tenant!.id);
      const selectedSources = sources.filter(s => sourceIds.includes(s.id));

      if (selectedSources.length === 0) {
        return res.status(400).json({ error: "No valid sources found" });
      }

      // Build union schema
      const sourceColumns: any[] = [];
      selectedSources.forEach(source => {
        if (Array.isArray(source.columns)) {
          source.columns.forEach((col: any) => {
            sourceColumns.push({
              ...col,
              sourceId: source.id,
              sourceName: `${source.siteTitle} / ${source.listTitle}`,
            });
          });
        }
      });

      const unionSchema = SchemaService.buildUnionSchema(sourceColumns);
      
      // Fetch all data from sources
      const allRows: any[] = [];
      
      for (const source of selectedSources) {
        try {
          let hasMore = true;
          let skip = 0;
          const batchSize = 1000;

          while (hasMore) {
            const result = await graphService.getListItems(source.siteId, source.listId, {
              top: batchSize,
              skip,
              select: columns || undefined,
            });

            result.items.forEach(item => {
              const normalizedRow = SchemaService.normalizeDataRow(item, unionSchema, {
                sourceId: source.id,
                siteUrl: source.siteUrl,
                siteTitle: source.siteTitle,
                listTitle: source.listTitle,
                listId: source.listId,
              });
              allRows.push(normalizedRow);
            });

            hasMore = result.hasMore;
            skip += batchSize;

            // Safety break for very large datasets
            if (allRows.length > 100000) {
              console.warn("Export size limit reached, truncating results");
              break;
            }
          }
        } catch (sourceError) {
          console.error(`Error fetching data from source ${source.id}:`, sourceError);
        }
      }

      // Apply filtering
      let filteredRows = allRows;
      if (filters?.search && typeof filters.search === "string") {
        const searchTerm = filters.search.toLowerCase();
        filteredRows = allRows.filter(row => 
          Object.values(row).some(value => 
            String(value || "").toLowerCase().includes(searchTerm)
          )
        );
      }

      // Prepare export data
      const exportData = {
        data: filteredRows,
        schema: unionSchema.columns.map(col => ({
          displayName: col.displayName,
          type: col.type,
          coverage: col.coverage,
        })),
        sources: selectedSources.map(s => `${s.siteTitle} / ${s.listTitle}`),
        coverageMatrix: unionSchema.coverageMatrix.matrix,
      };

      // Generate export file
      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      if (format === "csv") {
        buffer = await ExportService.exportToCSV(exportData);
        contentType = "text/csv";
        filename = `sp-report-${Date.now()}.csv`;
      } else {
        buffer = await ExportService.exportToXLSX(exportData);
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        filename = `sp-report-${Date.now()}.xlsx`;
      }

      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", contentType);
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Get tenant sources
  app.get("/api/sources", requireAuth, validateTenant, async (req: AuthenticatedRequest, res) => {
    try {
      const sources = await storage.getSourcesByTenant(req.tenant!.id);
      res.json({ sources });
    } catch (error) {
      console.error("Sources fetch error:", error);
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  // Reports management
  app.get("/api/reports", requireAuth, validateTenant, async (req: AuthenticatedRequest, res) => {
    try {
      const reports = await storage.getReportsByTenant(req.tenant!.id);
      res.json({ reports });
    } catch (error) {
      console.error("Reports fetch error:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
