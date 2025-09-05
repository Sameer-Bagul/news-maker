import { format } from "date-fns";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle } from "lucide-react";
import type { ArticleWithReport } from "@shared/schema";

interface ArticleHeroProps {
  article: ArticleWithReport;
}

export default function ArticleHero({ article }: ArticleHeroProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      <div>
        <img
          src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
          alt="Quantum computing lab with advanced processors"
          className="rounded-xl shadow-lg w-full h-64 object-cover"
          data-testid="hero-image"
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Badge variant="secondary" data-testid={`hero-category-${article.category}`}>
            {article.category?.toUpperCase() || 'NEWS'}
          </Badge>
          <span>•</span>
          <time dateTime={article.publishedAt} data-testid="hero-publish-date">
            {article.publishedAt ? format(new Date(article.publishedAt), "p") : "Recently"}
          </time>
          {article.report && (
            <>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-accent" />
                <span className="text-accent font-medium" data-testid="hero-ai-verified">AI Verified</span>
              </div>
            </>
          )}
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold leading-tight text-foreground" data-testid="hero-title">
          {article.title}
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed" data-testid="hero-tldr">
          {article.report?.tldr || article.metadata?.description || 
           "Breaking news story with comprehensive analysis and fact-checking verification."}
        </p>

        <div className="flex items-center space-x-4">
          <Link href={`/article/${article.slug}`}>
            <Button data-testid="hero-read-more">
              Read Full Article
            </Button>
          </Link>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Avatar className="w-6 h-6">
              <AvatarImage 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=32&h=32&fit=crop&crop=face"
                alt="Author profile"
              />
              <AvatarFallback>
                {article.authors?.[0]?.split(' ').map(n => n[0]).join('') || 'A'}
              </AvatarFallback>
            </Avatar>
            <span data-testid="hero-author">
              {article.authors?.[0] || article.source?.name || 'NewsAI Team'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
