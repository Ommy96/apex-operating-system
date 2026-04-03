import { ReactNode, useEffect, useState } from "react";
import { WorkspaceLayout } from "@/components/workspace";
import { useBranding } from "@/hooks/useBranding";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X, Megaphone, AlertTriangle, Info, Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: ReactNode;
}

const ANNOUNCEMENT_STYLES: Record<string, { border: string; bg: string; icon: any; iconColor: string }> = {
  critical: { border: 'border-destructive/50', bg: 'bg-destructive/10', icon: AlertTriangle, iconColor: 'text-destructive' },
  warning: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', icon: AlertTriangle, iconColor: 'text-amber-600' },
  feature: { border: 'border-blue-500/50', bg: 'bg-blue-500/10', icon: Sparkles, iconColor: 'text-blue-600' },
  info: { border: 'border-border', bg: 'bg-muted/50', icon: Info, iconColor: 'text-muted-foreground' },
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showBanner, setShowBanner] = useState(false);

  // Impersonation banner
  const impersonating = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('impersonating_org') || 'null') : null;

  useEffect(() => {
    const needs2fa = sessionStorage.getItem("requires_2fa_setup") === "true";
    setShowBanner(needs2fa && location.pathname !== "/setup-2fa");
  }, [location.pathname]);

  // Log impersonation on each page load
  useEffect(() => {
    if (impersonating && user) {
      supabase.from('audit_logs').insert({
        event_type: 'admin_impersonation',
        entity_type: 'organization',
        entity_id: impersonating.orgId,
        user_id: user.id,
        metadata: { target_org_id: impersonating.orgId, target_org_name: impersonating.orgName, path: location.pathname },
      }).then(() => {});
    }
  }, [location.pathname, impersonating, user]);

  // Platform announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['platform-announcements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('platform_announcements')
        .select('*')
        .lte('published_at', new Date().toISOString())
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      if (!data || data.length === 0) return [];
      // Filter out read ones
      const { data: reads } = await supabase
        .from('platform_announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);
      const readIds = new Set((reads || []).map((r: any) => r.announcement_id));
      return data.filter((a: any) => !readIds.has(a.id)).slice(0, 3);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const dismissAnnouncement = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) return;
      await supabase.from('platform_announcement_reads').insert({ announcement_id: announcementId, user_id: user.id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-announcements'] }),
  });

  return (
    <WorkspaceLayout>
      {/* Impersonation banner */}
      {impersonating && (
        <Alert className="mb-2 border-orange-500/50 bg-orange-500/10 no-print">
          <Megaphone className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-orange-800 dark:text-orange-300">
              You are impersonating <strong>{impersonating.orgName}</strong>. All actions are logged.
            </span>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => {
              sessionStorage.removeItem('impersonating_org');
              navigate('/admin/infera');
              window.location.reload();
            }}>Exit Impersonation</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 2FA banner */}
      {showBanner && (
        <Alert className="mb-2 border-amber-500/50 bg-amber-500/10 no-print">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-amber-800 dark:text-amber-300">
              Your role requires two-factor authentication. Set it up now to maintain access.
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/setup-2fa")} className="text-xs">Set up 2FA</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowBanner(false); sessionStorage.removeItem("requires_2fa_setup"); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Platform announcements */}
      {announcements.map((a: any) => {
        const style = ANNOUNCEMENT_STYLES[a.type] || ANNOUNCEMENT_STYLES.info;
        const IconComp = style.icon;
        return (
          <Alert key={a.id} className={`mb-2 ${style.border} ${style.bg} no-print`}>
            <IconComp className={`h-4 w-4 ${style.iconColor}`} />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-sm font-medium">{a.title}</span>
                <span className="text-sm text-muted-foreground ml-2">{a.body}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => dismissAnnouncement.mutate(a.id)}>
                <X className="h-3 w-3" />
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}

      {children}
    </WorkspaceLayout>
  );
}
