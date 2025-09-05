import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { AuthService } from "./services/authService";
import { ScheduledJobs } from "./jobs/scheduledJobs";
import { ArticleWorker } from "./workers/articleWorker";
import { insertArticleSchema, insertSourceSchema, insertReportSchema } from "@shared/schema";

const authService = new AuthService();
const scheduledJobs = new ScheduledJobs();
const articleWorker = new ArticleWorker();

// Start background services
scheduledJobs.start();
articleWorker.start();

// Simple session storage (use Redis in production)
const sessions: Map<string, { userId: string; expires: Date }> = new Map();

// Middleware to check authentication
async function requireAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-session-token'];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const session = sessions.get(token);
  if (!session || session.expires < new Date()) {
    sessions.delete(token);
    return res.status(401).json({ message: 'Session expired' });
  }

  const user = await authService.getUserProfile(session.userId);
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }

  req.user = user;
  next();
}

// Middleware to check admin access
async function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || !await authService.validateUserAccess(req.user.id, 'admin')) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Public API routes
  
  // Get articles (public)
  app.get("/api/articles", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      const category = req.query.category as string;

      let articles = await storage.getArticles(limit, offset, status);

      if (category && category !== 'All') {
        articles = articles.filter(article => 
          article.category?.toLowerCase() === category.toLowerCase()
        );
      }

      res.json(articles);
    } catch (error) {
      console.error('Error fetching articles:', error);
      res.status(500).json({ message: 'Failed to fetch articles' });
    }
  });

  // Get single article by slug (public)
  app.get("/api/articles/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const article = await storage.getArticleBySlug(slug);

      if (!article) {
        return res.status(404).json({ message: 'Article not found' });
      }

      res.json(article);
    } catch (error) {
      console.error('Error fetching article:', error);
      res.status(500).json({ message: 'Failed to fetch article' });
    }
  });

  // Authentication routes

  // Mock Google OAuth (in production, use proper OAuth)
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { token } = req.body;
      
      // Mock Google profile verification
      // In production, verify the token with Google
      const mockProfile = {
        id: 'google_' + Date.now(),
        email: 'admin@newsai.com',
        name: 'Admin User',
        picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
      };

      const user = await authService.handleGoogleLogin(mockProfile);
      const sessionToken = authService.generateSessionToken();
      
      // Store session
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // 24 hour session
      sessions.set(sessionToken, { userId: user.id, expires });

      res.json({ 
        user, 
        token: sessionToken,
        message: 'Authentication successful'
      });
    } catch (error) {
      console.error('Error in Google auth:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    res.json(req.user);
  });

  // Logout
  app.post("/api/auth/logout", requireAuth, async (req: any, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-session-token'];
    if (token) {
      sessions.delete(token);
    }
    res.json({ message: 'Logged out successfully' });
  });

  // Admin routes (require authentication)

  // Get dashboard stats
  app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // Get queue status
  app.get("/api/admin/queue-status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const queueStatus = await storage.getQueueStatus();
      res.json(queueStatus);
    } catch (error) {
      console.error('Error fetching queue status:', error);
      res.status(500).json({ message: 'Failed to fetch queue status' });
    }
  });

  // Get API usage
  app.get("/api/admin/api-usage", requireAuth, requireAdmin, async (req, res) => {
    try {
      const apiUsage = await storage.getApiUsage();
      res.json(apiUsage);
    } catch (error) {
      console.error('Error fetching API usage:', error);
      res.status(500).json({ message: 'Failed to fetch API usage' });
    }
  });

  // Get reports for review
  app.get("/api/admin/reports/review", requireAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const reports = await storage.getReportsForReview(limit);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching reports for review:', error);
      res.status(500).json({ message: 'Failed to fetch reports for review' });
    }
  });

  // Approve article
  app.post("/api/admin/articles/:articleId/approve", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { articleId } = req.params;
      const { notes } = req.body;

      // Update article status
      const article = await storage.updateArticle(articleId, {
        status: 'published'
      });

      if (!article) {
        return res.status(404).json({ message: 'Article not found' });
      }

      // Update report with review info
      const report = await storage.getReportByArticleId(articleId);
      if (report) {
        await storage.updateReport(report.id, {
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          reviewNotes: notes
        });
      }

      res.json({ message: 'Article approved successfully', article });
    } catch (error) {
      console.error('Error approving article:', error);
      res.status(500).json({ message: 'Failed to approve article' });
    }
  });

  // Reject article
  app.post("/api/admin/articles/:articleId/reject", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { articleId } = req.params;
      const { reason } = req.body;

      // Update article status
      const article = await storage.updateArticle(articleId, {
        status: 'rejected'
      });

      if (!article) {
        return res.status(404).json({ message: 'Article not found' });
      }

      // Update report with review info
      const report = await storage.getReportByArticleId(articleId);
      if (report) {
        await storage.updateReport(report.id, {
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          reviewNotes: reason
        });
      }

      res.json({ message: 'Article rejected successfully', article });
    } catch (error) {
      console.error('Error rejecting article:', error);
      res.status(500).json({ message: 'Failed to reject article' });
    }
  });

  // Manual fetch trigger
  app.post("/api/admin/fetch/:sourceId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { sourceId } = req.params;
      await scheduledJobs.createManualFetchJob(sourceId);
      res.json({ message: 'Fetch job created successfully' });
    } catch (error) {
      console.error('Error creating fetch job:', error);
      res.status(500).json({ message: 'Failed to create fetch job' });
    }
  });

  // Get sources
  app.get("/api/admin/sources", requireAuth, requireAdmin, async (req, res) => {
    try {
      const sources = await storage.getSources();
      res.json(sources);
    } catch (error) {
      console.error('Error fetching sources:', error);
      res.status(500).json({ message: 'Failed to fetch sources' });
    }
  });

  // Add new source
  app.post("/api/admin/sources", requireAuth, requireAdmin, async (req, res) => {
    try {
      const sourceData = insertSourceSchema.parse(req.body);
      const source = await storage.createSource(sourceData);
      res.status(201).json(source);
    } catch (error) {
      console.error('Error creating source:', error);
      res.status(500).json({ message: 'Failed to create source' });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        worker: 'running',
        scheduler: 'running'
      }
    });
  });

  const httpServer = createServer(app);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    scheduledJobs.stop();
    articleWorker.stop();
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  return httpServer;
}
