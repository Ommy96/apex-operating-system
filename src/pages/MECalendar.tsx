import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Plus, Calendar, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isBefore, addMonths, subMonths, isToday, isSameMonth } from "date-fns";
import { toast } from "sonner";

export default function MECalendar() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [recordValue, setRecordValue] = useState("");
  const [recordNote, setRecordNote] = useState("");
  const [scheduleForm, setScheduleForm] = useState({ indicator_id: "", collection_frequency: "monthly", assigned_to: "" });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const today = new Date();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["me-schedules", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("me_data_schedule")
        .select("*, indicators(name, code, unit)")
        .eq("org_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: indicators = [] } = useQuery({
    queryKey: ["indicators-for-schedule", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("indicators").select("id, name, code").eq("organization_id", orgId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members-me", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("organization_members").select("user_id, profiles(full_name, email)").eq("organization_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const createSchedule = useMutation({
    mutationFn: async () => {
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + (scheduleForm.collection_frequency === "monthly" ? 30 : scheduleForm.collection_frequency === "quarterly" ? 90 : 180));
      const { error } = await supabase.from("me_data_schedule").insert({
        org_id: orgId!,
        indicator_id: scheduleForm.indicator_id,
        collection_frequency: scheduleForm.collection_frequency,
        next_due_date: format(nextDue, "yyyy-MM-dd"),
        assigned_to: scheduleForm.assigned_to || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-schedules"] });
      toast.success("Indicator scheduled");
      setScheduleOpen(false);
      setScheduleForm({ indicator_id: "", collection_frequency: "monthly", assigned_to: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const recordData = useMutation({
    mutationFn: async () => {
      if (!selectedEvent) return;
      const now = new Date();
      const periodStart = format(startOfMonth(now), "yyyy-MM-dd");
      const periodEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const { error: valErr } = await supabase.from("indicator_values").insert({
        indicator_id: selectedEvent.indicator_id,
        period_start: periodStart,
        period_end: periodEnd,
        actual_value: parseFloat(recordValue),
        is_manual_override: true,
        notes: recordNote || null,
      });
      if (valErr) throw valErr;
      const nextDue = new Date();
      const freq = selectedEvent.collection_frequency;
      nextDue.setDate(nextDue.getDate() + (freq === "monthly" ? 30 : freq === "quarterly" ? 90 : freq === "biannual" ? 180 : 365));
      await supabase.from("me_data_schedule").update({ last_collected_at: now.toISOString(), next_due_date: format(nextDue, "yyyy-MM-dd") }).eq("id", selectedEvent.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-schedules"] });
      toast.success("Data recorded");
      setSelectedEvent(null);
      setRecordValue("");
      setRecordNote("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getEventStatus = (s: any) => {
    if (s.last_collected_at && new Date(s.last_collected_at) >= monthStart) return "collected";
    if (isBefore(new Date(s.next_due_date), today)) return "overdue";
    const diff = (new Date(s.next_due_date).getTime() - today.getTime()) / 86400000;
    if (diff <= 7) return "due_soon";
    return "not_due";
  };

  const statusColors: Record<string, string> = {
    collected: "bg-emerald-500",
    due_soon: "bg-amber-500",
    overdue: "bg-destructive",
    not_due: "bg-muted-foreground/40",
  };

  const summary = useMemo(() => {
    let collected = 0, dueSoon = 0, overdue = 0;
    schedules.forEach((s: any) => {
      const st = getEventStatus(s);
      if (st === "collected") collected++;
      else if (st === "due_soon") dueSoon++;
      else if (st === "overdue") overdue++;
    });
    return { collected, dueSoon, overdue };
  }, [schedules, currentMonth]);

  const days = useMemo(() => {
    const interval = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart);
    const paddingBefore = startDay === 0 ? 6 : startDay - 1;
    return { interval, paddingBefore };
  }, [currentMonth]);

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.filter((s: any) => s.next_due_date === dateStr);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-7 gap-1 mt-2">
          {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">M&E Calendar</h1>
          <p className="text-sm text-muted-foreground">Track data collection schedules</p>
        </div>
        <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <SheetTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Schedule Indicator</Button></SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>Schedule Indicator</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Indicator *</Label>
                <Select value={scheduleForm.indicator_id} onValueChange={v => setScheduleForm(p => ({ ...p, indicator_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select indicator" /></SelectTrigger>
                  <SelectContent>{indicators.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Frequency</Label>
                <Select value={scheduleForm.collection_frequency} onValueChange={v => setScheduleForm(p => ({ ...p, collection_frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="biannual">Biannual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Assigned To</Label>
                <Select value={scheduleForm.assigned_to} onValueChange={v => setScheduleForm(p => ({ ...p, assigned_to: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select officer" /></SelectTrigger>
                  <SelectContent>{orgMembers.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{(m.profiles as any)?.full_name || (m.profiles as any)?.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={() => createSchedule.mutate()} disabled={!scheduleForm.indicator_id || createSchedule.isPending} className="w-full">Schedule</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <Badge variant="outline" className="gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" />{summary.collected} collected</Badge>
        <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3 text-amber-500" />{summary.dueSoon} due soon</Badge>
        <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3 text-destructive" />{summary.overdue} overdue</Badge>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-muted/30 rounded-lg overflow-hidden">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 bg-background">{d}</div>
            ))}
            {Array.from({ length: days.paddingBefore }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[60px] bg-muted/10" />
            ))}
            {days.interval.map(date => {
              const events = getEventsForDay(date);
              return (
                <div key={date.toISOString()} className={`min-h-[60px] p-1 bg-background border-t ${isToday(date) ? "ring-2 ring-primary ring-inset" : ""}`}>
                  <span className={`text-xs ${isSameMonth(date, currentMonth) ? "text-foreground" : "text-muted-foreground"}`}>{format(date, "d")}</span>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {events.map((ev: any) => {
                      const status = getEventStatus(ev);
                      return (
                        <button key={ev.id} onClick={() => setSelectedEvent(ev)} className={`h-2 w-2 rounded-full ${statusColors[status]} hover:scale-150 transition-transform`} title={(ev.indicators as any)?.name} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Collected</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Due Soon</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Overdue</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" /> Not Due</span>
          </div>
        </CardContent>
      </Card>

      {/* Event detail drawer */}
      <Sheet open={!!selectedEvent} onOpenChange={(o) => { if (!o) setSelectedEvent(null); }}>
        <SheetContent>
          {selectedEvent && (
            <>
              <SheetHeader><SheetTitle>{(selectedEvent.indicators as any)?.name || "Indicator"}</SheetTitle></SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="text-sm space-y-2">
                  <p><span className="font-medium">Code:</span> {(selectedEvent.indicators as any)?.code}</p>
                  <p><span className="font-medium">Frequency:</span> {selectedEvent.collection_frequency}</p>
                  <p><span className="font-medium">Next Due:</span> {new Date(selectedEvent.next_due_date).toLocaleDateString("en-KE")}</p>
                  {selectedEvent.last_collected_at && <p><span className="font-medium">Last Collected:</span> {new Date(selectedEvent.last_collected_at).toLocaleDateString("en-KE")}</p>}
                </div>
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-medium text-sm">Record Data Now</h4>
                  <div><Label>Value *</Label><Input type="number" value={recordValue} onChange={e => setRecordValue(e.target.value)} placeholder="Enter value" /></div>
                  <div><Label>Note</Label><Input value={recordNote} onChange={e => setRecordNote(e.target.value)} placeholder="Optional note" /></div>
                  <Button onClick={() => recordData.mutate()} disabled={!recordValue || recordData.isPending} className="w-full">Save Data</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
