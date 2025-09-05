import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ArticleHero from "@/components/article/article-hero";
import ArticleCard from "@/components/article/article-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const categories = ["All", "Technology", "Business", "Science", "Politics", "Health"];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: articles, isLoading, error } = useQuery({
    queryKey: ['/api/articles', { category: selectedCategory }],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const featuredArticle = articles?.[0];
  const otherArticles = articles?.slice(1) || [];

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load articles. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breaking News Banner */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 rounded-lg mb-8">
        <div className="flex items-center space-x-2">
          <span className="animate-pulse" data-testid="breaking-indicator">🔴</span>
          <span className="font-semibold">BREAKING</span>
          <span data-testid="breaking-news-text">
            New AI breakthrough in quantum computing reported by researchers
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="mb-12">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <Skeleton className="h-64 w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        ) : featuredArticle ? (
          <ArticleHero article={featuredArticle} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No featured articles available</p>
          </div>
        )}
      </section>

      {/* Article Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-foreground" data-testid="latest-stories-heading">
            Latest Stories
          </h2>
          <div className="flex items-center space-x-2 overflow-x-auto">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
                data-testid={`category-${category.toLowerCase()}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : otherArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="articles-grid">
            {otherArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground" data-testid="no-articles-message">
              No articles found for the selected category
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
