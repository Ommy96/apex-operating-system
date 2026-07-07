import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { useIsMobile } from '@/hooks/use-mobile';
import { Settings as SettingsIcon } from 'lucide-react';
import { PageHeroHeader } from '@/components/PageHeroHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { SETTINGS_SECTIONS } from '@/components/settings/registry';

import { ProfileSection } from '@/components/settings/sections/ProfileSection';
import { DangerZoneSection } from '@/components/settings/sections/DangerZoneSection';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { ComplianceDocumentsSettings } from '@/components/settings/ComplianceDocumentsSettings';
import { BeneficiaryDataSettings } from '@/components/settings/BeneficiaryDataSettings';
import { MESettings } from '@/components/settings/MESettings';
import { FinancialSettings } from '@/components/settings/FinancialSettings';
import { UserAccessSettings } from '@/components/settings/UserAccessSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { IntegrationSettings } from '@/components/settings/IntegrationSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { TerminologySettings } from '@/components/settings/TerminologySettings';

const VALID = new Set(SETTINGS_SECTIONS.map((s) => s.id));

export default function OrganizationSettings() {
  const { currentOrganization } = useOrganization();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const initial = searchParams.get('section');
  const [active, setActive] = useState<string>(VALID.has(initial || '') ? (initial as string) : 'profile');

  useEffect(() => {
    const fromUrl = searchParams.get('section');
    if (fromUrl && VALID.has(fromUrl) && fromUrl !== active) setActive(fromUrl);
  }, [searchParams]);

  const goTo = useCallback(
    (id: string) => {
      setActive(id);
      const next = new URLSearchParams(searchParams);
      next.set('section', id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Keyboard: Cmd/Ctrl+S triggers click on the section's primary save button
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        const btn = document.querySelector<HTMLButtonElement>('[data-settings-save="true"]')
          ?? Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
            (b) => b.textContent?.trim().toLowerCase() === 'save changes'
          );
        if (btn) {
          e.preventDefault();
          btn.click();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No organisation selected</p>
      </div>
    );
  }

  const current = SETTINGS_SECTIONS.find((s) => s.id === active) ?? SETTINGS_SECTIONS[0];

  const renderSection = () => {
    switch (active) {
      case 'profile':       return <ProfileSection />;
      case 'branding':      return <BrandingSettings />;
      case 'compliance':    return <ComplianceDocumentsSettings />;
      case 'beneficiary':   return <BeneficiaryDataSettings />;
      case 'programmes':    return <MESettings section="me-logframe" />;
      case 'fields':        return <BeneficiaryDataSettings />;
      case 'terminology':   return <TerminologySettings />;
      case 'financial':     return <FinancialSettings section="fin-currency" />;
      case 'access':        return <UserAccessSettings section="user-settings" />;
      case 'notifications': return <NotificationSettings />;
      case 'integrations':  return <IntegrationSettings section="int-services" />;
      case 'security':      return <SecuritySettings />;
      case 'subscription':  return <SubscriptionSettings section="sub-plan" />;
      case 'danger':        return <DangerZoneSection />;
      default:              return <ProfileSection />;
    }
  };

  const planLabel: string | null = (() => {
    const tier = (currentOrganization as any)?.subscription_tier as string | undefined;
    if (!tier) return null;
    if (tier === 'partner') return 'Partner';
    if (tier === 'enterprise') return 'Enterprise';
    if (tier === 'professional') return 'Pro';
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeroHeader
        title="Settings"
        description={`Control room for ${currentOrganization.organization_name}`}
        icon={SettingsIcon}
      />

      <div
        className="flex flex-col md:flex-row border rounded-xl bg-card overflow-hidden shadow-sm"
        style={{ minHeight: 'calc(100vh - 260px)' }}
      >
        {!isMobile && (
          <SettingsNav active={active} onChange={goTo} planLabel={planLabel} />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {isMobile ? (
            <div className="p-3 border-b">
              <Select value={active} onValueChange={goTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SETTINGS_SECTIONS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="px-5 py-3 border-b bg-muted/20 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Settings &nbsp;/&nbsp; {current.group}
              </p>
              <h2 className="text-base font-semibold truncate">{current.label}</h2>
              <p className="text-xs text-muted-foreground truncate">{current.description}</p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5 max-w-4xl">
              {renderSection()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
