import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronDown, ChevronRight, Target, GitBranch } from "lucide-react";
import { useME } from "@/hooks/useME";
import { IndicatorTrafficLight } from "@/components/indicators/IndicatorTrafficLight";

const LEVEL_COLORS: Record<string, string> = {
  goal: "bg-primary/10 text-primary border-primary/20",
  outcome: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  output: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  activity: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
};

export function LogFrameBuilder() {
  const { logframes, createLogframe, createLogframeLevel, deleteLogframe } = useME();
  const [createOpen, setCreateOpen] = useState(false);
  const [addLevelOpen, setAddLevelOpen] = useState<string | null>(null);
  const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ title: "", description: "" });
  const [levelForm, setLevelForm] = useState({ level_type: "goal", title: "", description: "", assumptions: "", risks: "" });

  const toggleExpand = (id: string) => {
    setExpandedFrames(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createLogframe.mutate(form, { onSuccess: () => { setCreateOpen(false); setForm({ title: "", description: "" }); } });
  };

  const handleAddLevel = (logframeId: string) => {
    if (!levelForm.title.trim()) return;
    createLogframeLevel.mutate({ ...levelForm, logframe_id: logframeId }, {
      onSuccess: () => { setAddLevelOpen(null); setLevelForm({ level_type: "goal", title: "", description: "", assumptions: "", risks: "" }); },
    });
  };

  const buildHierarchy = (levels: any[]) => {
    const roots = levels?.filter(l => !l.parent_id) || [];
    const getChildren = (parentId: string): any[] =>
      (levels || []).filter(l => l.parent_id === parentId).map(l => ({ ...l, children: getChildren(l.id) }));
    return roots.map(r => ({ ...r, children: getChildren(r.id) }));
  };

  const renderLevel = (level: any, depth = 0) => {
    // Get traffic light data from logframe_indicators
    const indicators = level.logframe_indicators || [];
    return (
    <div key={level.id} className={`border-l-2 border-muted pl-4 py-2`} style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-2">
      <Badge variant="outline" className={LEVEL_COLORS[level.level_type]}>
          {level.level_type}
        </Badge>
        <span className="text-sm font-medium text-foreground">{level.title}</span>
        {level.level_type === 'output' && indicators.map((li: any) => (
          <IndicatorTrafficLight
            key={li.id}
            actual={li.indicator?.latest_value ?? null}
            target={li.indicator?.current_target ?? null}
            size="sm"
          />
        ))}
        {level.level_type === 'output' && indicators.length === 0 && (
          <IndicatorTrafficLight actual={null} target={null} size="sm" />
        )}
      </div>
      {level.description && <p className="text-xs text-muted-foreground mt-1">{level.description}</p>}
      {level.assumptions && <p className="text-xs text-muted-foreground mt-1"><strong>Assumptions:</strong> {level.assumptions}</p>}
      {level.children?.map((child: any) => renderLevel(child, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Logical Frameworks</h2>
          <p className="text-sm text-muted-foreground">Build structured LogFrames for programs & projects</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New LogFrame</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create LogFrame</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Education Program LogFrame" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <Button onClick={handleCreate} disabled={createLogframe.isPending} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {logframes.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {logframes.data?.length === 0 && !logframes.isLoading && (
        <Card className="border-dashed"><CardContent className="py-12 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No LogFrames yet. Create one to get started.</p>
        </CardContent></Card>
      )}

      {logframes.data?.map((lf: any) => (
        <Card key={lf.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleExpand(lf.id)}>
                {expandedFrames.has(lf.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="text-base">{lf.title}</CardTitle>
                <Badge variant="outline" className="text-xs">{lf.status}</Badge>
              </div>
              <div className="flex gap-1">
                <Dialog open={addLevelOpen === lf.id} onOpenChange={open => setAddLevelOpen(open ? lf.id : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" /> Add Level</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Level to {lf.title}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Level Type</Label>
                        <Select value={levelForm.level_type} onValueChange={v => setLevelForm(p => ({ ...p, level_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="goal">Goal</SelectItem>
                            <SelectItem value="outcome">Outcome</SelectItem>
                            <SelectItem value="output">Output</SelectItem>
                            <SelectItem value="activity">Activity</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Title</Label><Input value={levelForm.title} onChange={e => setLevelForm(p => ({ ...p, title: e.target.value }))} /></div>
                      <div><Label>Description</Label><Textarea value={levelForm.description} onChange={e => setLevelForm(p => ({ ...p, description: e.target.value }))} /></div>
                      <div><Label>Assumptions</Label><Textarea value={levelForm.assumptions} onChange={e => setLevelForm(p => ({ ...p, assumptions: e.target.value }))} /></div>
                      <div><Label>Risks</Label><Textarea value={levelForm.risks} onChange={e => setLevelForm(p => ({ ...p, risks: e.target.value }))} /></div>
                      <Button onClick={() => handleAddLevel(lf.id)} disabled={createLogframeLevel.isPending} className="w-full">Add Level</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={() => deleteLogframe.mutate(lf.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            </div>
            {lf.description && <p className="text-xs text-muted-foreground mt-1">{lf.description}</p>}
          </CardHeader>
          {expandedFrames.has(lf.id) && (
            <CardContent className="pt-2">
              {lf.logframe_levels?.length > 0 ? (
                buildHierarchy(lf.logframe_levels).map((level: any) => renderLevel(level))
              ) : (
                <p className="text-xs text-muted-foreground italic">No levels added yet</p>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
