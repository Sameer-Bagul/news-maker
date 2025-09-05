import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  role: text("role").notNull().default("user"), // user, admin, editor
  googleId: text("google_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sources = pgTable("sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  rssUrl: text("rss_url"),
  apiEndpoint: text("api_endpoint"),
  category: text("category").notNull(),
  isActive: boolean("is_active").default(true),
  rateLimitPerHour: integer("rate_limit_per_hour").default(100),
  lastFetchedAt: timestamp("last_fetched_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  domainIdx: index("sources_domain_idx").on(table.domain),
}));

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  sourceId: varchar("source_id").references(() => sources.id),
  publishedAt: timestamp("published_at"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  rawText: text("raw_text"),
  authors: jsonb("authors").$type<string[]>().default([]),
  language: text("language").default("en"),
  tags: jsonb("tags").$type<string[]>().default([]),
  category: text("category"),
  status: text("status").notNull().default("fetched"), // fetched, extracted, humanized, published, rejected
  redirects: jsonb("redirects").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  urlIdx: index("articles_url_idx").on(table.url),
  statusIdx: index("articles_status_idx").on(table.status),
  slugIdx: index("articles_slug_idx").on(table.slug),
}));

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => articles.id),
  tldr: text("tldr"),
  bullets: jsonb("bullets").$type<string[]>().default([]),
  humanizedHtml: text("humanized_html"),
  humanizedPlain: text("humanized_plain"),
  entities: jsonb("entities").$type<{
    orgs: string[];
    persons: string[];
    places: string[];
  }>().default({ orgs: [], persons: [], places: [] }),
  checks: jsonb("checks").$type<{
    factChecks: Array<{ claim: string; verified: boolean; confidence: number }>;
    quotedTexts: string[];
  }>().default({ factChecks: [], quotedTexts: [] }),
  aiScore: integer("ai_score").default(0), // 0-100 confidence score
  similarityScore: integer("similarity_score").default(0), // 0-100 similarity to original
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  articleIdx: index("reports_article_idx").on(table.articleId),
}));

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // fetch, extract, humanize, publish
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  data: jsonb("data").$type<Record<string, any>>().default({}),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  error: text("error"),
  scheduledFor: timestamp("scheduled_for"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  statusIdx: index("jobs_status_idx").on(table.status),
  typeIdx: index("jobs_type_idx").on(table.type),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSourceSchema = createInsertSchema(sources).omit({
  id: true,
  createdAt: true,
  lastFetchedAt: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  fetchedAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

// API Response types
export type ArticleWithReport = Article & {
  report?: Report;
  source?: Source;
};

export type DashboardStats = {
  articlesToday: number;
  pendingReview: number;
  published: number;
  factChecks: number;
};

export type QueueStatus = {
  rssFetchers: number;
  extractors: number;
  humanizers: number;
  factCheckers: number;
};

export type ApiUsage = {
  geminiCalls: number;
  geminiLimit: number;
  newsApiRequests: number;
  newsApiLimit: number;
  mongoOperations: number;
};
