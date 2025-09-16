import {
  tenants,
  users,
  sources,
  reports,
  reportRuns,
  savedViews,
  schedules,
  type Tenant,
  type User,
  type Source,
  type Report,
  type ReportRun,
  type SavedView,
  type Schedule,
  type InsertTenant,
  type InsertUser,
  type InsertSource,
  type InsertReport,
  type InsertReportRun,
  type InsertSavedView,
  type InsertSchedule,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByDomain(domain: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUpn(upn: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // Sources
  getSourcesByTenant(tenantId: string): Promise<Source[]>;
  getSource(id: string): Promise<Source | undefined>;
  createSource(source: InsertSource): Promise<Source>;
  updateSource(id: string, updates: Partial<Source>): Promise<Source>;
  deleteSource(id: string): Promise<void>;

  // Reports
  getReportsByTenant(tenantId: string): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, updates: Partial<Report>): Promise<Report>;
  deleteReport(id: string): Promise<void>;

  // Report Runs
  getReportRuns(reportId: string): Promise<ReportRun[]>;
  getReportRun(id: string): Promise<ReportRun | undefined>;
  createReportRun(reportRun: InsertReportRun): Promise<ReportRun>;
  updateReportRun(id: string, updates: Partial<ReportRun>): Promise<ReportRun>;

  // Saved Views
  getSavedViews(reportId: string): Promise<SavedView[]>;
  getSavedView(id: string): Promise<SavedView | undefined>;
  createSavedView(savedView: InsertSavedView): Promise<SavedView>;
  updateSavedView(id: string, updates: Partial<SavedView>): Promise<SavedView>;
  deleteSavedView(id: string): Promise<void>;

  // Schedules
  getSchedules(reportId: string): Promise<Schedule[]>;
  getSchedule(id: string): Promise<Schedule | undefined>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, updates: Partial<Schedule>): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Tenants
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantByDomain(domain: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.domain, domain));
    return tenant || undefined;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(insertTenant).returning();
    return tenant;
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const [tenant] = await db.update(tenants).set(updates).where(eq(tenants.id, id)).returning();
    return tenant;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUpn(upn: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.upn, upn));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  // Sources
  async getSourcesByTenant(tenantId: string): Promise<Source[]> {
    return await db.select().from(sources).where(eq(sources.tenantId, tenantId));
  }

  async getSource(id: string): Promise<Source | undefined> {
    const [source] = await db.select().from(sources).where(eq(sources.id, id));
    return source || undefined;
  }

  async createSource(insertSource: InsertSource): Promise<Source> {
    const [source] = await db.insert(sources).values(insertSource).returning();
    return source;
  }

  async updateSource(id: string, updates: Partial<Source>): Promise<Source> {
    const [source] = await db.update(sources).set(updates).where(eq(sources.id, id)).returning();
    return source;
  }

  async deleteSource(id: string): Promise<void> {
    await db.delete(sources).where(eq(sources.id, id));
  }

  // Reports
  async getReportsByTenant(tenantId: string): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.tenantId, tenantId)).orderBy(desc(reports.updatedAt));
  }

  async getReport(id: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report || undefined;
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(insertReport).returning();
    return report;
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report> {
    const [report] = await db.update(reports).set({ ...updates, updatedAt: new Date() }).where(eq(reports.id, id)).returning();
    return report;
  }

  async deleteReport(id: string): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }

  // Report Runs
  async getReportRuns(reportId: string): Promise<ReportRun[]> {
    return await db.select().from(reportRuns).where(eq(reportRuns.reportId, reportId)).orderBy(desc(reportRuns.startedAt));
  }

  async getReportRun(id: string): Promise<ReportRun | undefined> {
    const [reportRun] = await db.select().from(reportRuns).where(eq(reportRuns.id, id));
    return reportRun || undefined;
  }

  async createReportRun(insertReportRun: InsertReportRun): Promise<ReportRun> {
    const [reportRun] = await db.insert(reportRuns).values(insertReportRun).returning();
    return reportRun;
  }

  async updateReportRun(id: string, updates: Partial<ReportRun>): Promise<ReportRun> {
    const [reportRun] = await db.update(reportRuns).set(updates).where(eq(reportRuns.id, id)).returning();
    return reportRun;
  }

  // Saved Views
  async getSavedViews(reportId: string): Promise<SavedView[]> {
    return await db.select().from(savedViews).where(eq(savedViews.reportId, reportId));
  }

  async getSavedView(id: string): Promise<SavedView | undefined> {
    const [savedView] = await db.select().from(savedViews).where(eq(savedViews.id, id));
    return savedView || undefined;
  }

  async createSavedView(insertSavedView: InsertSavedView): Promise<SavedView> {
    const [savedView] = await db.insert(savedViews).values(insertSavedView).returning();
    return savedView;
  }

  async updateSavedView(id: string, updates: Partial<SavedView>): Promise<SavedView> {
    const [savedView] = await db.update(savedViews).set(updates).where(eq(savedViews.id, id)).returning();
    return savedView;
  }

  async deleteSavedView(id: string): Promise<void> {
    await db.delete(savedViews).where(eq(savedViews.id, id));
  }

  // Schedules
  async getSchedules(reportId: string): Promise<Schedule[]> {
    return await db.select().from(schedules).where(eq(schedules.reportId, reportId));
  }

  async getSchedule(id: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule || undefined;
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const [schedule] = await db.insert(schedules).values(insertSchedule).returning();
    return schedule;
  }

  async updateSchedule(id: string, updates: Partial<Schedule>): Promise<Schedule> {
    const [schedule] = await db.update(schedules).set(updates).where(eq(schedules.id, id)).returning();
    return schedule;
  }

  async deleteSchedule(id: string): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }
}

export const storage = new DatabaseStorage();
