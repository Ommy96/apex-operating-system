import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, CheckSquare, Plus, List, Columns3, CalendarDays, Search } from "lucide-react";
import { TaskBoard, TaskCalendar, sortTasks } from "@/components/hr/TaskViews";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkManagement, useWorkRecordOptions } from "@/hooks/useWorkManagement";
import { usePermissions } from "@/hooks/usePermissions";
import { allowedTaskTransitions, isOverdueTask, type TaskStatus, type WorkRecordType } from "@/lib/workManagement";

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/10 text-info",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

const emptyForm = {
  title: "",
  description: "",
  assigned_to: "",
  priority: "medium",
  due_date: "",
  case_id: "",
  related_record_type: "none" as WorkRecordType | "none",
  related_record_id: "",
  is_sensitive: false,
};

export function TaskManagement() {
  const { tasks, createTask, updateTaskStatus, orgMembers, cases, workload } = useWorkManagement();
  const { can } = usePermissions();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const recordOptions = useWorkRecordOptions(form.related_record_type);

  const members = orgMembers.data ?? [];
  const allTasks = tasks.data ?? [];
  const [view, setView] = useState<"list" | "board" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [sortBy, setSortBy] = useState<"due" | "priority" | "title">("due");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = allTasks.filter((task) =>
      (filter === "all" || task.status.toLowerCase() === filter) &&
      (assignee === "all" || (assignee === "unassigned" ? !task.assigned_to : task.assigned_to === assignee)) &&
      (!q || task.title.toLowerCase().includes(q) || (task.description || "").toLowerCase().includes(q)));
    return sortTasks(list, sortBy);
  }, [allTasks, filter, assignee, search, sortBy]);
  const boardTasks = useMemo(() => filtered.filter((t) => t.status.toLowerCase() !== "cancelled"), [filtered]);
  const memberById = useMemo(() => new Map(members.map((member: any) => [member.user_id, member])), [members]);
  const caseById = useMemo(() => new Map((cases.data ?? []).map((item: any) => [item.id, item])), [cases.data]);
  const today = new Date().toISOString().slice(0, 10);
  const openCount = allTasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length;
  const overdueCount = allTasks.filter((task) => isOverdueTask(task.status, task.due_date, today)).length;

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createTask.mutate({
      title: form.title,
      description: form.description || undefined,
      assigned_to: form.assigned_to || undefined,
      priority: form.priority,
      due_date: form.due_date || undefined,
      case_id: form.case_id || undefined,
      related_record_type: form.related_record_type === "none" ? undefined : form.related_record_type,
      related_record_id: form.related_record_id || undefined,
      is_sensitive: form.is_sensitive,
    }, { onSuccess: () => { setShowCreate(false); setForm(emptyForm); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Task Management</h3>
          <p className="text-sm text-muted-foreground">Assign and track actions that move work forward</p>
        </div>
        {can.manageTasks && <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Task</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Link to case</Label>
                <Select value={form.case_id || "none"} onValueChange={(value) => setForm({ ...form, case_id: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="No linked case" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No linked case</SelectItem>{(cases.data ?? []).map((item: any) => <SelectItem key={item.id} value={item.id}>{item.case_number || item.case_type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Link to existing record</Label>
                  <Select value={form.related_record_type} onValueChange={(value) => setForm({ ...form, related_record_type: value as WorkRecordType | "none", related_record_id: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No linked record</SelectItem>
                      <SelectItem value="life_event">Life event</SelectItem>
                      <SelectItem value="vulnerability_assessment">Vulnerability assessment</SelectItem>
                      <SelectItem value="need">Need</SelectItem>
                      <SelectItem value="home_visit">Home visit</SelectItem>
                      <SelectItem value="school_visit">School visit</SelectItem>
                      <SelectItem value="donor_request">Donation intent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.related_record_type !== "none" && <div>
                  <Label>Record</Label>
                  <Select value={form.related_record_id} onValueChange={(value) => setForm({ ...form, related_record_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Choose record" /></SelectTrigger>
                    <SelectContent>{(recordOptions.data ?? []).map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>}
              </div>
              <div>
                <Label>Assign To</Label>
                <Select value={form.assigned_to || "unassigned"} onValueChange={(value) => setForm({ ...form, assigned_to: value === "unassigned" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{members.map((member: any) => <SelectItem key={member.user_id} value={member.user_id}>{member.full_name || member.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Priority</Label><Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              {can.viewSensitiveCases && <div className="flex items-center gap-2"><Checkbox checked={form.is_sensitive} onCheckedChange={(checked) => setForm({ ...form, is_sensitive: checked === true })} id="task-sensitive" /><Label htmlFor="task-sensitive" className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Sensitive work</Label></div>}
              <Button onClick={handleCreate} disabled={createTask.isPending || !form.title.trim() || (form.related_record_type !== "none" && !form.related_record_id)} className="w-full">Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open tasks</p><p className="text-2xl font-semibold tabular-nums">{openCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-2xl font-semibold tabular-nums text-destructive">{overdueCount}</p></CardContent></Card>
      </div>

      {can.manageTasks && (workload.data?.length ?? 0) > 0 && <section className="space-y-2">
        <h4 className="text-sm font-medium">Staff workload</h4>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{workload.data.map((row: any) => {
          const member = memberById.get(row.staff_user_id) as any;
          return <Card key={row.staff_user_id}><CardContent className="flex items-center justify-between gap-2 p-3"><span className="min-w-0 truncate text-sm">{member?.full_name || member?.email || "Staff member"}</span><span className="shrink-0 text-xs text-muted-foreground">{row.open_tasks} open · {row.overdue_tasks} overdue</span></CardContent></Card>;
        })}</div>
      </section>}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" className="h-8 w-48 pl-7 text-xs" aria-label="Search tasks" /></div>
          <Select value={assignee} onValueChange={setAssignee}><SelectTrigger className="h-8 w-40 text-xs" aria-label="Filter by assignee"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Everyone</SelectItem><SelectItem value="unassigned">Unassigned</SelectItem>{members.map((member: any) => <SelectItem key={member.user_id} value={member.user_id}>{member.full_name || member.email}</SelectItem>)}</SelectContent></Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}><SelectTrigger className="h-8 w-36 text-xs" aria-label="Sort tasks"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="due">Sort: due date</SelectItem><SelectItem value="priority">Sort: priority</SelectItem><SelectItem value="title">Sort: title</SelectItem></SelectContent></Select>
        </div>
        <div className="inline-flex rounded-lg border p-0.5" role="tablist" aria-label="Task view">
          {([["list", List, "List"], ["board", Columns3, "Board"], ["calendar", CalendarDays, "Calendar"]] as const).map(([key, Icon, label]) => (
            <Button key={key} role="tab" aria-selected={view === key} size="sm" variant={view === key ? "default" : "ghost"} className="h-7 gap-1 px-2.5 text-xs" onClick={() => setView(key)}><Icon className="h-3.5 w-3.5" />{label}</Button>
          ))}
        </div>
      </div>

      {view === "list" && <div className="flex gap-1.5 flex-wrap">{["all", "todo", "in_progress", "blocked", "completed", "cancelled"].map((status) => <Button key={status} size="sm" variant={filter === status ? "default" : "outline"} onClick={() => setFilter(status)} className="text-xs h-7 px-2.5">{status === "all" ? "All" : status.replace(/_/g, " ")}</Button>)}</div>}

      {view === "board" && (tasks.isLoading ? <Skeleton className="h-64 w-full" /> : <TaskBoard tasks={boardTasks as any} disabled={updateTaskStatus.isPending} memberName={(id) => { const m = id ? memberById.get(id) as any : null; return m?.full_name || m?.email || "Unassigned"; }} onMove={(id, status) => updateTaskStatus.mutate({ id, status })} />)}
      {view === "calendar" && (tasks.isLoading ? <Skeleton className="h-64 w-full" /> : <TaskCalendar tasks={filtered as any} memberName={(id) => { const m = id ? memberById.get(id) as any : null; return m?.full_name || m?.email || "Unassigned"; }} />)}

      {view === "list" && (tasks.isLoading ? <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : !filtered.length ? <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground"><CheckSquare className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No tasks found</p></CardContent></Card> : <div className="space-y-2">
        {filtered.map((task) => {
          const assignee = memberById.get(task.assigned_to) as any;
          const overdue = isOverdueTask(task.status, task.due_date, today);
          const linkedCase = task.case_id ? caseById.get(task.case_id) as any : null;
          const transitions = allowedTaskTransitions(task.status as TaskStatus);
          return <Card key={task.id} className={`border-0 shadow-sm ${overdue ? "ring-1 ring-destructive/30" : ""}`}><CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="shrink-0 rounded-md bg-primary/10 p-2"><CheckSquare className="h-4 w-4 text-primary" /></div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{assignee?.full_name || "Unassigned"}{task.due_date && ` · Due ${format(new Date(`${task.due_date}T00:00:00`), "MMM d")}`}{linkedCase?.case_number && ` · ${linkedCase.case_number}`}{task.related_record_type && ` · ${task.related_record_type.replace(/_/g, " ")}`}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                <Select value={task.status} onValueChange={(value) => updateTaskStatus.mutate({ id: task.id, status: value as TaskStatus })} disabled={transitions.length === 0 || updateTaskStatus.isPending}>
                  <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value={task.status} disabled>{task.status.replace(/_/g, " ")}</SelectItem>{transitions.map((status) => <SelectItem key={status} value={status}>{status.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {task.is_sensitive && <p className="mt-2 flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3 w-3" /> Sensitive work</p>}
          </CardContent></Card>;
        })}
      </div>)}
    </div>
  );
}