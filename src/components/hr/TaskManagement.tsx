import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckSquare, Trash2 } from "lucide-react";
import { useHR } from "@/hooks/useHR";
import { format } from "date-fns";

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/10 text-info",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

const statusColors: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-info/10 text-info",
  blocked: "bg-destructive/10 text-destructive",
  completed: "bg-success/10 text-success",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function TaskManagement() {
  const { tasks, createTask, updateTask, deleteTask, orgMembers } = useHR();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" });

  const handleCreate = () => {
    if (!form.title) return;
    createTask.mutate({
      ...form,
      assigned_to: form.assigned_to || undefined,
      due_date: form.due_date || undefined,
    }, {
      onSuccess: () => { setShowCreate(false); setForm({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" }); },
    });
  };

  const members = orgMembers.data || [];
  const allTasks = tasks.data || [];
  const filtered = filter === "all" ? allTasks : allTasks.filter((t: any) => t.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Task Management</h3>
          <p className="text-sm text-muted-foreground">Assign and track staff tasks</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Assign To</Label>
                <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <Button onClick={handleCreate} disabled={createTask.isPending} className="w-full">Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1.5 flex-wrap">
        {["all", "todo", "in_progress", "blocked", "completed"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)} className="text-xs h-7 px-2.5">
            {s === "all" ? "All" : s.replace("_", " ")}
          </Button>
        ))}
      </div>

      {tasks.isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : !filtered.length ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <CheckSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t: any) => {
            const assignee = members.find((m) => m.user_id === t.assigned_to);
            const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed";
            return (
              <Card key={t.id} className={`border-0 shadow-sm ${overdue ? "ring-1 ring-destructive/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <CheckSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignee?.full_name || "Unassigned"}
                          {t.due_date && ` • Due ${format(new Date(t.due_date), "MMM d")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={priorityColors[t.priority]}>{t.priority}</Badge>
                      <Select value={t.status} onValueChange={(v) => updateTask.mutate({ id: t.id, status: v })}>
                        <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">Todo</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteTask.mutate(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
