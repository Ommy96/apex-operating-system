import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heart, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PROVIDERS, PaymentProvider } from "@/lib/paymentAdapters";

export default function PublicDonationPage() {
  const { orgSlug, campaignSlug } = useParams<{ orgSlug: string; campaignSlug: string }>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["public-campaign", orgSlug, campaignSlug],
    queryFn: async () => {
      const { data: org, error: oe } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url, primary_color")
        .eq("slug", orgSlug!)
        .single();
      if (oe || !org) throw new Error("Organization not found");
      const { data: campaign, error: ce } = await supabase
        .from("donation_campaigns" as any)
        .select("*")
        .eq("organization_id", org.id)
        .eq("slug", campaignSlug!)
        .eq("status", "active")
        .maybeSingle();
      if (ce) throw ce;
      return { org, campaign: campaign as any };
    },
    enabled: !!orgSlug && !!campaignSlug,
  });

  useEffect(() => {
    if (data?.org?.primary_color) {
      document.documentElement.style.setProperty("--brand-primary", data.org.primary_color);
    }
    if (data?.org?.name) document.title = `Donate · ${data.org.name}`;
  }, [data]);

  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [provider, setProvider] = useState<PaymentProvider>("mpesa");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const presets = useMemo(() => [500, 1000, 2500, 5000], []);

  const submit = async () => {
    if (!data?.campaign) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a donation amount");
    if (!name.trim() && !anonymous) return toast.error("Enter your name");
    const meta = PROVIDERS.find((p) => p.id === provider)!;
    if (meta.requiresPhone && !phone) return toast.error("Phone number required for M-Pesa");

    setSubmitting(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("donation-init", {
        body: {
          campaign_id: data.campaign.id,
          organization_id: data.org.id,
          amount: amt,
          currency: data.campaign.currency,
          provider,
          donor_name: anonymous ? "Anonymous" : name.trim(),
          donor_email: email || null,
          donor_phone: phone || null,
          message: message || null,
          is_anonymous: anonymous,
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      setSuccess(res?.message || "Donation initiated. Check your phone to complete the M-Pesa prompt.");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Could not start donation");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!data?.campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card><CardContent className="p-8 text-center space-y-2">
          <Heart className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="font-semibold">Campaign not found</p>
          <p className="text-sm text-muted-foreground">This donation page is unavailable or has been closed.</p>
        </CardContent></Card>
      </div>
    );
  }

  const c = data.campaign;
  const pct = c.target_amount > 0 ? Math.min(100, (c.raised_amount / c.target_amount) * 100) : 0;
  const brandStyle = data.org.primary_color ? { color: data.org.primary_color } : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          {data.org.logo_url ? (
            <img src={data.org.logo_url} alt={data.org.name} className="h-9 w-9 rounded object-contain" />
          ) : (
            <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <p className="font-bold leading-tight" style={brandStyle}>{data.org.name}</p>
            <p className="text-xs text-muted-foreground">Secure donation page</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-5 gap-8">
        <section className="lg:col-span-3 space-y-6">
          {c.image_url && (
            <img src={c.image_url} alt={c.title} className="w-full rounded-xl object-cover max-h-80" />
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">{c.title}</h1>
            <Badge variant="secondary" className="mt-2">Active campaign</Badge>
          </div>
          <Card><CardContent className="p-5 space-y-3">
            <Progress value={pct} className="h-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Raised</p>
                <p className="font-bold text-success">{c.currency} {Number(c.raised_amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Goal</p>
                <p className="font-bold">{c.currency} {Number(c.target_amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Donors</p>
                <p className="font-bold">{c.donor_count}</p>
              </div>
            </div>
          </CardContent></Card>
          {c.story && (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/90">
              {c.story}
            </div>
          )}
        </section>

        <aside className="lg:col-span-2">
          <Card className="sticky top-6">
            <CardContent className="p-5 space-y-4">
              {success ? (
                <div className="text-center space-y-3 py-4">
                  <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                  <p className="font-semibold">Thank you!</p>
                  <p className="text-sm text-muted-foreground">{success}</p>
                  <Button variant="outline" onClick={() => setSuccess(null)}>Give again</Button>
                </div>
              ) : (
                <>
                  <h2 className="font-semibold text-lg" style={brandStyle}>Donate now</h2>
                  <div>
                    <Label>Amount ({c.currency})</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {presets.map((p) => (
                        <Button key={p} variant="outline" size="sm" onClick={() => setAmount(String(p))}>
                          {c.currency} {p.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Tabs value={provider} onValueChange={(v) => setProvider(v as PaymentProvider)}>
                    <TabsList className="grid grid-cols-3 w-full">
                      {PROVIDERS.map((p) => (
                        <TabsTrigger key={p.id} value={p.id} disabled={!p.available}>{p.label}</TabsTrigger>
                      ))}
                    </TabsList>
                    {PROVIDERS.map((p) => (
                      <TabsContent key={p.id} value={p.id} className="text-xs text-muted-foreground mt-2">
                        {p.description}
                      </TabsContent>
                    ))}
                  </Tabs>
                  <div className="space-y-3">
                    <div>
                      <Label>Your name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} disabled={anonymous} placeholder="Jane Doe" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input id="anon" type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                      <Label htmlFor="anon" className="cursor-pointer">Give anonymously</Label>
                    </div>
                    <div>
                      <Label>Email (optional)</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    {provider === "mpesa" && (
                      <div>
                        <Label>M-Pesa phone</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="2547XXXXXXXX" />
                      </div>
                    )}
                    <div>
                      <Label>Message (optional)</Label>
                      <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={submit} disabled={submitting}>
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : <><Heart className="h-4 w-4 mr-2" /> Donate</>}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    We never store your card details. Payment is securely handled by the selected provider.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}