import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Building2, Users, BarChart3, Wallet, Zap, FileText, Handshake,
  TrendingUp, CreditCard, Plug, Brain, Search, ChevronRight,
  Shield, Lock, Bell, Globe, GitBranch, Target, ClipboardList,
  DollarSign, Settings, FileCheck, UserCheck, LayoutDashboard,
  Key, Webhook, GraduationCap, Heart, Palette, UserCog,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SettingsSection {
  id: string;
  label: string;
  icon: any;
  description: string;
  category: string;
  requiredPermission?: string;
}

const settingsSections: SettingsSection[] = [
  // Organization
  { id: 'org-profile', label: 'Organization Profile', icon: Building2, description: 'Name, logo, contact info', category: 'Organization' },
  { id: 'org-branding', label: 'Branding', icon: Palette, description: 'Logo, accent colour, preview', category: 'Organization' },
  { id: 'org-branches', label: 'Branches & Regions', icon: GitBranch, description: 'Multi-branch configuration', category: 'Organization' },
  // User & Access
  { id: 'user-roles', label: 'Role Management', icon: Shield, description: 'Roles & permission matrix', category: 'User & Access' },
  { id: 'user-settings', label: 'User Settings', icon: Users, description: 'Invitations, 2FA, sessions', category: 'User & Access' },
  { id: 'user-security', label: 'Security Controls', icon: Lock, description: 'Session timeout, 2FA, sign out', category: 'User & Access' },
  { id: 'user-notifications', label: 'Notifications', icon: Bell, description: 'Email alerts & preferences', category: 'User & Access' },
  // M&E
  { id: 'me-logframe', label: 'LogFrame & Indicators', icon: Target, description: 'Templates, formulas, frequency', category: 'Monitoring & Evaluation' },
  { id: 'me-surveys', label: 'Surveys & Scoring', icon: ClipboardList, description: 'Survey templates, risk weights', category: 'Monitoring & Evaluation' },
  // Financial
  { id: 'fin-currency', label: 'Currency & Localization', icon: Globe, description: 'Base currency, exchange rates', category: 'Financial' },
  { id: 'fin-budget', label: 'Budget Controls', icon: Wallet, description: 'Approval workflows, thresholds', category: 'Financial' },
  { id: 'fin-categories', label: 'Financial Categories', icon: DollarSign, description: 'Expense, funding, grant types', category: 'Financial' },
  // Automation
  { id: 'auto-workflows', label: 'Workflows & Triggers', icon: Zap, description: 'Automation rules, escalations', category: 'Automation' },
  { id: 'auto-alerts', label: 'Alerts & Notifications', icon: Bell, description: 'Email, SMS, in-app alerts', category: 'Automation' },
  // Compliance
  { id: 'comp-data', label: 'Data Protection', icon: FileCheck, description: 'Consent, retention, GDPR', category: 'Compliance' },
  { id: 'comp-audit', label: 'Audit Settings', icon: FileText, description: 'Log retention, export permissions', category: 'Compliance' },
  { id: 'comp-docs', label: 'Document Management', icon: FileText, description: 'Folder rules, version control', category: 'Compliance' },
  { id: 'comp-certs', label: 'Compliance Documents', icon: FileCheck, description: 'KRA, NGO Board, PBO certificates', category: 'Compliance' },
  // Partners & Volunteers
  { id: 'partner-access', label: 'Partner Access', icon: Handshake, description: 'Data sharing scope, visibility', category: 'Partners & Volunteers' },
  { id: 'volunteer-settings', label: 'Volunteer Settings', icon: UserCheck, description: 'Onboarding, roles, tracking', category: 'Partners & Volunteers' },
  // Donor Portal
  { id: 'donor-portal', label: 'Donor Portal', icon: Heart, description: 'Donor accounts & portal access', category: 'Donor Portal' },
  // Executive
  { id: 'exec-dashboard', label: 'Dashboard Customization', icon: LayoutDashboard, description: 'Widgets, KPIs, forecasting', category: 'Executive Intelligence' },
  { id: 'exec-reports', label: 'Report Templates', icon: BarChart3, description: 'Donor, board, impact templates', category: 'Executive Intelligence' },
  // Subscription
  { id: 'sub-plan', label: 'Plan & Usage', icon: CreditCard, description: 'Current plan, limits, storage', category: 'Subscription' },
  { id: 'sub-billing', label: 'Billing Settings', icon: DollarSign, description: 'Payment, invoices, renewal', category: 'Subscription' },
  // Integrations
  { id: 'int-apis', label: 'API & Webhooks', icon: Webhook, description: 'API keys, webhook config', category: 'Integrations' },
  { id: 'int-services', label: 'Connected Services', icon: Plug, description: 'MPesa, QuickBooks, Mailchimp', category: 'Integrations' },
  // AI
  { id: 'ai-config', label: 'AI & Intelligence', icon: Brain, description: 'AI assistant, risk sensitivity', category: 'AI Configuration' },
  // Academic
  { id: 'academic-config', label: 'Academic Configuration', icon: GraduationCap, description: 'Grade progression, auto-advancement', category: 'Academic' },
  // Beneficiary Data
  { id: 'beneficiary-data', label: 'Beneficiary Data', icon: UserCog, description: 'Org type, data sections, terminology', category: 'Beneficiary Data' },
];

const categoryIcons: Record<string, any> = {
  'Organization': Building2,
  'User & Access': Users,
  'Monitoring & Evaluation': Target,
  'Financial': Wallet,
  'Automation': Zap,
  'Compliance': FileText,
  'Partners & Volunteers': Handshake,
  'Donor Portal': Heart,
  'Executive Intelligence': TrendingUp,
  'Subscription': CreditCard,
  'Integrations': Plug,
  'AI Configuration': Brain,
  'Academic': GraduationCap,
  'Beneficiary Data': UserCog,
};

interface SettingsSidebarProps {
  activeSection: string;
  onSectionChange: (id: string) => void;
}

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  const [search, setSearch] = useState('');
  const { can, isSuperAdmin } = usePermissions();

  const filteredSections = settingsSections.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filteredSections.map(s => s.category))];

  return (
    <div className="w-64 shrink-0 border-r border-border bg-card/50 flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search settings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm rounded-lg"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {categories.map(category => {
            const CategoryIcon = categoryIcons[category] || Settings;
            const items = filteredSections.filter(s => s.category === category);
            return (
              <div key={category}>
                <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <CategoryIcon className="h-3.5 w-3.5" />
                  {category}
                </div>
                <div className="space-y-0.5">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group text-left",
                        activeSection === item.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground/80 hover:bg-muted/60"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 shrink-0",
                        activeSection === item.id ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[13px]">{item.label}</p>
                        {activeSection !== item.id && (
                          <p className="truncate text-[11px] text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        "h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                        activeSection === item.id && "opacity-100 text-primary-foreground"
                      )} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export { settingsSections };
