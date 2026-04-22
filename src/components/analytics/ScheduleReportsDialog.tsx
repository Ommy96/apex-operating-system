import { useState } from "react";
import { Calendar, CalendarPlus, Loader2, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAnalyticsSubscriptions } from "@/hooks/useAnalyticsSubscriptions";

const TAB_OPTIONS = [
  { value: "overview", label: "Overview" },
  { value: "beneficiary", label: "Beneficiary intel" },
  { value: "programme", label: "Programme & project" },
  { value: "funding", label: "Funding intel" },
  { value: "visitation", label: "Visitations" },
  { value: "risk", label: "Risk dashboard" },
  { value: "demographics", label: "Demographics" },
  { value: "forecast", label: "Forecasting" },
  { value: "quality", label: "Data quality" },
];

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly (every Monday)" },
  { value: "monthly", label: "Monthly (1st of month)" },
  { value: "quarterly", label: "Quarterly" },
];

export function ScheduleReportsDialog({ defaultTab = "overview" }: { defaultTab?: string }) {
  const [open, setOpen] = useState(false);
  const { list, create, remove, toggle, sendNow } = useAnalyticsSubscriptions();

  // Form state
  const [name, setName] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "quarterly">("monthly");
  const [tab, setTab] = useState(defaultTab);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = recipientsText
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => /.+@.+\..+/.test(s));
    if (!name.trim() || recipients.length === 0) return;
    await create.mutateAsync({ name: name.trim(), recipients, frequency, tab });
    setName("");
    setRecipientsText("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-xs">Schedule</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Scheduled report delivery
          </DialogTitle>
          <DialogDescription>
            Email an analytics snapshot link to recipients on a regular cadence.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-name" className="text-xs">Report name</Label>
              <Input
                id="schedule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Monthly board snapshot"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-tab" className="text-xs">Analytics tab</Label>
              <Select value={tab} onValueChange={setTab}>
                <SelectTrigger id="schedule-tab"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAB_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-freq" className="text-xs">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                <SelectTrigger id="schedule-freq"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-recipients" className="text-xs">
                Recipients (comma separated)
              </Label>
              <Input
                id="schedule-recipients"
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                placeholder="board@org.org, director@org.org"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Add schedule
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Existing schedules
          </h4>
          {list.isLoading ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
          ) : (list.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No schedules yet. Add one above.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {list.data!.map((sub) => (
                <li key={sub.id} className="flex items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{sub.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{sub.frequency}</Badge>
                      <Badge variant="outline" className="text-[10px]">{sub.tab}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {sub.recipients.join(", ")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {sub.last_sent_at
                        ? `Last sent ${format(new Date(sub.last_sent_at), "PP")}`
                        : "Not sent yet"}
                      {" · "}
                      {sub.next_send_at
                        ? `Next ${format(new Date(sub.next_send_at), "PP")}`
                        : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sub.is_active}
                      onCheckedChange={(v) => toggle.mutate({ id: sub.id, active: v })}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => sendNow.mutate(sub.id)}
                      disabled={sendNow.isPending}
                      title="Send now"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => remove.mutate(sub.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}