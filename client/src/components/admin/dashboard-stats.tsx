import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats } from "@shared/schema";

interface DashboardStatsProps {
  stats?: DashboardStats;
  isLoading: boolean;
}

const statItems = [
  {
    key: 'articlesToday' as keyof DashboardStats,
    label: 'Articles Today',
    icon: '📰',
    color: 'bg-chart-1'
  },
  {
    key: 'pendingReview' as keyof DashboardStats,
    label: 'Pending Review',
    icon: '⏳',
    color: 'bg-chart-2'
  },
  {
    key: 'published' as keyof DashboardStats,
    label: 'Published',
    icon: '✅',
    color: 'bg-chart-3'
  },
  {
    key: 'factChecks' as keyof DashboardStats,
    label: 'Fact Checks',
    icon: '🔍',
    color: 'bg-chart-4'
  }
];

export default function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="dashboard-stats">
      {statItems.map((item) => (
        <Card key={item.key}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center`}>
                <span className="text-white text-sm">{item.icon}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold text-foreground" data-testid={`stat-${item.key}`}>
                  {stats?.[item.key] ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
