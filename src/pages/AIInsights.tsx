import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Sparkles, Trash2, User, MessageSquare, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import SmartInsightsDashboard from "@/components/insights/SmartInsightsDashboard";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`;

const SUGGESTED_QUESTIONS = [
  "Which program is underperforming?",
  "What is our cost per beneficiary?",
  "Give me a summary of beneficiary demographics",
  "Which staff has the lowest activity?",
  "What are the top risks facing our programs?",
  "Compare all active programs by performance",
];

export default function AIInsights() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (allMessages: Msg[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: allMessages,
        organizationId: currentOrganization?.organization_id,
      }),
    });

    if (resp.status === 429) { toast.error("Rate limit exceeded. Please wait a moment and try again."); throw new Error("rate_limited"); }
    if (resp.status === 402) { toast.error("AI credits exhausted. Please add funds to your workspace."); throw new Error("payment_required"); }
    if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
              return [...prev, { role: "assistant", content: assistantSoFar }];
            });
          }
        } catch { textBuffer = line + "\n" + textBuffer; break; }
      }
    }
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages((prev) => prev.map((m, i) => i === prev.length - 1 && m.role === "assistant" ? { ...m, content: assistantSoFar } : m));
          }
        } catch { /* ignore */ }
      }
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    try { await streamChat(updatedMessages); }
    catch (e: any) { if (e.message !== "rate_limited" && e.message !== "payment_required") toast.error("Failed to get AI response."); }
    finally { setIsLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      <Tabs defaultValue="insights" className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 border-b border-border/40">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md shrink-0">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground truncate">AI Intelligence Center</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Smart recommendations & conversational analytics</p>
            </div>
          </div>
          <TabsList className="shrink-0 self-start sm:self-auto">
            <TabsTrigger value="insights" className="gap-1.5 text-xs sm:text-sm"><BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Smart </span>Insights</TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm"><MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Ask </span>AI</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="insights" className="flex-1 overflow-y-auto p-3 sm:p-6 mt-0">
          <SmartInsightsDashboard />
        </TabsContent>

        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0">
          {/* Chat Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center max-w-md">
                  <h2 className="text-xl font-semibold text-foreground mb-2">What would you like to know?</h2>
                  <p className="text-sm text-muted-foreground">Ask me anything about your programs, beneficiaries, finances, or staff performance.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => send(q)} className="text-left px-4 py-3 rounded-xl border border-border/60 bg-card hover:bg-accent/10 hover:border-primary/30 transition-all text-sm text-foreground">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 max-w-3xl mx-auto w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 mt-1">
                      <Bot className="h-4.5 w-4.5 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`rounded-2xl px-5 py-4 ${
                    msg.role === "user" 
                      ? "max-w-[75%] bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "max-w-[85%] bg-card border border-border/50 shadow-sm"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed
                        [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:first:mt-0 [&_h1]:text-foreground
                        [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:first:mt-0 [&_h2]:text-foreground
                        [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-foreground
                        [&_p]:mb-3 [&_p]:last:mb-0 [&_p]:text-sm [&_p]:leading-relaxed
                        [&_ul]:mb-3 [&_ul]:space-y-1.5 [&_ul]:pl-0 [&_ul]:list-none
                        [&_ol]:mb-3 [&_ol]:space-y-1.5 [&_ol]:pl-0 [&_ol]:list-none
                        [&_li]:text-sm [&_li]:pl-4 [&_li]:relative [&_li]:before:content-[''] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[9px] [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:rounded-full [&_li]:before:bg-primary/60
                        [&_strong]:font-semibold [&_strong]:text-foreground
                        [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_table]:rounded-xl [&_table]:overflow-hidden [&_table]:my-3
                        [&_thead]:bg-muted/80
                        [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_th]:border-b [&_th]:border-border/50
                        [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border/30 [&_td]:text-muted-foreground
                        [&_tr:last-child_td]:border-b-0
                        [&_tr:hover_td]:bg-muted/30
                        [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-xs [&_code]:font-mono [&_code]:text-primary
                        [&_pre]:bg-muted [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-3
                        [&_blockquote]:border-l-3 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-3
                        [&_hr]:border-border/40 [&_hr]:my-4
                      ">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary shadow-sm mt-1">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="bg-muted/50 border border-border/40 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="border-t border-border/40 px-3 sm:px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => setMessages([])}>
                  <Trash2 className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
            <div className="flex items-end gap-2 max-w-3xl mx-auto">
              <Textarea
                ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask about your programs, beneficiaries, finances..."
                className="min-h-[44px] max-h-[120px] resize-none rounded-xl border-border/60 bg-card focus-visible:ring-primary/30" rows={1} disabled={isLoading}
              />
              <Button onClick={() => send(input)} disabled={!input.trim() || isLoading} size="icon" className="h-11 w-11 rounded-xl shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">Powered by ApexOS AI · Responses are based on your organization's live data</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
