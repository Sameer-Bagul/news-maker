import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
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

// MongoDB document interfaces
interface UserDoc extends Omit<User, 'id'> {
  _id: ObjectId;
}

interface ArticleDoc extends Omit<Article, 'id' | 'sourceId'> {
  _id: ObjectId;
  sourceId?: ObjectId;
}

interface ReportDoc extends Omit<Report, 'id' | 'articleId' | 'reviewedBy'> {
  _id: ObjectId;
  articleId: ObjectId;
  reviewedBy?: ObjectId;
}

interface SourceDoc extends Omit<Source, 'id'> {
  _id: ObjectId;
}

interface JobDoc extends Omit<Job, 'id'> {
  _id: ObjectId;
}

class MongoDatabase {
  private client: MongoClient;
  private db: Db;
  private users: Collection<UserDoc>;
  private articles: Collection<ArticleDoc>;
  private reports: Collection<ReportDoc>;
  private sources: Collection<SourceDoc>;
  private jobs: Collection<JobDoc>;

  constructor() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    this.client = new MongoClient(uri);
    this.db = this.client.db('newsai');
    this.users = this.db.collection<UserDoc>('users');
    this.articles = this.db.collection<ArticleDoc>('articles');
    this.reports = this.db.collection<ReportDoc>('reports');
    this.sources = this.db.collection<SourceDoc>('sources');
    this.jobs = this.db.collection<JobDoc>('jobs');
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('Connected to MongoDB successfully');
      
