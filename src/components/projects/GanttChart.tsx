import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInDays, format, addDays, startOfWeek, eachWeekOfInterval, isBefore, isAfter, max, min } from "date-fns";

interface Activity {
  id: string;
  title: string;
  name?: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  status?: string | null;
  responsible_staff_id?: string | null;
}

interface GanttChartProps {
  activities: Activity[];
  rangeMonths?: number;
}

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-muted-foreground/40",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  delayed: "bg-destructive",
};

export function GanttChart({ activities, rangeMonths = 3 }: GanttChartProps) {
  const validActivities = activities.filter(a => a.planned_start_date && a.planned_end_date);

  const { weeks, timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (validActivities.length === 0) {
      const s = new Date();
      const e = addDays(s, 90);
      return { weeks: eachWeekOfInterval({ start: s, end: e }, { weekStartsOn: 1 }), timelineStart: s, timelineEnd: e, totalDays: 90 };
    }
    const dates = validActivities.flatMap(a => [new Date(a.planned_start_date!), new Date(a.planned_end_date!)]);
    const s = startOfWeek(min(dates), { weekStartsOn: 1 });
    const e = addDays(max(dates), 7);
    return {
      weeks: eachWeekOfInterval({ start: s, end: e }, { weekStartsOn: 1 }),
      timelineStart: s,
      timelineEnd: e,
      totalDays: differenceInDays(e, s),
    };
  }, [validActivities]);

  const today = new Date();
  const todayOffset = Math.max(0, Math.min(100, (differenceInDays(today, timelineStart) / totalDays) * 100));

  const getBarStyle = (activity: Activity) => {
    const start = new Date(activity.planned_start_date!);
    const end = new Date(activity.planned_end_date!);
    const left = (differenceInDays(start, timelineStart) / totalDays) * 100;
    const width = (differenceInDays(end, start) / totalDays) * 100;
    return { left: `${Math.max(0, left)}%`, width: `${Math.max(1, width)}%` };
  };

  const getStatus = (activity: Activity) => {
    if (activity.status === "completed") return "completed";
    if (activity.status === "in_progress") {
      if (activity.planned_end_date && isBefore(new Date(activity.planned_end_date), today)) return "delayed";
      return "in_progress";
    }
    if (activity.planned_end_date && isBefore(new Date(activity.planned_end_date), today)) return "delayed";
    return "planned";
  };

  if (validActivities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Add planned dates to activities to see the workplan
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Time axis */}
          <div className="flex">
            <div className="w-[200px] shrink-0" />
            <div className="flex-1 relative h-10 border-b">
              {weeks.map((week, i) => {
                const left = (differenceInDays(week, timelineStart) / totalDays) * 100;
                return (
                  <div key={i} className="absolute top-0 text-[10px] text-muted-foreground" style={{ left: `${left}%` }}>
                    <div className="border-l border-muted h-10 pl-1">
                      {format(week, "dd MMM")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activities */}
          {validActivities.map(activity => {
            const status = getStatus(activity);
            const barStyle = getBarStyle(activity);
            return (
              <div key={activity.id} className="flex items-center h-10 border-b border-muted/30 hover:bg-muted/10">
                <div className="w-[200px] shrink-0 px-2 text-xs font-medium text-foreground truncate">
                  {activity.title || activity.name}
                </div>
                <div className="flex-1 relative h-full">
                  {/* Today line */}
                  <div className="absolute top-0 bottom-0 border-l border-dashed border-destructive/50 z-10" style={{ left: `${todayOffset}%` }} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute top-2 h-6 rounded ${STATUS_COLORS[status]} opacity-80 hover:opacity-100 cursor-pointer transition-opacity`}
                        style={barStyle}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{activity.title || activity.name}</p>
                      <p className="text-xs">{format(new Date(activity.planned_start_date!), "dd MMM yyyy")} – {format(new Date(activity.planned_end_date!), "dd MMM yyyy")}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">{status.replace("_", " ")}</Badge>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex gap-4 mt-3 px-2 text-xs">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-muted-foreground/40" /> Planned</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-500" /> In Progress</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Completed</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-destructive" /> Delayed</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
