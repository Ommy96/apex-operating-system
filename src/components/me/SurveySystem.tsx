import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ClipboardList, HelpCircle } from "lucide-react";
import { useME } from "@/hooks/useME";

const TYPE_BADGE: Record<string, string> = {
  baseline: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  endline: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  midterm: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  custom: "bg-muted text-muted-foreground",
};

export function SurveySystem() {
  const { surveys, createSurvey, createSurveyQuestion, deleteSurvey } = useME();
  const [createOpen, setCreateOpen] = useState(false);
  const [addQuestionOpen, setAddQuestionOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", survey_type: "baseline" });
  const [qForm, setQForm] = useState({ question_text: "", question_type: "text", is_required: false, section: "" });

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createSurvey.mutate(form, { onSuccess: () => { setCreateOpen(false); setForm({ title: "", description: "", survey_type: "baseline" }); } });
  };

  const handleAddQuestion = (surveyId: string) => {
    if (!qForm.question_text.trim()) return;
    createSurveyQuestion.mutate({ ...qForm, survey_id: surveyId }, {
      onSuccess: () => { setAddQuestionOpen(null); setQForm({ question_text: "", question_type: "text", is_required: false, section: "" }); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Surveys</h2>
          <p className="text-sm text-muted-foreground">Baseline, endline & impact measurement surveys</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Survey</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Survey</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Baseline Assessment 2026" /></div>
              <div><Label>Type</Label>
                <Select value={form.survey_type} onValueChange={v => setForm(p => ({ ...p, survey_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baseline">Baseline</SelectItem>
                    <SelectItem value="endline">Endline</SelectItem>
                    <SelectItem value="midterm">Midterm</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <Button onClick={handleCreate} disabled={createSurvey.isPending} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {surveys.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {surveys.data?.length === 0 && !surveys.isLoading && (
        <Card className="border-dashed"><CardContent className="py-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No surveys created yet.</p>
        </CardContent></Card>
      )}

      {surveys.data?.map((survey: any) => (
        <Card key={survey.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{survey.title}</CardTitle>
                <Badge className={TYPE_BADGE[survey.survey_type]}>{survey.survey_type}</Badge>
                <Badge variant="outline" className="text-xs">{survey.status}</Badge>
              </div>
              <div className="flex gap-1">
                <Dialog open={addQuestionOpen === survey.id} onOpenChange={open => setAddQuestionOpen(open ? survey.id : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" /> Question</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Question</Label><Textarea value={qForm.question_text} onChange={e => setQForm(p => ({ ...p, question_text: e.target.value }))} /></div>
                      <div><Label>Type</Label>
                        <Select value={qForm.question_type} onValueChange={v => setQForm(p => ({ ...p, question_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="single_choice">Single Choice</SelectItem>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="rating">Rating</SelectItem>
                            <SelectItem value="yes_no">Yes/No</SelectItem>
                            <SelectItem value="scale">Scale (1-10)</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Section</Label><Input value={qForm.section} onChange={e => setQForm(p => ({ ...p, section: e.target.value }))} placeholder="e.g. Demographics" /></div>
                      <div className="flex items-center gap-2">
                        <Switch checked={qForm.is_required} onCheckedChange={v => setQForm(p => ({ ...p, is_required: v }))} />
                        <Label>Required</Label>
                      </div>
                      <Button onClick={() => handleAddQuestion(survey.id)} disabled={createSurveyQuestion.isPending} className="w-full">Add Question</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={() => deleteSurvey.mutate(survey.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {survey.survey_questions?.length > 0 ? (
              <div className="space-y-2">
                {survey.survey_questions.sort((a: any, b: any) => a.sort_order - b.sort_order).map((q: any, i: number) => (
                  <div key={q.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <span className="text-xs font-mono text-muted-foreground mt-0.5">{i + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{q.question_text}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{q.question_type}</Badge>
                        {q.is_required && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Required</Badge>}
                        {q.section && <Badge variant="outline" className="text-[10px]">{q.section}</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic flex items-center gap-1"><HelpCircle className="h-3 w-3" /> No questions added yet</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
