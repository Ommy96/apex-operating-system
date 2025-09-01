import { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RealTimeIndicatorProps {
  isConnected?: boolean;
  lastUpdate?: Date;
  showActivity?: boolean;
}

export function RealTimeIndicator({ 
  isConnected = true, 
  lastUpdate, 
  showActivity = true 
}: RealTimeIndicatorProps) {
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    if (showActivity && lastUpdate) {
      setPulseActive(true);
      const timer = setTimeout(() => setPulseActive(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdate, showActivity]);

  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <>
          <div className={`w-2 h-2 bg-green-500 rounded-full ${pulseActive ? 'animate-pulse' : 'animate-pulse'}`} />
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            Live
          </Badge>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>
        </>
      )}
      
      {showActivity && (
        <Activity className={`h-3 w-3 text-muted-foreground ${pulseActive ? 'animate-spin' : ''}`} />
      )}
      
      {lastUpdate && (
        <span className="text-xs text-muted-foreground">
          {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}