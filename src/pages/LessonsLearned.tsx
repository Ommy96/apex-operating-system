import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Search, BookOpen, Lightbulb, AlertTriangle, ArrowRight, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

const CATEGORIES = ["programme_delivery", "partnership", "financial_management", "community_engagement", "other"];

export default function LessonsLearned() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", project_id: "", category: "other", context: "", what_worked: "", what_didnt_work: "", recommendation: "", tags: "" });

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons-learned", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons_learned")
        .select("*, projects(name)")
        .eq("org_id", orgId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lessons_learned").insert({
        org_id: orgId!,
        title: form.title,
        project_id: form.project_id || null,
        category: form.category,
        context: form.context || null,
        what_worked: form.what_worked || null,
        what_didnt_work: form.what_didnt_work || null,
        recommendation: form.recommendation || null,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
        author_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons-learned"] });
      toast.success("Lesson saved");
      setCreateOpen(false);
      setForm({ title: "", project_id: "", category: "other", context: "", what_worked: "", what_didnt_work: "", recommendation: "", tags: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = lessons.filter((l: any) => {
    const matchSearch = !search || l.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || l.category === catFilter;
    return matchSearch && matchCat;
  });

  const exportPDF = () => {
    const year = new Date().getFullYear();
    const yearLessons = lessons.filter((l: any) => new Date(l.created_at).getFullYear() === year);
    if (yearLessons.length === 0) { toast.error("No lessons for this year"); return; }

    const grouped: Record<string, any[]> = {};
    yearLessons.forEach((l: any) => {
      const cat = l.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(l);
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = 210;
    const margin = 20;
    const maxW = pageW - margin * 2;
    let y = 0;
    const orgLabel = currentOrganization?.organization_name || "ApexOS";

    const addFooter = (pg: number) => {
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text("CONFIDENTIAL", pageW / 2, 287, { align: "center" });
      pdf.text(`Page ${pg}`, pageW - margin, 287, { align: "right" });
    };

    const checkPage = (needed: number, pg: { val: number }) => {
      if (y + needed > 270) {
        addFooter(pg.val);
        pdf.addPage();
        pg.val++;
        y = margin;
      }
    };

    // Cover page
    pdf.setFontSize(24);
    pdf.setTextColor(30);
    pdf.text(orgLabel, pageW / 2, 80, { align: "center" });
    pdf.setFontSize(18);
    pdf.text(`Organisational Learning Report ${year}`, pageW / 2, 100, { align: "center" });
    pdf.setFontSize(11);
    pdf.setTextColor(100);
    pdf.text(`Generated: ${new Date().toLocaleDateString("en-KE")}`, pageW / 2, 115, { align: "center" });
    addFooter(1);

    let pageNum = { val: 2 };
    pdf.addPage();
    y = margin;

    Object.entries(grouped).forEach(([cat, items]) => {
      checkPage(20, pageNum);
      pdf.setFontSize(14);
      pdf.setTextColor(30);
      pdf.text(cat.replace(/_/g, " ").toUpperCase(), margin, y);
      y += 8;
      pdf.setDrawColor(200);
      pdf.line(margin, y, pageW - margin, y);
      y += 6;

      items.forEach((lesson: any) => {
        checkPage(40, pageNum);
        pdf.setFontSize(11);
        pdf.setTextColor(30);
        const titleLines = pdf.splitTextToSize(lesson.title, maxW);
        pdf.text(titleLines, margin, y);
        y += titleLines.length * 5 + 2;

        const fields = [
          { label: "Context", val: lesson.context },
          { label: "What worked", val: lesson.what_worked },
          { label: "What didn't work", val: lesson.what_didnt_work },
          { label: "Recommendation", val: lesson.recommendation },
        ];
        fields.forEach(f => {
          if (f.val) {
            checkPage(12, pageNum);
            pdf.setFontSize(9);
            pdf.setTextColor(80);
            pdf.text(`${f.label}:`, margin, y);
            y += 4;
            pdf.setTextColor(50);
            const lines = pdf.splitTextToSize(f.val, maxW);
            pdf.text(lines, margin, y);
            y += lines.length * 4 + 2;
          }
        });

        checkPage(8, pageNum);
        pdf.setFontSize(8);
        pdf.setTextColor(130);
        const meta = `${lesson.projects?.name ? `Project: ${lesson.projects.name} | ` : ""}Date: ${new Date(lesson.created_at).toLocaleDateString("en-KE")}`;
        pdf.text(meta, margin, y);
        y += 4;
        pdf.setDrawColor(220);
        pdf.line(margin, y, pageW - margin, y);
        y += 6;
      });
    });

    addFooter(pageNum.val);
    pdf.save(`learning-report-${year}.pdf`);
    toast.success("PDF exported");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Learning Log</h1>
          <p className="text-sm text-muted-foreground">Document what works and what doesn't</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportPDF} className="gap-1">
            <Download className="h-4 w-4" /> Export Report
          </Button>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Lesson</Button>
            </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader><SheetTitle>New Lesson Learned</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Project</Label>
                <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Context</Label><Textarea value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} placeholder="What was the situation?" rows={3} /></div>
              <div><Label>What worked well</Label><Textarea value={form.what_worked} onChange={e => setForm(p => ({ ...p, what_worked: e.target.value }))} rows={3} /></div>
              <div><Label>What didn't work</Label><Textarea value={form.what_didnt_work} onChange={e => setForm(p => ({ ...p, what_didnt_work: e.target.value }))} rows={3} /></div>
              <div><Label>Recommendation</Label><Textarea value={form.recommendation} onChange={e => setForm(p => ({ ...p, recommendation: e.target.value }))} rows={3} /></div>
              <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="sustainability, training" /></div>
              <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending} className="w-full">Save Lesson</Button>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search lessons..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lessons grid */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          No lessons recorded yet
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((lesson: any) => (
            <Card key={lesson.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                  <Badge variant="outline" className="text-[10px] shrink-0">{lesson.category?.replace(/_/g, " ")}</Badge>
                </div>
                {lesson.projects?.name && (
                  <p className="text-xs text-muted-foreground">Project: {lesson.projects.name}</p>
                )}
                {lesson.what_worked && (
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground line-clamp-2">{lesson.what_worked}</p>
                  </div>
                )}
                {lesson.what_didnt_work && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground line-clamp-2">{lesson.what_didnt_work}</p>
                  </div>
                )}
                {lesson.recommendation && (
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground line-clamp-2">{lesson.recommendation}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {lesson.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">{new Date(lesson.created_at).toLocaleDateString("en-KE")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
