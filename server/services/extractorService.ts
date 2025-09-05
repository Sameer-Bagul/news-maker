import { storage } from "../storage";
import { type Article } from "@shared/schema";

export class ExtractorService {
  async extractArticleContent(article: Article): Promise<string> {
    try {
      console.log(`Extracting content from: ${article.url}`);

      const response = await fetch(article.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsAI Bot/1.0; +https://newsai.com/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const extractedText = this.extractTextFromHtml(html);

      if (!extractedText || extractedText.length < 200) {
        throw new Error('Extracted text too short or empty');
      }

      // Update article with extracted content
      await storage.updateArticle(article.id, {
        rawText: extractedText,
        status: 'extracted'
      });

      console.log(`Successfully extracted ${extractedText.length} characters from ${article.url}`);
      return extractedText;
    } catch (error) {
      console.error(`Error extracting content from ${article.url}:`, error);
      
      // Mark article as failed
      await storage.updateArticle(article.id, {
        status: 'failed',
        metadata: {
          ...article.metadata,
          extractionError: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  private extractTextFromHtml(html: string): string {
    try {
      // Remove script and style elements
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      
      // Remove HTML comments
      html = html.replace(/<!--[\s\S]*?-->/g, '');

      // Extract content from common article containers
      const contentSelectors = [
        'article',
        '[role="main"]',
        '.post-content',
        '.article-content',
        '.content',
        '.entry-content',
        '.post-body',
        '.article-body',
        '.story-body',
        '.field-item'
      ];

      let content = '';
      
      // Try to find content using common patterns
      for (const selector of contentSelectors) {
        const match = this.extractBySelector(html, selector);
        if (match && match.length > content.length) {
          content = match;
        }
      }

      // If no specific content container found, extract from body
      if (!content) {
        content = this.extractFromBody(html);
      }

      // Clean up the extracted text
      content = this.cleanExtractedText(content);

      return content;
    } catch (error) {
      console.error('Error extracting text from HTML:', error);
      return '';
    }
  }

  private extractBySelector(html: string, selector: string): string {
    try {
      // Simple regex-based extraction for common selectors
      let pattern: RegExp;
      
      if (selector === 'article') {
        pattern = /<article[^>]*>([\s\S]*?)<\/article>/i;
      } else if (selector.startsWith('.')) {
        const className = selector.substring(1);
        pattern = new RegExp(`<[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\/[^>]+>`, 'i');
      } else if (selector.startsWith('[')) {
        // Handle attribute selectors like [role="main"]
        const attrMatch = selector.match(/\[(\w+)="([^"]+)"\]/);
        if (attrMatch) {
          const [, attr, value] = attrMatch;
          pattern = new RegExp(`<[^>]*${attr}="[^"]*${value}[^"]*"[^>]*>([\\s\\S]*?)<\/[^>]+>`, 'i');
        } else {
          return '';
        }
      } else {
        pattern = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\/${selector}>`, 'i');
      }

      const match = html.match(pattern);
      return match ? this.stripHtmlTags(match[1]) : '';
    } catch (error) {
      return '';
    }
  }

  private extractFromBody(html: string): string {
    // Extract from body tag
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!bodyMatch) return '';

    let bodyContent = bodyMatch[1];
    
    // Remove common non-content elements
    bodyContent = bodyContent.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
    bodyContent = bodyContent.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '');
    bodyContent = bodyContent.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
    bodyContent = bodyContent.replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, '');
    bodyContent = bodyContent.replace(/<div[^>]*class="[^"]*(?:sidebar|menu|navigation|ad|advertisement)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

    return this.stripHtmlTags(bodyContent);
  }

  private stripHtmlTags(html: string): string {
    // Remove HTML tags but preserve some formatting
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private cleanExtractedText(text: string): string {
    // Remove excess whitespace and clean up text
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/^\s+|\s+$/gm, '')
      .trim();
  }

  async processExtractionJobs(): Promise<void> {
    const jobs = await storage.getJobsByStatus('pending');
    const extractionJobs = jobs.filter(job => job.type === 'extract');

    for (const job of extractionJobs) {
      try {
        await storage.updateJob(job.id, {
          status: 'processing',
          startedAt: new Date()
        });

        const { articleId } = job.data;
        const article = await storage.getUser(articleId);
        
        if (!article) {
          throw new Error(`Article not found: ${articleId}`);
        }

        await this.extractArticleContent(article as any);

        // Create humanization job
        await storage.createJob({
          type: 'humanize',
          status: 'pending',
          data: { articleId }
        });

        await storage.updateJob(job.id, {
          status: 'completed',
          completedAt: new Date()
        });

      } catch (error) {
        console.error(`Error processing extraction job ${job.id}:`, error);
        
        await storage.updateJob(job.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
          attempts: (job.attempts || 0) + 1
        });
      }
    }
  }
}
