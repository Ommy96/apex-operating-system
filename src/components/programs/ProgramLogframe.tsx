import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Target, Goal, Boxes, Activity as ActivityIcon } from "lucide-react";
import { toast } from "sonner";

const LEVELS = [
  { key: "goal", label: "Goal", icon: Goal, color: "bg-primary/10 text-primary border-primary/20" },
  { key: "outcome", label: "Outcomes", icon: Target, color: "bg-accent/10 text-accent border-accent/20" },
  { key: "output", label: "Outputs", icon: Boxes, color: "bg-success/10 text-success border-success/20" },
  { key: "activity", label: "Activities", icon: ActivityIcon, color: "bg-warning/10 text-warning border-warning/20" },
] as const;

interface Props {
  programId: string;
  orgId?: string;
}

export function ProgramLogframe({ programId, orgId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [addingLevel, setAddingLevel] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["logframe-entries", programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logframe_entries")
        .select("*")
        .eq("program_id", programId)
        .is("deleted_at", null)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  const create = useMutation({
    mutationFn: async (level: string) => {
      if (!draft.title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("logframe_entries").insert({
        program_id: programId,
        org_id: orgId!,
        level,
        title: draft.title,
        description: draft.description || null,
        display_order: entries.filter((e: any) => e.level === level).length,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logframe-entries", programId] });
      setDraft({ title: "", description: "" });
      setAddingLevel(null);
      toast.success("Added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("logframe_entries").update({
        title: draft.title,
        description: draft.description || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logframe-entries", programId] });
      setEditingId(null);
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("logframe_entries")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logframe-entries", programId] });
      toast.success("Removed");
    },
  });

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setDraft({ title: entry.title, description: entry.description || "" });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {LEVELS.map(l => <Skeleton key={l.key} className="h-64" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {LEVELS.map(level => {
        const items = entries.filter((e: any) => e.level === level.key);
        const Icon = level.icon;
        return (
          <Card key={level.key} className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${level.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{level.label}</h3>
                    <p className="text-[10px] text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.id} className="rounded-lg border border-border/60 p-2 bg-muted/20 group">
                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <Input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} className="h-8 text-xs" />
                        <Textarea value={draft.description} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} className="text-xs" rows={2} />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => update.mutate(item.id)}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => startEdit(item)} className="cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-foreground flex-1">{item.title}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); if (confirm("Delete?")) remove.mutate(item.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {item.description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-3">{item.description}</p>}
                        {item.indicator_ids && item.indicator_ids.length > 0 && (
                          <Badge variant="outline" className="text-[9px] mt-1">{item.indicator_ids.length} indicator{item.indicator_ids.length !== 1 ? "s" : ""}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {addingLevel === level.key ? (
                  <div className="space-y-2 rounded-lg border border-dashed p-2">
                    <Input placeholder="Title" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} className="h-8 text-xs" />
                    <Textarea placeholder="Description (optional)" value={draft.description} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} className="text-xs" rows={2} />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-xs flex-1" onClick={() => create.mutate(level.key)} disabled={create.isPending}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingLevel(null); setDraft({ title: "", description: "" }); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="w-full h-8 text-xs justify-start text-muted-foreground hover:text-foreground" onClick={() => { setAddingLevel(level.key); setDraft({ title: "", description: "" }); }}>
                    <Plus className="h-3 w-3 mr-1" /> Add {level.label.replace(/s$/, "")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}