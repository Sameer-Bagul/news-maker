import { format } from "date-fns";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle } from "lucide-react";
import type { ArticleWithReport } from "@shared/schema";

interface ArticleCardProps {
  article: ArticleWithReport;
}

const categoryImages = {
  technology: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
  science: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
  business: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
  health: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
  politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
  default: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200"
};

const categoryColors = {
  technology: "bg-chart-1",
  science: "bg-chart-2", 
  business: "bg-chart-1",
  health: "bg-chart-3",
  politics: "bg-chart-4",
  default: "bg-primary"
};

export default function ArticleCard({ article }: ArticleCardProps) {
  const categoryKey = article.category?.toLowerCase() as keyof typeof categoryImages;
  const imageUrl = categoryImages[categoryKey] || categoryImages.default;
  const categoryColor = categoryColors[categoryKey] || categoryColors.default;

  return (
    <article className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow" data-testid={`article-card-${article.id}`}>
      <img 
        src={imageUrl}
        alt={`${article.category} news image`}
        className="w-full h-48 object-cover"
        data-testid={`article-image-${article.id}`}
      />
      <div className="p-4">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
          <Badge className={`${categoryColor} text-white px-2 py-1 rounded`} data-testid={`article-category-${article.id}`}>
            {article.category?.toUpperCase() || 'NEWS'}
          </Badge>
          <time dateTime={article.publishedAt} data-testid={`article-time-${article.id}`}>
            {article.publishedAt ? format(new Date(article.publishedAt), "p") : "Recently"}
          </time>
          {article.report && (
            <>
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-accent" />
                <span className="text-accent font-medium" data-testid={`article-verified-${article.id}`}>Verified</span>
              </span>
            </>
          )}
        </div>
        
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2" data-testid={`article-title-${article.id}`}>
          {article.title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`article-summary-${article.id}`}>
          {article.report?.tldr || article.metadata?.description || 
           "Stay informed with the latest developments in this important story."}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Avatar className="w-4 h-4">
              <AvatarImage 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=24&h=24&fit=crop&crop=face"
                alt="Author profile"
              />
              <AvatarFallback>
                {article.authors?.[0]?.split(' ').map(n => n[0]).join('') || 'A'}
              </AvatarFallback>
            </Avatar>
            <span data-testid={`article-author-${article.id}`}>
              {article.authors?.[0] || article.source?.name || 'NewsAI Team'}
            </span>
          </div>
          
          <Link href={`/article/${article.slug}`}>
            <span className="text-primary hover:text-primary/80 text-sm font-medium cursor-pointer" data-testid={`article-read-more-${article.id}`}>
              Read more →
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
