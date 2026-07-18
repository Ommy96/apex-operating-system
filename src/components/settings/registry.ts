import {
  Building2, Palette, ShieldCheck, Users, Target, Sliders,
  Wallet, KeyRound, Bell, Plug, Lock, CreditCard, AlertTriangle, Type, HeartHandshake,
} from 'lucide-react';

export type SettingsGroup = 'Organisation' | 'Data collection' | 'System' | 'Account';

export interface SettingsSectionDef {
  id: string;
  label: string;
  description: string;
  icon: any;
  group: SettingsGroup;
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  // Organisation
  { id: 'profile',     label: 'Profile',             description: 'Identity, contact, registration', icon: Building2,    group: 'Organisation' },
  { id: 'branding',    label: 'Branding',            description: 'Logo, colour, document headers',  icon: Palette,      group: 'Organisation' },
  { id: 'compliance',  label: 'Compliance docs',     description: 'Certificates and policies',       icon: ShieldCheck,  group: 'Organisation' },

  // Data collection
  { id: 'beneficiary', label: 'Beneficiary data',    description: 'What you collect & terminology',  icon: Users,        group: 'Data collection' },
  { id: 'programmes',  label: 'Programmes & M&E',    description: 'Indicators, visitation, reports', icon: Target,       group: 'Data collection' },
  { id: 'fields',      label: 'Custom fields',       description: 'Org-specific extra fields',       icon: Sliders,      group: 'Data collection' },
  { id: 'needs',       label: 'Needs / Support types', description: 'Kinds of support you provide',  icon: HeartHandshake, group: 'Data collection' },
  { id: 'terminology', label: 'Terminology',         description: 'Rename Programme / Project / Activity tiers', icon: Type, group: 'Data collection' },

  // System
  { id: 'financial',   label: 'Financial',           description: 'Currency, fiscal year, M-Pesa',   icon: Wallet,       group: 'System' },
  { id: 'access',      label: 'Users & access',      description: 'Staff, 2FA policy, session',      icon: KeyRound,     group: 'System' },
  { id: 'notifications', label: 'Notifications',     description: 'Org-wide notification defaults',  icon: Bell,         group: 'System' },
  { id: 'integrations', label: 'Integrations',       description: 'M-Pesa, SMS, KoboToolbox, more',  icon: Plug,         group: 'System' },
  { id: 'security',    label: 'Security',            description: 'Sessions, audit, data protection', icon: Lock,        group: 'System' },

  // Account
  { id: 'subscription', label: 'Subscription',       description: 'Plan, usage, billing',            icon: CreditCard,   group: 'Account' },
  { id: 'danger',      label: 'Danger zone',         description: 'Irreversible actions',            icon: AlertTriangle, group: 'Account' },
];

export const SECTION_GROUPS: SettingsGroup[] = ['Organisation', 'Data collection', 'System', 'Account'];