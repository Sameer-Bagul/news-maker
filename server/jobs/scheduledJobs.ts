import { storage } from "../storage";
import { NewsService } from "../services/newsService";

export class ScheduledJobs {
  private newsService = new NewsService();
  private intervals: NodeJS.Timeout[] = [];

  start(): void {
    console.log('Starting scheduled jobs...');

    // Fetch news every 30 minutes
    this.intervals.push(
      setInterval(() => this.scheduleNewsFetch(), 30 * 60 * 1000)
    );

    // Clean up old raw text daily
    this.intervals.push(
      setInterval(() => this.cleanupOldData(), 24 * 60 * 60 * 1000)
    );

    // Initial fetch
    setTimeout(() => this.scheduleNewsFetch(), 5000);
  }

  stop(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    console.log('Scheduled jobs stopped');
  }

  private async scheduleNewsFetch(): Promise<void> {
    try {
      console.log('Scheduling news fetch jobs...');
      
      const sources = await storage.getActiveRssSources();
      
      for (const source of sources) {
        // Check if we should respect rate limits
        const now = new Date();
        const lastFetch = source.lastFetchedAt;
        
        if (lastFetch) {
          const timeSinceLastFetch = now.getTime() - lastFetch.getTime();
          const minInterval = (60 * 60 * 1000) / (source.rateLimitPerHour || 60); // Convert rate limit to interval
          
          if (timeSinceLastFetch < minInterval) {
            console.log(`Skipping ${source.name} - rate limit not reached`);
            continue;
          }
        }

        // Create fetch job
        await storage.createJob({
          type: 'fetch',
          status: 'pending',
          data: { sourceId: source.id },
          scheduledFor: now
        });
      }
      
      console.log(`Scheduled fetch jobs for ${sources.length} sources`);
    } catch (error) {
      console.error('Error scheduling news fetch:', error);
    }
  }

  private async cleanupOldData(): Promise<void> {
    try {
      console.log('Cleaning up old data...');
      
      // Delete raw text older than 7 days
      const deletedCount = await storage.deleteOldRawText(7);
      console.log(`Deleted raw text from ${deletedCount} articles`);

      // Clean up completed jobs older than 30 days
      await this.cleanupOldJobs();
      
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  private async cleanupOldJobs(): Promise<void> {
    try {
      const completedJobs = await storage.getJobsByStatus('completed');
      const failedJobs = await storage.getJobsByStatus('failed');
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let cleanedCount = 0;

      // In a real implementation, you would delete old jobs from the database
      // For this memory implementation, we'll just log what would be cleaned
      [...completedJobs, ...failedJobs].forEach(job => {
        if (job.completedAt && job.completedAt < thirtyDaysAgo) {
          cleanedCount++;
        }
      });

      console.log(`Would clean up ${cleanedCount} old jobs`);
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
    }
  }

  async createManualFetchJob(sourceId: string): Promise<void> {
    try {
      await storage.createJob({
        type: 'fetch',
        status: 'pending',
        data: { sourceId },
        scheduledFor: new Date()
      });
      
      console.log(`Created manual fetch job for source ${sourceId}`);
    } catch (error) {
      console.error('Error creating manual fetch job:', error);
      throw error;
    }
  }
}
