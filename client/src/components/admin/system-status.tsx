import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueueStatus, ApiUsage } from "@shared/schema";

interface SystemStatusProps {
  queueStatus?: QueueStatus;
  apiUsage?: ApiUsage;
  isLoading: boolean;
}

export default function SystemStatus({ queueStatus, apiUsage, isLoading }: SystemStatusProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Job Queue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const queueItems = [
    { label: 'RSS Fetchers', value: queueStatus?.rssFetchers || 0, status: 'active' },
    { label: 'Content Extractors', value: queueStatus?.extractors || 0, status: 'active' },
    { label: 'AI Humanizers', value: queueStatus?.humanizers || 0, status: 'busy' },
    { label: 'Fact Checkers', value: queueStatus?.factCheckers || 0, status: 'active' }
  ];

  const geminiUsagePercent = apiUsage ? (apiUsage.geminiCalls / apiUsage.geminiLimit) * 100 : 0;
  const newsApiUsagePercent = apiUsage ? (apiUsage.newsApiRequests / apiUsage.newsApiLimit) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="system-status">
      {/* Job Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle>Job Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {queueItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    item.status === 'busy' ? 'bg-chart-4' : 'bg-accent'
                  }`}></div>
                  <Badge variant="outline" data-testid={`queue-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {item.status === 'busy' ? 'Busy' : 'Active'} ({item.value})
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Gemini API */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gemini API Calls</span>
                <span className="text-sm font-medium" data-testid="gemini-usage">
                  {apiUsage?.geminiCalls || 0} / {apiUsage?.geminiLimit || 0}
                </span>
              </div>
              <Progress value={geminiUsagePercent} className="w-full" />
            </div>

            {/* News API */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">News API Requests</span>
                <span className="text-sm font-medium" data-testid="news-api-usage">
                  {apiUsage?.newsApiRequests || 0} / {apiUsage?.newsApiLimit || 0}
                </span>
              </div>
              <Progress value={newsApiUsagePercent} className="w-full" />
            </div>

            {/* Database Operations */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Database Operations</span>
              <span className="text-sm font-medium" data-testid="db-operations">
                {apiUsage?.mongoOperations?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
