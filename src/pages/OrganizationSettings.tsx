import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { PageHeroHeader } from '@/components/PageHeroHeader';
import { SettingsSidebar, settingsSections } from '@/components/settings/SettingsSidebar';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { OrganizationProfileSettings } from '@/components/settings/OrganizationProfileSettings';
import { BranchSettings } from '@/components/settings/BranchSettings';
import { UserAccessSettings } from '@/components/settings/UserAccessSettings';
import { MESettings } from '@/components/settings/MESettings';
import { FinancialSettings } from '@/components/settings/FinancialSettings';
import { AutomationSettings } from '@/components/settings/AutomationSettings';
import { ComplianceSettings } from '@/components/settings/ComplianceSettings';
import { PartnerVolunteerSettings } from '@/components/settings/PartnerVolunteerSettings';
import { ExecutiveSettings } from '@/components/settings/ExecutiveSettings';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { IntegrationSettings } from '@/components/settings/IntegrationSettings';
import { AISettings } from '@/components/settings/AISettings';
import { AcademicSettings } from '@/components/settings/AcademicSettings';
import { DonorPortalSettings } from '@/components/settings/DonorPortalSettings';
import { ComplianceDocumentsSettings } from '@/components/settings/ComplianceDocumentsSettings';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OrganizationSettings() {
  const { currentOrganization } = useOrganization();
  const [activeSection, setActiveSection] = useState('org-profile');
  const isMobile = useIsMobile();

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  const currentSectionInfo = settingsSections.find(s => s.id === activeSection);

  const renderContent = () => {
    switch (activeSection) {
      case 'org-profile': return <OrganizationProfileSettings />;
      case 'org-branding': return <BrandingSettings />;
      case 'org-branches': return <BranchSettings />;
      case 'user-roles': return <UserAccessSettings section="user-roles" />;
      case 'user-settings': return <UserAccessSettings section="user-settings" />;
      case 'user-security': return <UserAccessSettings section="user-security" />;
      case 'me-logframe': return <MESettings section="me-logframe" />;
      case 'me-surveys': return <MESettings section="me-surveys" />;
      case 'fin-currency': return <FinancialSettings section="fin-currency" />;
      case 'fin-budget': return <FinancialSettings section="fin-budget" />;
      case 'fin-categories': return <FinancialSettings section="fin-categories" />;
      case 'auto-workflows': return <AutomationSettings section="auto-workflows" />;
      case 'auto-alerts': return <AutomationSettings section="auto-alerts" />;
      case 'comp-data': return <ComplianceSettings section="comp-data" />;
      case 'comp-audit': return <ComplianceSettings section="comp-audit" />;
      case 'comp-docs': return <ComplianceSettings section="comp-docs" />;
      case 'comp-certs': return <ComplianceDocumentsSettings />;
      case 'partner-access': return <PartnerVolunteerSettings section="partner-access" />;
      case 'volunteer-settings': return <PartnerVolunteerSettings section="volunteer-settings" />;
      case 'exec-dashboard': return <ExecutiveSettings section="exec-dashboard" />;
      case 'exec-reports': return <ExecutiveSettings section="exec-reports" />;
      case 'sub-plan': return <SubscriptionSettings section="sub-plan" />;
      case 'sub-billing': return <SubscriptionSettings section="sub-billing" />;
      case 'int-apis': return <IntegrationSettings section="int-apis" />;
      case 'int-services': return <IntegrationSettings section="int-services" />;
      case 'ai-config': return <AISettings />;
      case 'academic-config': return <AcademicSettings />;
      case 'donor-portal': return <DonorPortalSettings />;
      default: return <OrganizationProfileSettings />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeroHeader
        title="Settings Control Center"
        description={`System configuration for ${currentOrganization.organization_name}`}
        icon={Settings}
      />

      <div className="flex flex-col md:flex-row border rounded-xl bg-card overflow-hidden shadow-sm" style={{ minHeight: 'calc(100vh - 260px)' }}>
        {/* Sidebar - desktop */}
        {!isMobile && (
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile section selector */}
          {isMobile && (
            <div className="p-4 border-b">
              <Select value={activeSection} onValueChange={setActiveSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {settingsSections.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Section header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-muted/20">
            <div className="flex items-center gap-3">
              {currentSectionInfo && <currentSectionInfo.icon className="h-5 w-5 text-primary shrink-0" />}
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold truncate">{currentSectionInfo?.label}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{currentSectionInfo?.description}</p>
              </div>
            </div>
          </div>

          {/* Content area */}
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 max-w-4xl">
              {renderContent()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
