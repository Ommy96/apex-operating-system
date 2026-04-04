import { ReactNode, useEffect, useState } from "react";
import { WorkspaceLayout } from "@/components/workspace";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X, Megaphone, AlertTriangle, Info, Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: ReactNode;
}

const ANNOUNCEMENT_STYLES: Record<string, { borderColor: string; bg: string; icon: any; iconColor: string }> = {
  critical: { borderColor: 'var(--status-danger)', bg: 'var(--status-danger-bg)', icon: AlertTriangle, iconColor: 'var(--status-danger)' },
  warning: { borderColor: 'var(--status-warning)', bg: 'var(--status-warning-bg)', icon: AlertTriangle, iconColor: 'var(--status-warning)' },
  feature: { borderColor: 'var(--status-info)', bg: 'var(--status-info-bg)', icon: Sparkles, iconColor: 'var(--status-info)' },
  info: { borderColor: 'var(--brand-border)', bg: 'var(--status-neutral-bg)', icon: Info, iconColor: 'var(--status-neutral)' },
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showBanner, setShowBanner] = useState(false);

  const impersonating = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('impersonating_org') || 'null') : null;

  useEffect(() => {
    const needs2fa = sessionStorage.getItem("requires_2fa_setup") === "true";
    setShowBanner(needs2fa && location.pathname !== "/setup-2fa");
  }, [location.pathname]);

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

  const BannerAlert = ({ borderColor, bg, icon: IconComp, iconColor, children, onDismiss }: { borderColor: string; bg: string; icon: any; iconColor: string; children: ReactNode; onDismiss?: () => void }) => (
    <div
      className="mb-3 rounded-r-[10px] flex items-center gap-3 px-4 py-3 no-print"
      style={{
        borderLeft: `3px solid ${borderColor}`,
        background: bg,
        borderRadius: '0 10px 10px 0',
      }}
    >
      <IconComp className="h-4 w-4 flex-shrink-0" style={{ color: iconColor }} />
      <div className="flex-1 flex items-center justify-between flex-wrap gap-2 text-[13px]">
        {children}
      </div>
      {onDismiss && (
        <Button size="icon" variant="ghost" onClick={onDismiss} className="h-6 w-6" aria-label="Dismiss">
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  return (
    <WorkspaceLayout>
      {/* Impersonation banner */}
      {impersonating && (
        <BannerAlert borderColor="var(--status-warning)" bg="var(--status-warning-bg)" icon={Megaphone} iconColor="var(--status-warning)">
          <span style={{ color: 'var(--brand-ink-2)' }}>
            You are impersonating <strong>{impersonating.orgName}</strong>. All actions are logged.
          </span>
          <Button size="sm" variant="outline" className="text-[12px]" onClick={() => {
            sessionStorage.removeItem('impersonating_org');
            navigate('/admin/infera');
            window.location.reload();
          }}>Exit Impersonation</Button>
        </BannerAlert>
      )}

      {/* 2FA banner */}
      {showBanner && (
        <BannerAlert 
          borderColor="var(--status-warning)" 
          bg="var(--status-warning-bg)" 
          icon={ShieldAlert} 
          iconColor="var(--status-warning)"
          onDismiss={() => { setShowBanner(false); sessionStorage.removeItem("requires_2fa_setup"); }}
        >
          <span style={{ color: 'var(--brand-ink-2)' }}>
            Your role requires two-factor authentication. Set it up now to maintain access.
          </span>
          <Button size="sm" variant="outline" onClick={() => navigate("/setup-2fa")} className="text-[12px]">Set up 2FA</Button>
        </BannerAlert>
      )}

      {/* Platform announcements */}
      {announcements.map((a: any) => {
        const style = ANNOUNCEMENT_STYLES[a.type] || ANNOUNCEMENT_STYLES.info;
        const IconComp = style.icon;
        return (
          <BannerAlert 
            key={a.id} 
            borderColor={style.borderColor} 
            bg={style.bg} 
            icon={IconComp} 
            iconColor={style.iconColor}
            onDismiss={() => dismissAnnouncement.mutate(a.id)}
          >
            <div>
              <span className="text-[13px] font-medium" style={{ color: 'var(--brand-ink)' }}>{a.title}</span>
              <span className="text-[13px] ml-2" style={{ color: 'var(--brand-ink-2)' }}>{a.body}</span>
            </div>
          </BannerAlert>
        );
      })}

      {children}
    </WorkspaceLayout>
  );
}
