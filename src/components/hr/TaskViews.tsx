import { useMemo, useState } from "react";
import { addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, eachDayOfInterval } from "date-fns";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { canTransitionTaskStatus, isOverdueTask, TASK_STATUSES, type TaskStatus } from "@/lib/workManagement";
import { cn } from "@/lib/utils";

export const BOARD_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "blocked", label: "Blocked" },
  { status: "completed", label: "Completed" },
];

export const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const priorityTone: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/10 text-info",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

type Task = { id: string; title: string; status: string; priority: string; due_date: string | null; assigned_to: string | null; is_sensitive: boolean };

interface ViewProps {
  tasks: Task[];
  memberName: (id: string | null) => string;
  onMove: (id: string, status: TaskStatus) => void;
  disabled?: boolean;
}

export function TaskBoard({ tasks, memberName, onMove, disabled }: ViewProps) {
  const { toast } = useToast();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const drop = (target: TaskStatus) => {
    setOver(null);
    const task = tasks.find(t => t.id === dragId);
    setDragId(null);
    if (!task) return;
    const from = task.status.toLowerCase() as TaskStatus;
    if (from === target) return;
    if (!canTransitionTaskStatus(from, target)) {
      toast({ title: "Move not allowed", description: `A task can't go from ${from.replace(/_/g, " ")} to ${target.replace(/_/g, " ")}.`, variant: "destructive" });
      return;
    }
    onMove(task.id, target);
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {BOARD_COLUMNS.map(col => {
        const items = tasks.filter(t => t.status.toLowerCase() === col.status);
        return (
          <section
            key={col.status}
            aria-label={col.label}
            onDragOver={(e) => { if (!disabled) { e.preventDefault(); setOver(col.status); } }}
            onDragLeave={() => setOver(null)}
            onDrop={() => drop(col.status)}
            className={cn("rounded-xl border bg-muted/30 p-2 min-h-[220px] transition-colors", over === col.status && "border-primary bg-primary/5")}
          >
            <header className="flex items-center justify-between px-1.5 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
            </header>
            <div className="space-y-2">
              {items.map(t => {
                const overdue = isOverdueTask(t.status.toLowerCase(), t.due_date, today);
                return (
                  <article
                    key={t.id}
                    draggable={!disabled}
                    onDragStart={() => setDragId(t.id)}
                    className={cn("rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing", overdue && "border-destructive/40")}
                  >
                    <p className="text-sm font-medium leading-snug">{t.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">{memberName(t.assigned_to)}</span>
                      <Badge className={cn("text-[10px]", priorityTone[t.priority.toLowerCase()])}>{t.priority}</Badge>
                    </div>
                    {(t.due_date || t.is_sensitive) && (
                      <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                        {t.due_date && <span className={overdue ? "text-destructive font-medium" : "text-muted-foreground"}>{overdue ? "Overdue · " : "Due "}{format(new Date(`${t.due_date}T00:00:00`), "MMM d")}</span>}
                        {t.is_sensitive && <span className="flex items-center gap-0.5 text-warning"><AlertTriangle className="h-3 w-3" />Sensitive</span>}
                      </div>
                    )}
                  </article>
                );
              })}
              {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nothing here</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function TaskCalendar({ tasks, memberName }: Omit<ViewProps, "onMove">) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const today = new Date().toISOString().slice(0, 10);
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month]);
  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    tasks.forEach(t => { if (t.due_date) m.set(t.due_date, [...(m.get(t.due_date) || []), t]); });
    return m;
  }, [tasks]);
  const undated = tasks.filter(t => !t.due_date).length;

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-3">
        <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-semibold">{format(month, "MMMM yyyy")}</span>
        <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium uppercase text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} className="py-1.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const items = byDay.get(key) || [];
          return (
            <div key={key} className={cn("min-h-[92px] border-b border-r p-1.5", !isSameMonth(day, month) && "bg-muted/30 text-muted-foreground", key === today && "bg-primary/5")}>
              <span className={cn("text-[11px] tabular-nums", key === today && "font-semibold text-primary")}>{format(day, "d")}</span>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map(t => (
                  <div key={t.id} title={`${t.title} — ${memberName(t.assigned_to)}`}
                    className={cn("truncate rounded px-1 py-0.5 text-[10px]", isOverdueTask(t.status.toLowerCase(), t.due_date, today) ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                    {t.title}
                  </div>
                ))}
                {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
      {undated > 0 && <p className="p-3 text-xs text-muted-foreground">{undated} task{undated === 1 ? "" : "s"} without a due date not shown.</p>}
    </div>
  );
}

export function sortTasks<T extends { priority: string; due_date: string | null; title: string }>(list: T[], by: "due" | "priority" | "title"): T[] {
  const copy = [...list];
  if (by === "title") return copy.sort((a, b) => a.title.localeCompare(b.title));
  if (by === "priority") return copy.sort((a, b) => (PRIORITY_ORDER[a.priority.toLowerCase()] ?? 9) - (PRIORITY_ORDER[b.priority.toLowerCase()] ?? 9));
  return copy.sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
}

export const ALL_TASK_STATUSES = TASK_STATUSES;
