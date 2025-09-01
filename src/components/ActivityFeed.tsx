import { useState, useEffect } from 'react';
import { Activity, Clock, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityItem {
  id: string | number;
  type: 'added' | 'updated' | 'deleted' | 'viewed';
  alumni_name: string;
  user_name: string;
  created_at: string;
  details?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  showTimestamp?: boolean;
  className?: string;
}

export function ActivityFeed({ 
  activities, 
  maxItems = 10, 
  showTimestamp = true,
  className = ""
}: ActivityFeedProps) {
  const [displayActivities, setDisplayActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    setDisplayActivities(activities.slice(0, maxItems));
  }, [activities, maxItems]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'added': return <Plus className="h-3 w-3 text-green-600" />;
      case 'updated': return <Edit className="h-3 w-3 text-blue-600" />;
      case 'deleted': return <Trash2 className="h-3 w-3 text-red-600" />;
      case 'viewed': return <Eye className="h-3 w-3 text-gray-600" />;
      default: return <Activity className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'added': return 'bg-green-100 border-green-200 dark:bg-green-900 dark:border-green-800';
      case 'updated': return 'bg-blue-100 border-blue-200 dark:bg-blue-900 dark:border-blue-800';
      case 'deleted': return 'bg-red-100 border-red-200 dark:bg-red-900 dark:border-red-800';
      case 'viewed': return 'bg-gray-100 border-gray-200 dark:bg-gray-900 dark:border-gray-800';
      default: return 'bg-muted border-muted-foreground/20';
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'added': return `${activity.alumni_name} was added to alumni directory`;
      case 'updated': return `${activity.alumni_name}'s profile was updated`;
      case 'deleted': return `Alumni record was removed`;
      case 'viewed': return `${activity.alumni_name}'s profile was viewed`;
      default: return `Activity on ${activity.alumni_name}`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const activityTime = new Date(dateString);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (displayActivities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          Recent Activity
          <Badge variant="secondary" className="text-xs">
            {displayActivities.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-32">
          <div className="space-y-3">
            {displayActivities.map((activity, index) => (
              <div
                key={activity.id}
                className={`p-2 rounded-lg border transition-all duration-200 animate-fade-in ${getActivityColor(activity.type)}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight">
                      {getActivityText(activity)}
                    </p>
                    {activity.details && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.details}
                      </p>
                    )}
                    {showTimestamp && (
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-2 w-2 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.created_at)}
                        </span>
                        {activity.user_name !== 'System' && (
                          <span className="text-xs text-muted-foreground">
                            by {activity.user_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}