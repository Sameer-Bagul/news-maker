import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, ExternalLink, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

export default function Article() {
  const { slug } = useParams();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['/api/articles', slug],
    enabled: !!slug,
  });

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load article. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Article not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Navigation */}
      <Link href="/">
        <Button variant="ghost" className="mb-6" data-testid="back-home">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </Link>

      {/* Article Header */}
      <header className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
          <Badge variant="secondary" data-testid={`category-${article.category}`}>
            {article.category?.toUpperCase()}
          </Badge>
          <span>•</span>
          <time dateTime={article.publishedAt} data-testid="publish-date">
            {article.publishedAt ? format(new Date(article.publishedAt), "PPP") : "Recently"}
          </time>
          {article.report && (
            <>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-accent" />
                <span className="text-accent font-medium" data-testid="ai-verified">AI Verified</span>
              </div>
            </>
          )}
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold leading-tight text-foreground mb-4" data-testid="article-title">
          {article.title}
        </h1>

        {/* TL;DR */}
        {article.report?.tldr && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-foreground mb-2">TL;DR</h2>
            <p className="text-muted-foreground" data-testid="article-tldr">
              {article.report.tldr}
            </p>
          </div>
        )}

        {/* Author and Source */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={`https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face`} />
              <AvatarFallback>
                {article.authors?.[0]?.split(' ').map(n => n[0]).join('') || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground" data-testid="article-author">
                {article.authors?.[0] || 'NewsAI Team'}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="article-source">
                {article.source?.name || 'Unknown Source'}
              </p>
            </div>
          </div>

          <Button variant="outline" asChild data-testid="source-link">
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Original Source
            </a>
          </Button>
        </div>
      </header>

      {/* Article Image */}
      <div className="mb-8">
        <img 
          src={`https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=600`}
          alt="Article illustration"
          className="w-full h-64 lg:h-96 object-cover rounded-lg"
          data-testid="article-image"
        />
      </div>

      {/* Key Points */}
      {article.report?.bullets && article.report.bullets.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Key Points</h2>
          <ul className="space-y-2" data-testid="article-bullets">
            {article.report.bullets.map((bullet, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span className="text-muted-foreground">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Article Content */}
      <div className="prose prose-lg max-w-none">
        {article.report?.humanizedHtml ? (
          <div 
            dangerouslySetInnerHTML={{ __html: article.report.humanizedHtml }}
            data-testid="article-content"
            className="text-foreground leading-relaxed"
          />
        ) : (
          <div className="text-muted-foreground" data-testid="no-content">
            <p>Article content is being processed. Please check back later.</p>
          </div>
        )}
      </div>

      {/* Entities */}
      {article.report?.entities && (
        <div className="mt-8 pt-8 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Related Entities</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {article.report.entities.persons.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">People</h4>
                <div className="flex flex-wrap gap-2">
                  {article.report.entities.persons.map((person, index) => (
                    <Badge key={index} variant="outline" data-testid={`person-${index}`}>
                      {person}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {article.report.entities.orgs.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Organizations</h4>
                <div className="flex flex-wrap gap-2">
                  {article.report.entities.orgs.map((org, index) => (
                    <Badge key={index} variant="outline" data-testid={`org-${index}`}>
                      {org}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {article.report.entities.places.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Places</h4>
                <div className="flex flex-wrap gap-2">
                  {article.report.entities.places.map((place, index) => (
                    <Badge key={index} variant="outline" data-testid={`place-${index}`}>
                      {place}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Article Meta */}
      <div className="mt-8 pt-8 border-t border-border text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p>Published: {article.publishedAt ? format(new Date(article.publishedAt), "PPP") : "Recently"}</p>
            {article.report?.aiScore && (
              <p>AI Confidence Score: {article.report.aiScore}%</p>
            )}
          </div>
          {article.source && (
            <p>Source: {article.source.name}</p>
          )}
        </div>
      </div>
    </article>
  );
}
