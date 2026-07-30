import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, FileText, ArrowRight } from "lucide-react";
import { useME } from "@/hooks/useME";

const NODE_COLORS: Record<string, string> = {
  activity: "bg-success/10 border-success/30",
  output: "bg-warning/10 border-warning/30",
  outcome: "bg-info/10 border-info/30",
  impact: "bg-info/10 border-info/30",
  assumption: "bg-muted border-border",
  risk: "bg-destructive/10 border-destructive/30",
};

export function TheoryOfChange() {
  const { tocList, createToc, createTocNode, deleteToc } = useME();
  const [createOpen, setCreateOpen] = useState(false);
  const [addNodeOpen, setAddNodeOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", narrative: "" });
  const [nodeForm, setNodeForm] = useState({ node_type: "activity", title: "", description: "" });

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createToc.mutate(form, { onSuccess: () => { setCreateOpen(false); setForm({ title: "", description: "", narrative: "" }); } });
  };

  const handleAddNode = (tocId: string) => {
    if (!nodeForm.title.trim()) return;
    createTocNode.mutate({ ...nodeForm, toc_id: tocId }, {
      onSuccess: () => { setAddNodeOpen(null); setNodeForm({ node_type: "activity", title: "", description: "" }); },
    });
  };

  const groupNodesByType = (nodes: any[]) => {
    const order = ["activity", "output", "outcome", "impact", "assumption", "risk"];
    const grouped: Record<string, any[]> = {};
    order.forEach(t => { grouped[t] = (nodes || []).filter(n => n.node_type === t); });
    return grouped;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Theory of Change</h2>
          <p className="text-sm text-muted-foreground">Map impact pathways from activities to outcomes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New ToC</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Theory of Change</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Youth Empowerment Impact Pathway" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div><Label>Narrative</Label><Textarea value={form.narrative} onChange={e => setForm(p => ({ ...p, narrative: e.target.value }))} placeholder="Describe the overall theory of change..." /></div>
              <Button onClick={handleCreate} disabled={createToc.isPending} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tocList.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {tocList.data?.length === 0 && !tocList.isLoading && (
        <Card className="border-dashed"><CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No Theory of Change maps yet.</p>
        </CardContent></Card>
      )}

      {tocList.data?.map((toc: any) => {
        const grouped = groupNodesByType(toc.toc_nodes);
        return (
          <Card key={toc.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{toc.title}</CardTitle>
                  <Badge variant="outline" className="text-xs mt-1">{toc.status}</Badge>
                </div>
                <div className="flex gap-1">
                  <Dialog open={addNodeOpen === toc.id} onOpenChange={open => setAddNodeOpen(open ? toc.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" /> Add Node</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Node</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Type</Label>
                          <Select value={nodeForm.node_type} onValueChange={v => setNodeForm(p => ({ ...p, node_type: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="activity">Activity</SelectItem>
                              <SelectItem value="output">Output</SelectItem>
                              <SelectItem value="outcome">Outcome</SelectItem>
                              <SelectItem value="impact">Impact</SelectItem>
                              <SelectItem value="assumption">Assumption</SelectItem>
                              <SelectItem value="risk">Risk</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label>Title</Label><Input value={nodeForm.title} onChange={e => setNodeForm(p => ({ ...p, title: e.target.value }))} /></div>
                        <div><Label>Description</Label><Textarea value={nodeForm.description} onChange={e => setNodeForm(p => ({ ...p, description: e.target.value }))} /></div>
                        <Button onClick={() => handleAddNode(toc.id)} disabled={createTocNode.isPending} className="w-full">Add Node</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" onClick={() => deleteToc.mutate(toc.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </div>
              {toc.narrative && <p className="text-xs text-muted-foreground mt-2 italic">{toc.narrative}</p>}
            </CardHeader>
            <CardContent>
              {/* Impact Pathway Flow */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch">
                {["activity", "output", "outcome", "impact"].map((type, idx) => (
                  <div key={type} className="flex items-center gap-2 flex-1">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 capitalize">{type}s</p>
                      <div className="space-y-1.5">
                        {grouped[type]?.length > 0 ? grouped[type].map((node: any) => (
                          <div key={node.id} className={`p-2 rounded-lg border text-xs ${NODE_COLORS[type]}`}>
                            <p className="font-medium text-foreground">{node.title}</p>
                            {node.description && <p className="text-muted-foreground mt-0.5">{node.description}</p>}
                          </div>
                        )) : <p className="text-xs text-muted-foreground italic">None</p>}
                      </div>
                    </div>
                    {idx < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden md:block" />}
                  </div>
                ))}
              </div>
              {/* Assumptions & Risks */}
              {(grouped.assumption?.length > 0 || grouped.risk?.length > 0) && (
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Assumptions</p>
                    {grouped.assumption?.map((n: any) => (
                      <div key={n.id} className={`p-2 rounded border text-xs mb-1 ${NODE_COLORS.assumption}`}>{n.title}</div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Risks</p>
                    {grouped.risk?.map((n: any) => (
                      <div key={n.id} className={`p-2 rounded border text-xs mb-1 ${NODE_COLORS.risk}`}>{n.title}</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
