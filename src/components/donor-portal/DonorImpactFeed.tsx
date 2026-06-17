import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDonorPortal } from "@/hooks/useDonorPortal";
import { useDonorFx } from "@/hooks/useDonorFx";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Sparkles, Package, Wallet, Heart, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Post = {
  id: string;
  kind: "field_log" | "activity_completed" | "disbursement" | "allocation_summary";
  occurred_at: string;
  title: string;
  body: string;
  photo_url: string | null;
  project_id: string | null;
  project_name: string | null;
  attribution_base: number;
  attribution_currency: string;
  beneficiary_label: string | null;
  meta: any;
};

const ICONS = {
  field_log: Camera,
  activity_completed: Sparkles,
  disbursement: Package,
  allocation_summary: Wallet,
};

export function DonorImpactFeed() {
  const { donorAccount } = useDonorPortal();
  const fx = useDonorFx((donorAccount as any)?.preferred_currency);

  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const [totals, setTotals] = useState<{
    committed: number; received: number; allocated: number; currency: string;
  } | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = async (before: string | null) => {
    const { data, error } = await supabase.functions.invoke("donor-impact-feed", {
      body: { limit: 15, before: before || undefined },
    });
    if (error) return null;
    return data as any;
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const res = await fetchPage(null);
      if (cancel || !res) { setLoading(false); return; }
      setPosts(res.posts || []);
      setCursor(res.next_cursor);
      setDone(!res.next_cursor);
      setTotals(res.totals);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [donorAccount?.id]);

  useEffect(() => {
    if (!sentinelRef.current || done) return;
    const io = new IntersectionObserver(async (entries) => {
      const e = entries[0];
      if (e.isIntersecting && !loadingMore && cursor) {
        setLoadingMore(true);
        const res = await fetchPage(cursor);
        if (res) {
          setPosts((prev) => [...prev, ...(res.posts || [])]);
          setCursor(res.next_cursor);
          setDone(!res.next_cursor);
        }
        setLoadingMore(false);
      }
    }, { rootMargin: "300px" });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [cursor, done, loadingMore]);

  const stripe = useMemo(() => {
    const c = totals?.currency || "KES";
    return [
      { label: "Committed", value: fx.format(totals?.committed ?? 0, c) },
      { label: "Received", value: fx.format(totals?.received ?? 0, c) },
      { label: "Allocated", value: fx.format(totals?.allocated ?? 0, c) },
    ];
  }, [totals, fx]);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stripe.map((s) => (
              <div key={s.label}>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Amounts converted from base currency using the most recent rate on file. FX is indicative; statements use the rate as at transaction date.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4 max-w-2xl">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))
        ) : posts.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No impact posts yet</p>
              <p className="text-sm mt-1">As your contributions are allocated, updates from the field will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} fx={fx} />)
        )}
        <div ref={sentinelRef} className="h-6" />
        {loadingMore && <Skeleton className="h-32 w-full rounded-lg" />}
        {done && posts.length > 0 && (
          <p className="text-center text-xs text-muted-foreground py-2">You've reached the end · {posts.length} posts</p>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, fx }: { post: Post; fx: ReturnType<typeof useDonorFx> }) {
  const Icon = ICONS[post.kind] || Sparkles;
  return (
    <Card className="border-border/50 overflow-hidden">
      {post.photo_url && (
        <div className="aspect-[16/9] bg-muted">
          <img
            src={post.photo_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-3.5 w-3.5" />
          </div>
          {post.project_name && (
            <Badge variant="secondary" className="text-[10px]">
              <MapPin className="h-2.5 w-2.5 mr-1" /> {post.project_name}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(post.occurred_at), { addSuffix: true })}
          </span>
        </div>
        <h3 className="font-semibold text-foreground leading-snug">{post.title}</h3>
        <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
          {post.beneficiary_label ? <span className="text-foreground/80">{post.beneficiary_label}: </span> : null}
          {post.body}
        </p>
        {post.attribution_base > 0 && (
          <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Your contribution</span>
            <span className="font-semibold text-primary">
              {fx.format(post.attribution_base, post.attribution_currency)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}