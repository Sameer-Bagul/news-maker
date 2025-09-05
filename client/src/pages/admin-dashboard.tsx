import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import DashboardStats from "@/components/admin/dashboard-stats";
import ContentReviewTable from "@/components/admin/content-review-table";
import SystemStatus from "@/components/admin/system-status";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, LogOut } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
      setLocation('/auth');
    }
  }, [user, setLocation]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: !!user && (user.role === 'admin' || user.role === 'editor'),
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/admin/reports/review'],
    enabled: !!user && (user.role === 'admin' || user.role === 'editor'),
  });

  const { data: queueStatus, isLoading: queueLoading } = useQuery({
    queryKey: ['/api/admin/queue-status'],
    enabled: !!user && user.role === 'admin',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: apiUsage, isLoading: apiLoading } = useQuery({
    queryKey: ['/api/admin/api-usage'],
    enabled: !!user && user.role === 'admin',
    refetchInterval: 60000, // Refresh every minute
  });

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access the admin dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'editor') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="dashboard-title">
            Content Management Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground" data-testid="user-role">
            Role: {user.role}
          </span>
          <Button variant="destructive" onClick={handleLogout} data-testid="logout-button">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="review" data-testid="tab-review">Content Review</TabsTrigger>
          {user.role === 'admin' && (
            <TabsTrigger value="system" data-testid="tab-system">System Status</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <DashboardStats stats={stats} isLoading={statsLoading} />
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button data-testid="refresh-all-sources">
                  Refresh All Sources
                </Button>
                <Button variant="outline" data-testid="export-data">
                  Export Data
                </Button>
                <Button variant="outline" data-testid="view-analytics">
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Review Tab */}
        <TabsContent value="review" className="space-y-6">
          <ContentReviewTable reports={reports} isLoading={reportsLoading} />
        </TabsContent>

        {/* System Status Tab */}
        {user.role === 'admin' && (
          <TabsContent value="system" className="space-y-6">
            <SystemStatus 
              queueStatus={queueStatus}
              apiUsage={apiUsage}
              isLoading={queueLoading || apiLoading}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
