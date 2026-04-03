import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, getDay, isSameMonth, isToday, isBefore } from "date-fns";

const REPORT_COLORS: Record<string, string> = {
  narrative: "bg-blue-500",
  financial: "bg-amber-500",
  impact: "bg-blue-500",
  compliance: "bg-amber-500",
  m_and_e: "bg-blue-500",
  annual: "bg-amber-500",
  audit: "bg-red-500",
};

export function GrantCalendar() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: reports = [] } = useQuery({
    queryKey: ["grant-calendar-reports", orgId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grant_reports")
        .select("*, grants(grant_name, donor_name)")
        .gte("due_date", format(monthStart, "yyyy-MM-dd"))
        .lte("due_date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const days = useMemo(() => {
    const interval = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart);
    const paddingBefore = startDay === 0 ? 6 : startDay - 1;
    return { interval, paddingBefore };
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    reports.forEach((r: any) => {
      const key = r.due_date;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [reports]);

  const getEventColor = (report: any) => {
    const isOverdue = report.status !== "submitted" && report.status !== "approved" && isBefore(new Date(report.due_date), new Date());
    if (isOverdue) return "bg-red-800";
    return REPORT_COLORS[report.report_type] || "bg-blue-500";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Grant Report Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
              <div key={d} className="text-xs font-medium text-muted-foreground text-center py-1">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: days.paddingBefore }).map((_, i) => (
              <div key={`pad-${i}`} className="h-20 bg-muted/20 rounded" />
            ))}
            {days.interval.map(day => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate[dateKey] || [];
              return (
                <div
                  key={dateKey}
                  className={`h-20 p-1 rounded border ${isToday(day) ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/30"}`}
                >
                  <span className={`text-xs ${isToday(day) ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((evt: any) => (
                      <button
                        key={evt.id}
                        className={`h-2 w-2 rounded-full ${getEventColor(evt)} cursor-pointer`}
                        onClick={() => setSelectedEvent(evt)}
                        title={evt.report_title}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Narrative</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Financial</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Audit</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-800" /> Overdue</span>
          </div>
        </CardContent>
      </Card>

      {/* Event detail sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedEvent?.report_title}</SheetTitle>
          </SheetHeader>
          {selectedEvent && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-muted-foreground">Grant</p>
                <p className="font-medium">{selectedEvent.grants?.grant_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Donor</p>
                <p className="font-medium">{selectedEvent.grants?.donor_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Report Type</p>
                <Badge variant="outline">{selectedEvent.report_type?.replace("_", " ")}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{new Date(selectedEvent.due_date).toLocaleDateString("en-KE")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={selectedEvent.status === "submitted" ? "default" : "secondary"}>{selectedEvent.status}</Badge>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
