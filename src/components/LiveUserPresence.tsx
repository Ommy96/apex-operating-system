import { useState, useEffect } from 'react';
import { Users, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LiveUserPresenceProps {
  channelName: string;
  pageName: string;
}

export function LiveUserPresence({ channelName, pageName }: LiveUserPresenceProps) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [totalViewers, setTotalViewers] = useState(0);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(channelName);

    const userStatus = {
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      user_email: user.email,
      online_at: new Date().toISOString(),
      page: pageName,
      avatar_color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const allUsers = Object.values(presenceState).flat();
        const otherUsers = allUsers.filter((presence: any) => presence.user_id !== user.id);
        
        setOnlineUsers(otherUsers);
        setTotalViewers(allUsers.length);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // Handle user join if needed
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Handle user leave if needed
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userStatus);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, channelName, pageName]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4 text-green-500" />
          Live Viewers ({totalViewers})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Current User */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  You
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
            </div>
            <span className="text-sm font-medium">You</span>
            <Badge variant="secondary" className="text-xs">
              {user?.role || 'viewer'}
            </Badge>
          </div>

          {/* Other Users */}
          {onlineUsers.slice(0, 5).map((onlineUser: any, index) => (
            <div key={`${onlineUser.user_id}-${index}`} className="flex items-center gap-2">
              <div className="relative">
                <Avatar className="h-6 w-6">
                  <AvatarFallback 
                    className="text-xs text-white"
                    style={{ backgroundColor: onlineUser.avatar_color }}
                  >
                    {getInitials(onlineUser.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
              </div>
              <span className="text-sm">{onlineUser.user_name}</span>
              <Badge variant="outline" className="text-xs">
                viewer
              </Badge>
            </div>
          ))}

          {onlineUsers.length > 5 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>+{onlineUsers.length - 5} more viewing</span>
            </div>
          )}

          {onlineUsers.length === 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>You're the only one here</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
