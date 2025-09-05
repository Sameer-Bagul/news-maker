import { 
  type User, 
  type InsertUser, 
  type Article, 
  type InsertArticle,
  type Report,
  type InsertReport,
  type Source,
  type InsertSource,
  type Job,
  type InsertJob,
  type ArticleWithReport,
  type DashboardStats,
  type QueueStatus,
  type ApiUsage
} from "@shared/schema";
import { mongoDb } from "./db/mongodb";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Source operations
  getSources(): Promise<Source[]>;
  getActiveRssSources(): Promise<Source[]>;
  createSource(source: InsertSource): Promise<Source>;
  updateSourceLastFetch(sourceId: string): Promise<void>;

  // Article operations
  getArticles(limit?: number, offset?: number, status?: string): Promise<ArticleWithReport[]>;
  getArticleByUrl(url: string): Promise<Article | undefined>;
  getArticleBySlug(slug: string): Promise<ArticleWithReport | undefined>;
  getArticlesByStatus(status: string, limit?: number): Promise<Article[]>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined>;
  deleteOldRawText(olderThanDays: number): Promise<number>;

  // Report operations
  getReportByArticleId(articleId: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined>;
  getReportsForReview(limit?: number): Promise<(Report & { article: Article; source?: Source })[]>;

  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  getJobsByStatus(status: string, limit?: number): Promise<Job[]>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;
  getJobsByType(type: string, limit?: number): Promise<Job[]>;

  // Analytics
  getDashboardStats(): Promise<DashboardStats>;
  getQueueStatus(): Promise<QueueStatus>;
  getApiUsage(): Promise<ApiUsage>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private sources: Map<string, Source> = new Map();
  private articles: Map<string, Article> = new Map();
  private reports: Map<string, Report> = new Map();
  private jobs: Map<string, Job> = new Map();

  constructor() {
    // Initialize with some default sources
    this.initializeDefaultSources();
  }

  private initializeDefaultSources() {
    const defaultSources: InsertSource[] = [
      {
        name: "TechCrunch",
        domain: "techcrunch.com",
        rssUrl: "https://techcrunch.com/feed/",
        category: "technology",
        rateLimitPerHour: 100
      },
      {
        name: "Reuters Technology",
        domain: "reuters.com",
        rssUrl: "https://feeds.reuters.com/reuters/technologyNews",
        category: "technology",
        rateLimitPerHour: 200
      },
      {
        name: "BBC Science",
        domain: "bbc.com",
        rssUrl: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
        category: "science",
        rateLimitPerHour: 150
      }
    ];

    defaultSources.forEach(source => {
      const id = randomUUID();
      this.sources.set(id, {
        ...source,
        id,
        isActive: true,
        createdAt: new Date(),
        lastFetchedAt: null
      });
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Source operations
  async getSources(): Promise<Source[]> {
    return Array.from(this.sources.values());
  }

  async getActiveRssSources(): Promise<Source[]> {
    return Array.from(this.sources.values()).filter(source => 
      source.isActive && source.rssUrl
    );
  }

  async createSource(insertSource: InsertSource): Promise<Source> {
    const id = randomUUID();
    const source: Source = {
      ...insertSource,
      id,
      createdAt: new Date(),
      lastFetchedAt: null
    };
    this.sources.set(id, source);
    return source;
  }

  async updateSourceLastFetch(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (source) {
      source.lastFetchedAt = new Date();
      this.sources.set(sourceId, source);
    }
  }

  // Article operations
  async getArticles(limit = 50, offset = 0, status?: string): Promise<ArticleWithReport[]> {
    let articles = Array.from(this.articles.values());
    
    if (status) {
      articles = articles.filter(article => article.status === status);
    }

    // Sort by fetchedAt desc
    articles.sort((a, b) => (b.fetchedAt?.getTime() || 0) - (a.fetchedAt?.getTime() || 0));

    const paginatedArticles = articles.slice(offset, offset + limit);

    return Promise.all(paginatedArticles.map(async article => {
      const report = await this.getReportByArticleId(article.id);
      const source = article.sourceId ? this.sources.get(article.sourceId) : undefined;
      return { ...article, report, source };
    }));
  }

  async getArticleByUrl(url: string): Promise<Article | undefined> {
    return Array.from(this.articles.values()).find(article => article.url === url);
  }

  async getArticleBySlug(slug: string): Promise<ArticleWithReport | undefined> {
    const article = Array.from(this.articles.values()).find(article => article.slug === slug);
    if (!article) return undefined;

    const report = await this.getReportByArticleId(article.id);
    const source = article.sourceId ? this.sources.get(article.sourceId) : undefined;
    return { ...article, report, source };
  }

  async getArticlesByStatus(status: string, limit = 50): Promise<Article[]> {
    return Array.from(this.articles.values())
      .filter(article => article.status === status)
      .slice(0, limit);
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = randomUUID();
    const article: Article = {
      ...insertArticle,
      id,
      fetchedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.articles.set(id, article);
    return article;
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined> {
    const article = this.articles.get(id);
    if (!article) return undefined;

    const updatedArticle = { ...article, ...updates, updatedAt: new Date() };
    this.articles.set(id, updatedArticle);
    return updatedArticle;
  }

  async deleteOldRawText(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;
    this.articles.forEach((article, id) => {
      if (article.fetchedAt && article.fetchedAt < cutoffDate && article.rawText) {
        article.rawText = null;
        this.articles.set(id, article);
        deletedCount++;
      }
    });

    return deletedCount;
  }

  // Report operations
  async getReportByArticleId(articleId: string): Promise<Report | undefined> {
    return Array.from(this.reports.values()).find(report => report.articleId === articleId);
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const report: Report = {
      ...insertReport,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.reports.set(id, report);
    return report;
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;

    const updatedReport = { ...report, ...updates, updatedAt: new Date() };
    this.reports.set(id, updatedReport);
    return updatedReport;
  }

  async getReportsForReview(limit = 20): Promise<(Report & { article: Article; source?: Source })[]> {
    const reportsForReview = Array.from(this.reports.values())
      .filter(report => !report.reviewedAt)
      .slice(0, limit);

    return reportsForReview.map(report => {
      const article = this.articles.get(report.articleId)!;
      const source = article.sourceId ? this.sources.get(article.sourceId) : undefined;
      return { ...report, article, source };
    });
  }

  // Job operations
  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const job: Job = {
      ...insertJob,
      id,
      createdAt: new Date()
    };
    this.jobs.set(id, job);
    return job;
  }

  async getJobsByStatus(status: string, limit = 50): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter(job => job.status === status)
      .slice(0, limit);
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    const updatedJob = { ...job, ...updates };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async getJobsByType(type: string, limit = 50): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter(job => job.type === type)
      .slice(0, limit);
  }

  // Analytics
  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const articlesToday = Array.from(this.articles.values())
      .filter(article => article.fetchedAt && article.fetchedAt >= today).length;

    const pendingReview = Array.from(this.reports.values())
      .filter(report => !report.reviewedAt).length;

    const published = Array.from(this.articles.values())
      .filter(article => article.status === 'published').length;

    const factChecks = Array.from(this.reports.values())
      .reduce((sum, report) => sum + (report.checks?.factChecks?.length || 0), 0);

    return {
      articlesToday,
      pendingReview,
      published,
      factChecks
    };
  }

  async getQueueStatus(): Promise<QueueStatus> {
    const activeJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'processing');

    return {
      rssFetchers: activeJobs.filter(job => job.type === 'fetch').length,
      extractors: activeJobs.filter(job => job.type === 'extract').length,
      humanizers: activeJobs.filter(job => job.type === 'humanize').length,
      factCheckers: activeJobs.filter(job => job.type === 'fact-check').length
    };
  }

  async getApiUsage(): Promise<ApiUsage> {
    // In a real implementation, this would track actual API usage
    return {
      geminiCalls: 1247,
      geminiLimit: 5000,
      newsApiRequests: 856,
      newsApiLimit: 1000,
      mongoOperations: 23456
    };
  }
}

// MongoDB Storage Implementation
export class MongoStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return mongoDb.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return mongoDb.getUserByEmail(email);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return mongoDb.getUserByGoogleId(googleId);
  }

  async createUser(user: InsertUser): Promise<User> {
    return mongoDb.createUser(user);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    return mongoDb.updateUser(id, updates);
  }

  // Source operations
  async getSources(): Promise<Source[]> {
    return mongoDb.getSources();
  }

  async getActiveRssSources(): Promise<Source[]> {
    return mongoDb.getActiveRssSources();
  }

  async createSource(source: InsertSource): Promise<Source> {
    return mongoDb.createSource(source);
  }

  async updateSourceLastFetch(sourceId: string): Promise<void> {
    return mongoDb.updateSourceLastFetch(sourceId);
  }

  // Article operations
  async getArticles(limit?: number, offset?: number, status?: string): Promise<ArticleWithReport[]> {
    return mongoDb.getArticles(limit, offset, status);
  }

  async getArticleByUrl(url: string): Promise<Article | undefined> {
    return mongoDb.getArticleByUrl(url);
  }

  async getArticleBySlug(slug: string): Promise<ArticleWithReport | undefined> {
    return mongoDb.getArticleBySlug(slug);
  }

  async getArticlesByStatus(status: string, limit?: number): Promise<Article[]> {
    return mongoDb.getArticlesByStatus(status, limit);
  }

  async createArticle(article: InsertArticle): Promise<Article> {
    return mongoDb.createArticle(article);
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined> {
    return mongoDb.updateArticle(id, updates);
  }

  async deleteOldRawText(olderThanDays: number): Promise<number> {
    return mongoDb.deleteOldRawText(olderThanDays);
  }

  // Report operations
  async getReportByArticleId(articleId: string): Promise<Report | undefined> {
    return mongoDb.getReportByArticleId(articleId);
  }

  async createReport(report: InsertReport): Promise<Report> {
    return mongoDb.createReport(report);
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined> {
    return mongoDb.updateReport(id, updates);
  }

  async getReportsForReview(limit?: number): Promise<(Report & { article: Article; source?: Source })[]> {
    return mongoDb.getReportsForReview(limit);
  }

  // Job operations
  async createJob(job: InsertJob): Promise<Job> {
    return mongoDb.createJob(job);
  }

  async getJobsByStatus(status: string, limit?: number): Promise<Job[]> {
    return mongoDb.getJobsByStatus(status, limit);
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    return mongoDb.updateJob(id, updates);
  }

  async getJobsByType(type: string, limit?: number): Promise<Job[]> {
    return mongoDb.getJobsByType(type, limit);
  }

  // Analytics
  async getDashboardStats(): Promise<DashboardStats> {
    return mongoDb.getDashboardStats();
  }

  async getQueueStatus(): Promise<QueueStatus> {
    return mongoDb.getQueueStatus();
  }

  async getApiUsage(): Promise<ApiUsage> {
    return mongoDb.getApiUsage();
  }
}

// Use MongoDB storage instead of memory storage
export const storage = new MongoStorage();
