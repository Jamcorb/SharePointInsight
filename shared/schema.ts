import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, json, boolean, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  azureTenantId: text("azure_tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  upn: text("upn").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  roles: text("roles").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  authority: text("authority").notNull(),
  clientId: text("client_id").notNull(),
  scopes: text("scopes").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  siteId: text("site_id").notNull(),
  siteUrl: text("site_url").notNull(),
  siteTitle: text("site_title").notNull(),
  listId: text("list_id").notNull(),
  listTitle: text("list_title").notNull(),
  type: text("type").notNull(), // 'list' | 'library'
  itemCount: integer("item_count").default(0),
  columns: json("columns").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  configJson: json("config_json").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reportRuns = pgTable("report_runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: uuid("report_id").notNull().references(() => reports.id),
  status: text("status").notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  rowCount: integer("row_count"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  summaryJson: json("summary_json"),
  errorMessage: text("error_message"),
});

export const savedViews = pgTable("saved_views", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: uuid("report_id").notNull().references(() => reports.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  columnsJson: json("columns_json").notNull(),
  filtersJson: json("filters_json").notNull(),
  sortsJson: json("sorts_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: uuid("report_id").notNull().references(() => reports.id),
  cron: text("cron").notNull(),
  destinationSpoUrl: text("destination_spo_url"),
  format: text("format").notNull(), // 'csv' | 'xlsx'
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  connections: many(connections),
  sources: many(sources),
  reports: many(reports),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  createdReports: many(reports),
  savedViews: many(savedViews),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [reports.tenantId],
    references: [tenants.id],
  }),
  createdBy: one(users, {
    fields: [reports.createdBy],
    references: [users.id],
  }),
  runs: many(reportRuns),
  savedViews: many(savedViews),
  schedules: many(schedules),
}));

export const reportRunsRelations = relations(reportRuns, ({ one }) => ({
  report: one(reports, {
    fields: [reportRuns.reportId],
    references: [reports.id],
  }),
}));

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSourceSchema = createInsertSchema(sources).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportRunSchema = createInsertSchema(reportRuns).omit({
  id: true,
  startedAt: true,
});

export const insertSavedViewSchema = createInsertSchema(savedViews).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type ReportRun = typeof reportRuns.$inferSelect;
export type InsertReportRun = z.infer<typeof insertReportRunSchema>;

export type SavedView = typeof savedViews.$inferSelect;
export type InsertSavedView = z.infer<typeof insertSavedViewSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
