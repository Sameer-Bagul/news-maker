import { storage } from "../storage";
import { type Source, type InsertArticle } from "@shared/schema";

interface RssItem {
  title: string;
  url: string;
  publishedAt: Date;
  description?: string;
  authors?: string[];
  category?: string;
}

export class NewsService {
  async fetchFromRss(source: Source): Promise<RssItem[]> {
    try {
      if (!source.rssUrl) {
        throw new Error(`No RSS URL for source ${source.name}`);
      }

      const response = await fetch(source.rssUrl, {
        headers: {
          'User-Agent': 'NewsAI Bot 1.0 (contact@newsai.com)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const items = this.parseRssFeed(xmlText, source);
      
      // Update last fetch time
      await storage.updateSourceLastFetch(source.id);
      
      return items;
    } catch (error) {
      console.error(`Error fetching RSS from ${source.name}:`, error);
      throw error;
    }
  }

  private parseRssFeed(xmlText: string, source: Source): RssItem[] {
    try {
      // Simple XML parsing - in production, use a proper XML parser
      const items: RssItem[] = [];
      
      // Extract items using regex (basic approach)
      const itemRegex = /<item>(.*?)<\/item>/gs;
      const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/s;
      const linkRegex = /<link>(.*?)<\/link>/s;
      const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/s;
      const descriptionRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s;

      let match;
      while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemXml = match[1];
        
        const titleMatch = titleRegex.exec(itemXml);
        const linkMatch = linkRegex.exec(itemXml);
        const pubDateMatch = pubDateRegex.exec(itemXml);
        const descMatch = descriptionRegex.exec(itemXml);

        if (titleMatch && linkMatch) {
          const title = (titleMatch[1] || titleMatch[2] || '').trim();
          const url = linkMatch[1].trim();
          const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();
          const description = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : undefined;

          items.push({
            title,
            url,
            publishedAt,
            description,
            category: source.category
          });
        }
      }

      return items.slice(0, 20); // Limit to 20 items per source
    } catch (error) {
      console.error('Error parsing RSS feed:', error);
      return [];
    }
  }

  async saveArticles(items: RssItem[], sourceId: string): Promise<number> {
    let savedCount = 0;

    for (const item of items) {
      try {
        // Check if article already exists
        const existing = await storage.getArticleByUrl(item.url);
        if (existing) {
          continue;
        }

        // Generate slug from title
        const slug = this.generateSlug(item.title);

        const article: InsertArticle = {
          url: item.url,
          title: item.title,
          slug,
          sourceId,
          publishedAt: item.publishedAt,
          authors: item.authors || [],
          category: item.category || 'general',
          status: 'fetched',
          metadata: {
            description: item.description
          }
        };

        await storage.createArticle(article);
        savedCount++;
      } catch (error) {
        console.error(`Error saving article ${item.url}:`, error);
      }
    }

    return savedCount;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim()
      .substring(0, 100) + '-' + Date.now().toString(36);
  }

  async fetchAllActiveSources(): Promise<void> {
    const sources = await storage.getActiveRssSources();
    
    for (const source of sources) {
      try {
        console.log(`Fetching from ${source.name}...`);
        const items = await this.fetchFromRss(source);
        const savedCount = await this.saveArticles(items, source.id);
        console.log(`Saved ${savedCount} new articles from ${source.name}`);

        // Create extraction jobs for new articles
        await this.createExtractionJobs(source.id);
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
      }
    }
  }

  private async createExtractionJobs(sourceId: string): Promise<void> {
    const articles = await storage.getArticlesByStatus('fetched', 10);
    const sourceArticles = articles.filter(article => article.sourceId === sourceId);

    for (const article of sourceArticles) {
      await storage.createJob({
        type: 'extract',
        status: 'pending',
        data: { articleId: article.id }
      });
    }
  }
}
