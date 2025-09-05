import { storage } from "../storage";
import { NewsService } from "../services/newsService";
import { ExtractorService } from "../services/extractorService";
import { humanizeArticle, performFactCheck, calculateSimilarity } from "../services/gemini";
import { type Job } from "@shared/schema";

export class ArticleWorker {
  private newsService = new NewsService();
  private extractorService = new ExtractorService();
  private isProcessing = false;

  async start(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log('Article worker started');

    // Process jobs in a loop
    while (this.isProcessing) {
      try {
        await this.processJobs();
        await this.sleep(5000); // Wait 5 seconds between job cycles
      } catch (error) {
        console.error('Error in worker cycle:', error);
        await this.sleep(10000); // Wait longer on error
      }
    }
  }

  stop(): void {
    this.isProcessing = false;
    console.log('Article worker stopped');
  }

  private async processJobs(): Promise<void> {
    const pendingJobs = await storage.getJobsByStatus('pending', 10);

    for (const job of pendingJobs) {
      try {
        await this.processJob(job);
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        await this.markJobFailed(job, error);
      }
    }
  }

  private async processJob(job: Job): Promise<void> {
    console.log(`Processing job ${job.id} of type ${job.type}`);

    await storage.updateJob(job.id, {
      status: 'processing',
      startedAt: new Date()
    });

    switch (job.type) {
      case 'fetch':
        await this.processFetchJob(job);
        break;
      case 'extract':
        await this.processExtractionJob(job);
        break;
      case 'humanize':
        await this.processHumanizationJob(job);
        break;
      case 'fact-check':
        await this.processFactCheckJob(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await storage.updateJob(job.id, {
      status: 'completed',
      completedAt: new Date()
    });
  }

  private async processFetchJob(job: Job): Promise<void> {
    const { sourceId } = job.data;
    
    if (!sourceId) {
      throw new Error('Source ID not provided for fetch job');
    }

    const sources = await storage.getSources();
    const source = sources.find(s => s.id === sourceId);
    
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    const items = await this.newsService.fetchFromRss(source);
    const savedCount = await this.newsService.saveArticles(items, sourceId);

    console.log(`Fetched and saved ${savedCount} articles from ${source.name}`);

    // Create extraction jobs for newly fetched articles
    const newArticles = await storage.getArticlesByStatus('fetched', savedCount);
    for (const article of newArticles.slice(0, savedCount)) {
      await storage.createJob({
        type: 'extract',
        status: 'pending',
        data: { articleId: article.id }
      });
    }
  }

  private async processExtractionJob(job: Job): Promise<void> {
    const { articleId } = job.data;
    
    if (!articleId) {
      throw new Error('Article ID not provided for extraction job');
    }

    const article = await storage.getArticleByUrl(''); // Get by ID in real implementation
    const articles = await storage.getArticlesByStatus('fetched');
    const targetArticle = articles.find(a => a.id === articleId);
    
    if (!targetArticle) {
      throw new Error(`Article not found: ${articleId}`);
    }

    await this.extractorService.extractArticleContent(targetArticle);

    // Create humanization job
    await storage.createJob({
      type: 'humanize',
      status: 'pending',
      data: { articleId }
    });
  }

  private async processHumanizationJob(job: Job): Promise<void> {
    const { articleId } = job.data;
    
    if (!articleId) {
      throw new Error('Article ID not provided for humanization job');
    }

    const articles = await storage.getArticlesByStatus('extracted');
    const article = articles.find(a => a.id === articleId);
    
    if (!article || !article.rawText) {
      throw new Error(`Article not found or missing raw text: ${articleId}`);
    }

    // Humanize the article using Gemini
    const humanizedContent = await humanizeArticle(
      article.title,
      article.rawText,
      article.url
    );

    // Calculate similarity score
    const similarityScore = await calculateSimilarity(
      article.rawText,
      humanizedContent.humanizedPlain
    );

    // Create report
    await storage.createReport({
      articleId: article.id,
      tldr: humanizedContent.tldr,
      bullets: humanizedContent.bullets,
      humanizedHtml: humanizedContent.humanizedHtml,
      humanizedPlain: humanizedContent.humanizedPlain,
      entities: humanizedContent.entities,
      aiScore: Math.round(humanizedContent.confidence),
      similarityScore: Math.round(similarityScore),
      checks: {
        factChecks: [],
        quotedTexts: []
      }
    });

    // Update article status
    await storage.updateArticle(article.id, {
      status: 'humanized'
    });

    // Create fact-check job
    await storage.createJob({
      type: 'fact-check',
      status: 'pending',
      data: { articleId }
    });
  }

  private async processFactCheckJob(job: Job): Promise<void> {
    const { articleId } = job.data;
    
    if (!articleId) {
      throw new Error('Article ID not provided for fact-check job');
    }

    const articles = await storage.getArticlesByStatus('humanized');
    const article = articles.find(a => a.id === articleId);
    const report = await storage.getReportByArticleId(articleId);
    
    if (!article || !report || !article.rawText) {
      throw new Error(`Article or report not found: ${articleId}`);
    }

    // Perform fact-checking
    const factChecks = await performFactCheck(
      article.rawText,
      report.humanizedPlain || ''
    );

    // Update report with fact-check results
    await storage.updateReport(report.id, {
      checks: {
        factChecks,
        quotedTexts: this.extractQuotes(article.rawText)
      }
    });

    console.log(`Completed fact-checking for article ${articleId} with ${factChecks.length} checks`);
  }

  private extractQuotes(text: string): string[] {
    // Extract quoted text using regex
    const quotes: string[] = [];
    const quoteRegex = /"([^"]{10,})"/g;
    let match;

    while ((match = quoteRegex.exec(text)) !== null) {
      quotes.push(match[1]);
    }

    return quotes.slice(0, 10); // Limit to 10 quotes
  }

  private async markJobFailed(job: Job, error: unknown): Promise<void> {
    const attempts = (job.attempts || 0) + 1;
    const maxAttempts = job.maxAttempts || 3;

    await storage.updateJob(job.id, {
      status: attempts >= maxAttempts ? 'failed' : 'pending',
      error: error instanceof Error ? error.message : 'Unknown error',
      attempts,
      completedAt: attempts >= maxAttempts ? new Date() : undefined
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
