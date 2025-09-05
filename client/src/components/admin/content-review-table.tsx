import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Report, Article, Source } from "@shared/schema";

interface ContentReviewTableProps {
  reports?: (Report & { article: Article; source?: Source })[];
  isLoading: boolean;
}

const statusColors = {
  'humanized': 'bg-chart-4 text-white',
  'extracted': 'bg-chart-2 text-white',
  'fetched': 'bg-muted text-muted-foreground',
  'published': 'bg-accent text-accent-foreground',
  'rejected': 'bg-destructive text-destructive-foreground'
};

export default function ContentReviewTable({ reports, isLoading }: ContentReviewTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const approveMutation = useMutation({
    mutationFn: async ({ articleId, notes }: { articleId: string; notes?: string }) => {
      const response = await apiRequest('POST', `/api/admin/articles/${articleId}/approve`, { notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports/review'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Article Approved",
        description: "The article has been approved and published successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Approval Failed", 
        description: error instanceof Error ? error.message : "Failed to approve article",
        variant: "destructive",
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ articleId, reason }: { articleId: string; reason?: string }) => {
      const response = await apiRequest('POST', `/api/admin/articles/${articleId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports/review'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Article Rejected",
        description: "The article has been rejected successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Rejection Failed",
        description: error instanceof Error ? error.message : "Failed to reject article", 
        variant: "destructive",
      });
    }
  });

  const handleApprove = async (articleId: string) => {
    setProcessingIds(prev => new Set(prev).add(articleId));
    try {
      await approveMutation.mutateAsync({ articleId });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    }
  };

  const handleReject = async (articleId: string) => {
    setProcessingIds(prev => new Set(prev).add(articleId));
    try {
      await rejectMutation.mutateAsync({ articleId, reason: "Quality review rejection" });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Articles Pending Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Articles Pending Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No articles are currently pending review.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="content-review-table">
      <CardHeader>
        <CardTitle>Articles Pending Review ({reports.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Title</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Source</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">AI Score</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const isProcessing = processingIds.has(report.article.id);
                const statusColor = statusColors[report.article.status as keyof typeof statusColors] || statusColors.fetched;
                
                return (
                  <tr key={report.id} className="border-b border-border hover:bg-muted/30" data-testid={`review-row-${report.article.id}`}>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground" data-testid={`review-title-${report.article.id}`}>
                          {report.article.title}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`review-summary-${report.article.id}`}>
                          {report.tldr || "Processing..."}
                        </p>
                      </div>
                    </td>
                    
                    <td className="p-4 text-sm text-muted-foreground" data-testid={`review-source-${report.article.id}`}>
                      {report.source?.name || 'Unknown'}
                    </td>
                    
                    <td className="p-4">
                      <Badge className={statusColor} data-testid={`review-status-${report.article.id}`}>
                        {report.article.status}
                      </Badge>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Progress value={report.aiScore || 0} className="w-16" />
                        <span className="text-sm text-muted-foreground" data-testid={`review-score-${report.article.id}`}>
                          {report.aiScore || 0}%
                        </span>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          className="bg-accent text-accent-foreground hover:bg-accent/90"
                          onClick={() => handleApprove(report.article.id)}
                          disabled={isProcessing}
                          data-testid={`approve-${report.article.id}`}
                        >
                          {isProcessing ? "..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(report.article.id)}
                          disabled={isProcessing}
                          data-testid={`reject-${report.article.id}`}
                        >
                          {isProcessing ? "..." : "Reject"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isProcessing}
                          data-testid={`edit-${report.article.id}`}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
