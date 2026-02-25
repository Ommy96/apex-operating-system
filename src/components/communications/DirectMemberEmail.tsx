import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Search, Users, CheckCheck, Mail, UserCheck } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

interface OrgMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

export function DirectMemberEmail() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const [search, setSearch] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Fetch org members with their profiles
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["org-members-emails", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, role, profiles(full_name, email)")
        .eq("organization_id", orgId);
      if (error) throw error;
      return (data || []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        full_name: m.profiles?.full_name || "Unknown",
        email: m.profiles?.email || "",
      })).filter((m: OrgMember) => m.email) as OrgMember[];
    },
    enabled: !!orgId,
  });

  const filtered = useMemo(() => {
    if (!search) return members;
    const s = search.toLowerCase();
    return members.filter(
      (m) => m.full_name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s) || m.role.toLowerCase().includes(s)
    );
  }, [members, search]);

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedEmails.size === filtered.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(filtered.map((m) => m.email)));
    }
  };

  const sendEmail = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const { data, error } = await supabase.functions.invoke("send-member-email", {
        body: {
          recipient_emails: Array.from(selectedEmails),
          subject,
          body,
          organization_id: orgId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Email sent to ${data.sent} member(s)${data.failed > 0 ? `, ${data.failed} failed` : ""}`);
      setSelectedEmails(new Set());
      setSubject("");
      setBody("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canSend = selectedEmails.size > 0 && subject.trim() && body.trim();

  const roleColors: Record<string, string> = {
    admin: "bg-primary/10 text-primary",
    management: "bg-accent/10 text-accent",
    staff: "bg-muted text-muted-foreground",
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Member Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Select Recipients</h3>
            {selectedEmails.size > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {selectedEmails.size} selected
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
            <CheckCheck className="h-3 w-3 mr-1" />
            {selectedEmails.size === filtered.length ? "Deselect All" : "Select All"}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <ScrollArea className="h-[400px] pr-2">
          <div className="space-y-1.5">
            {filtered.map((m) => (
              <Card
                key={m.user_id}
                className={`border cursor-pointer transition-colors ${
                  selectedEmails.has(m.email)
                    ? "ring-1 ring-primary/30 bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => toggleEmail(m.email)}
              >
                <CardContent className="p-2.5 flex items-center gap-3">
                  <Checkbox
                    checked={selectedEmails.has(m.email)}
                    onCheckedChange={() => toggleEmail(m.email)}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{m.full_name}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleColors[m.role] || ""}`}>
                        {m.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  {selectedEmails.has(m.email) && <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">No members found</div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Compose Email */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Compose Email</h3>
        </div>

        {selectedEmails.size > 0 && (
          <div className="flex flex-wrap gap-1 p-2 bg-muted/30 rounded-md">
            {Array.from(selectedEmails).slice(0, 5).map((email) => {
              const member = members.find((m) => m.email === email);
              return (
                <Badge key={email} variant="secondary" className="text-[10px] gap-1">
                  {member?.full_name || email}
                </Badge>
              );
            })}
            {selectedEmails.size > 5 && (
              <Badge variant="outline" className="text-[10px]">+{selectedEmails.size - 5} more</Badge>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-medium mb-1 block">Subject</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="h-9"
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Message</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message here..."
            rows={12}
            className="resize-none"
          />
        </div>

        <Button
          onClick={() => sendEmail.mutate()}
          disabled={!canSend || sendEmail.isPending}
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" />
          {sendEmail.isPending
            ? "Sending..."
            : `Send Email to ${selectedEmails.size} Member${selectedEmails.size !== 1 ? "s" : ""}`}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Emails are sent to members' personal email addresses via your organization's email system.
        </p>
      </div>
    </div>
  );
}