      // Create indexes for better performance
      await this.createIndexes();
      await this.initializeDefaultSources();
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    console.log('Disconnected from MongoDB');
  }

  private async createIndexes(): Promise<void> {
    try {
      // User indexes
      await this.users.createIndex({ email: 1 }, { unique: true });
      await this.users.createIndex({ googleId: 1 }, { unique: true, sparse: true });

      // Article indexes
      await this.articles.createIndex({ url: 1 }, { unique: true });
      await this.articles.createIndex({ slug: 1 }, { unique: true });
      await this.articles.createIndex({ status: 1 });
      await this.articles.createIndex({ sourceId: 1 });
      await this.articles.createIndex({ fetchedAt: -1 });

      // Report indexes
      await this.reports.createIndex({ articleId: 1 }, { unique: true });
      await this.reports.createIndex({ reviewedAt: 1 });

      // Source indexes
      await this.sources.createIndex({ domain: 1 }, { unique: true });

      // Job indexes
      await this.jobs.createIndex({ status: 1 });
      await this.jobs.createIndex({ type: 1 });
      await this.jobs.createIndex({ createdAt: 1 });

      console.log('MongoDB indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  private async initializeDefaultSources(): Promise<void> {
    const count = await this.sources.countDocuments();
    if (count > 0) return;

    const defaultSources = [
      {
        name: "TechCrunch",
        domain: "techcrunch.com",
        rssUrl: "https://techcrunch.com/feed/",
        category: "technology",
        rateLimitPerHour: 100,
        isActive: true,
        createdAt: new Date(),
        lastFetchedAt: null
      },
      {
        name: "Reuters Technology", 
        domain: "reuters.com",
        rssUrl: "https://feeds.reuters.com/reuters/technologyNews",
        category: "technology",
        rateLimitPerHour: 200,
        isActive: true,
        createdAt: new Date(),
        lastFetchedAt: null
      },
      {
        name: "BBC Science",
        domain: "bbc.com", 
        rssUrl: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
        category: "science",
        rateLimitPerHour: 150,
        isActive: true,
        createdAt: new Date(),
        lastFetchedAt: null
      }
    ];

    await this.sources.insertMany(defaultSources);
    console.log('Default sources initialized');
  }

  private docToUser(doc: UserDoc): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      avatar: doc.avatar,
      role: doc.role,
      googleId: doc.googleId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  private docToArticle(doc: ArticleDoc): Article {
    return {
      id: doc._id.toString(),
      url: doc.url,
      title: doc.title,
      slug: doc.slug,
      sourceId: doc.sourceId?.toString() || null,
      publishedAt: doc.publishedAt,
      fetchedAt: doc.fetchedAt,
      rawText: doc.rawText,
      authors: doc.authors,
      language: doc.language,
      tags: doc.tags,
      category: doc.category,
      status: doc.status,
      redirects: doc.redirects,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  private docToReport(doc: ReportDoc): Report {
    return {
      id: doc._id.toString(),
      articleId: doc.articleId.toString(),
      tldr: doc.tldr,
      bullets: doc.bullets,
      humanizedHtml: doc.humanizedHtml,
      humanizedPlain: doc.humanizedPlain,
      entities: doc.entities,
      checks: doc.checks,
      aiScore: doc.aiScore,
      similarityScore: doc.similarityScore,
      reviewedBy: doc.reviewedBy?.toString() || null,
      reviewedAt: doc.reviewedAt,
      reviewNotes: doc.reviewNotes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  private docToSource(doc: SourceDoc): Source {
    return {
      id: doc._id.toString(),
      name: doc.name,
      domain: doc.domain,
      rssUrl: doc.rssUrl,
      apiEndpoint: doc.apiEndpoint,
      category: doc.category,
      isActive: doc.isActive,
      rateLimitPerHour: doc.rateLimitPerHour,
      lastFetchedAt: doc.lastFetchedAt,
      createdAt: doc.createdAt
    };
  }

  private docToJob(doc: JobDoc): Job {
    return {
      id: doc._id.toString(),
      type: doc.type,
      status: doc.status,
      data: doc.data,
      attempts: doc.attempts,
      maxAttempts: doc.maxAttempts,
      error: doc.error,
      scheduledFor: doc.scheduledFor,
      startedAt: doc.startedAt,
      completedAt: doc.completedAt,
      createdAt: doc.createdAt
    };
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      const doc = await this.users.findOne({ _id: new ObjectId(id) });
      return doc ? this.docToUser(doc) : undefined;
    } catch (error) {
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const doc = await this.users.findOne({ email });
    return doc ? this.docToUser(doc) : undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const doc = await this.users.findOne({ googleId });
    return doc ? this.docToUser(doc) : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.users.insertOne({
      ...user,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as UserDoc);
    
    const doc = await this.users.findOne({ _id: result.insertedId });
    return this.docToUser(doc!);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      const result = await this.users.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      return result.value ? this.docToUser(result.value) : undefined;
    } catch (error) {
      return undefined;
    }
  }

  // Source methods
  async getSources(): Promise<Source[]> {
    const docs = await this.sources.find({}).toArray();
    return docs.map(doc => this.docToSource(doc));
  }

  async getActiveRssSources(): Promise<Source[]> {
    const docs = await this.sources.find({ isActive: true, rssUrl: { $exists: true, $ne: null } }).toArray();
    return docs.map(doc => this.docToSource(doc));
  }

  async createSource(source: InsertSource): Promise<Source> {
    const result = await this.sources.insertOne({
      ...source,
      _id: new ObjectId(),
      createdAt: new Date(),
      lastFetchedAt: null
    } as SourceDoc);
    
    const doc = await this.sources.findOne({ _id: result.insertedId });
    return this.docToSource(doc!);
  }

  async updateSourceLastFetch(sourceId: string): Promise<void> {
    try {
      await this.sources.updateOne(
        { _id: new ObjectId(sourceId) },
        { $set: { lastFetchedAt: new Date() } }
      );
    } catch (error) {
      console.error('Error updating source last fetch:', error);
    }
  }

  // Article methods
  async getArticles(limit = 50, offset = 0, status?: string): Promise<ArticleWithReport[]> {
    const filter: any = {};
    if (status) filter.status = status;

    const docs = await this.articles
      .find(filter)
      .sort({ fetchedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const articles: ArticleWithReport[] = [];
    for (const doc of docs) {
      const article = this.docToArticle(doc);
      const report = await this.getReportByArticleId(article.id);
      const source = article.sourceId ? await this.getSourceById(article.sourceId) : undefined;
      articles.push({ ...article, report, source });
    }

    return articles;
  }

  async getArticleByUrl(url: string): Promise<Article | undefined> {
    const doc = await this.articles.findOne({ url });
    return doc ? this.docToArticle(doc) : undefined;
  }

  async getArticleBySlug(slug: string): Promise<ArticleWithReport | undefined> {
    const doc = await this.articles.findOne({ slug });
    if (!doc) return undefined;

    const article = this.docToArticle(doc);
    const report = await this.getReportByArticleId(article.id);
    const source = article.sourceId ? await this.getSourceById(article.sourceId) : undefined;
    return { ...article, report, source };
  }

  async getArticlesByStatus(status: string, limit = 50): Promise<Article[]> {
    const docs = await this.articles.find({ status }).limit(limit).toArray();
    return docs.map(doc => this.docToArticle(doc));
  }

  async createArticle(article: InsertArticle): Promise<Article> {
    const result = await this.articles.insertOne({
      ...article,
      _id: new ObjectId(),
      sourceId: article.sourceId ? new ObjectId(article.sourceId) : undefined,
      fetchedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as ArticleDoc);
    
    const doc = await this.articles.findOne({ _id: result.insertedId });
    return this.docToArticle(doc!);
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined> {
    try {
      const updateData: any = { ...updates, updatedAt: new Date() };
      if (updateData.sourceId) {
        updateData.sourceId = new ObjectId(updateData.sourceId);
      }

      const result = await this.articles.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      return result.value ? this.docToArticle(result.value) : undefined;
    } catch (error) {
      return undefined;
    }
  }

  async deleteOldRawText(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.articles.updateMany(
      { 
        fetchedAt: { $lt: cutoffDate },
        rawText: { $exists: true, $ne: null }
      },
      { $unset: { rawText: 1 } }
    );

    return result.modifiedCount;
  }

  // Report methods
  async getReportByArticleId(articleId: string): Promise<Report | undefined> {
    try {
      const doc = await this.reports.findOne({ articleId: new ObjectId(articleId) });
      return doc ? this.docToReport(doc) : undefined;
    } catch (error) {
      return undefined;
    }
  }

  async createReport(report: InsertReport): Promise<Report> {
    const result = await this.reports.insertOne({
      ...report,
      _id: new ObjectId(),
      articleId: new ObjectId(report.articleId),
      reviewedBy: report.reviewedBy ? new ObjectId(report.reviewedBy) : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ReportDoc);
    
    const doc = await this.reports.findOne({ _id: result.insertedId });
    return this.docToReport(doc!);
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined> {
    try {
      const updateData: any = { ...updates, updatedAt: new Date() };
      if (updateData.reviewedBy) {
        updateData.reviewedBy = new ObjectId(updateData.reviewedBy);
      }

      const result = await this.reports.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      return result.value ? this.docToReport(result.value) : undefined;
    } catch (error) {
      return undefined;
    }
  }

  async getReportsForReview(limit = 20): Promise<(Report & { article: Article; source?: Source })[]> {
    const docs = await this.reports
      .find({ reviewedAt: { $exists: false } })
      .limit(limit)
      .toArray();

    const results: (Report & { article: Article; source?: Source })[] = [];
    for (const doc of docs) {
      const report = this.docToReport(doc);
      const articleDoc = await this.articles.findOne({ _id: new ObjectId(report.articleId) });
      if (articleDoc) {
        const article = this.docToArticle(articleDoc);
        const source = article.sourceId ? await this.getSourceById(article.sourceId) : undefined;
        results.push({ ...report, article, source });
      }
    }

    return results;
  }

  // Job methods
  async createJob(job: InsertJob): Promise<Job> {
    const result = await this.jobs.insertOne({
      ...job,
      _id: new ObjectId(),
      createdAt: new Date()
    } as JobDoc);
    
    const doc = await this.jobs.findOne({ _id: result.insertedId });
    return this.docToJob(doc!);
  }

  async getJobsByStatus(status: string, limit = 50): Promise<Job[]> {
    const docs = await this.jobs.find({ status }).limit(limit).toArray();
    return docs.map(doc => this.docToJob(doc));
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    try {
      const result = await this.jobs.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updates },
        { returnDocument: 'after' }
      );
      return result.value ? this.docToJob(result.value) : undefined;
    } catch (error) {
      return undefined;
    }
  }

  async getJobsByType(type: string, limit = 50): Promise<Job[]> {
    const docs = await this.jobs.find({ type }).limit(limit).toArray();
    return docs.map(doc => this.docToJob(doc));
  }

  // Analytics methods
  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [articlesToday, pendingReview, published, reports] = await Promise.all([
      this.articles.countDocuments({ fetchedAt: { $gte: today } }),
      this.reports.countDocuments({ reviewedAt: { $exists: false } }),
      this.articles.countDocuments({ status: 'published' }),
      this.reports.find({}).toArray()
    ]);

    const factChecks = reports.reduce((sum, report) => 
      sum + (report.checks?.factChecks?.length || 0), 0
    );

    return {
      articlesToday,
      pendingReview,
      published,
      factChecks
    };
  }

  async getQueueStatus(): Promise<QueueStatus> {
    const activeJobs = await this.jobs.find({ status: 'processing' }).toArray();

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

  private async getSourceById(id: string): Promise<Source | undefined> {
    try {
      const doc = await this.sources.findOne({ _id: new ObjectId(id) });
      return doc ? this.docToSource(doc) : undefined;
    } catch (error) {
      return undefined;
    }
  }
}

export const mongoDb = new MongoDatabase();