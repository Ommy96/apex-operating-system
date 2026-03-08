
-- Add missing permission entries for all modules
INSERT INTO public.rbac_permissions (module, module_display_name, action, resource, display_name, description) VALUES
  -- Financial
  ('financial', 'Financial', 'view', 'financials', 'View Financials', 'View financial data'),
  ('financial', 'Financial', 'create', 'financials', 'Create Financials', 'Create financial records'),
  ('financial', 'Financial', 'edit', 'financials', 'Edit Financials', 'Edit financial records'),
  ('financial', 'Financial', 'delete', 'financials', 'Delete Financials', 'Delete financial records'),
  ('financial', 'Financial', 'export', 'financials', 'Export Financials', 'Export financial data'),
  -- HR
  ('hr', 'HR & Staff', 'view', 'staff', 'View Staff', 'View HR & staff data'),
  ('hr', 'HR & Staff', 'create', 'staff', 'Create Staff Records', 'Create HR records'),
  ('hr', 'HR & Staff', 'edit', 'staff', 'Edit Staff Records', 'Edit HR records'),
  ('hr', 'HR & Staff', 'delete', 'staff', 'Delete Staff Records', 'Delete HR records'),
  -- Communications
  ('communications', 'Communications', 'view', 'communications', 'View Communications', 'View communications'),
  ('communications', 'Communications', 'create', 'communications', 'Create Communications', 'Create communications'),
  ('communications', 'Communications', 'manage', 'communications', 'Manage Communications', 'Manage communications'),
  -- Automation
  ('automation', 'Automation', 'view', 'automation', 'View Automation', 'View automation rules'),
  ('automation', 'Automation', 'create', 'automation', 'Create Automation', 'Create automation rules'),
  ('automation', 'Automation', 'manage', 'automation', 'Manage Automation', 'Manage automation rules'),
  -- Documents
  ('documents', 'Documents', 'view', 'documents', 'View Documents', 'View documents'),
  ('documents', 'Documents', 'create', 'documents', 'Upload Documents', 'Upload documents'),
  ('documents', 'Documents', 'delete', 'documents', 'Delete Documents', 'Delete documents'),
  ('documents', 'Documents', 'manage', 'documents', 'Manage Documents', 'Manage documents'),
  -- Compliance
  ('compliance', 'Compliance', 'view', 'compliance', 'View Compliance', 'View compliance data'),
  ('compliance', 'Compliance', 'manage', 'compliance', 'Manage Compliance', 'Manage compliance settings'),
  -- Board
  ('board', 'Board Portal', 'view', 'reports', 'View Board Reports', 'View board reports'),
  ('board', 'Board Portal', 'create', 'reports', 'Create Board Reports', 'Create board reports'),
  ('board', 'Board Portal', 'manage', 'reports', 'Manage Board Reports', 'Manage board reports'),
  -- Branches
  ('branches', 'Branches', 'view', 'branches', 'View Branches', 'View branches'),
  ('branches', 'Branches', 'create', 'branches', 'Create Branches', 'Create branches'),
  ('branches', 'Branches', 'edit', 'branches', 'Edit Branches', 'Edit branches'),
  ('branches', 'Branches', 'delete', 'branches', 'Delete Branches', 'Delete branches'),
  -- Volunteers
  ('volunteers', 'Volunteers', 'view', 'volunteers', 'View Volunteers', 'View volunteers'),
  ('volunteers', 'Volunteers', 'create', 'volunteers', 'Create Volunteers', 'Create volunteers'),
  ('volunteers', 'Volunteers', 'edit', 'volunteers', 'Edit Volunteers', 'Edit volunteers'),
  ('volunteers', 'Volunteers', 'delete', 'volunteers', 'Delete Volunteers', 'Delete volunteers'),
  -- Partners
  ('partners', 'Partners', 'view', 'partners', 'View Partners', 'View partners'),
  ('partners', 'Partners', 'create', 'partners', 'Create Partners', 'Create partners'),
  ('partners', 'Partners', 'edit', 'partners', 'Edit Partners', 'Edit partners'),
  ('partners', 'Partners', 'delete', 'partners', 'Delete Partners', 'Delete partners'),
  -- Risk
  ('risk', 'Risk Intelligence', 'view', 'risk', 'View Risk', 'View risk intelligence'),
  ('risk', 'Risk Intelligence', 'manage', 'risk', 'Manage Risk', 'Manage risk settings'),
  -- M&E
  ('me', 'M&E Suite', 'view', 'me', 'View M&E', 'View M&E suite'),
  ('me', 'M&E Suite', 'create', 'me', 'Create M&E Data', 'Create M&E data'),
  ('me', 'M&E Suite', 'manage', 'me', 'Manage M&E', 'Manage M&E settings'),
  -- AI
  ('ai', 'AI Insights', 'view', 'insights', 'View AI Insights', 'View AI insights'),
  ('ai', 'AI Insights', 'manage', 'insights', 'Manage AI', 'Manage AI settings')
ON CONFLICT DO NOTHING;

-- Assign ALL permissions (including new ones) to every existing org_admin role
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.name = 'org_admin'
ON CONFLICT DO NOTHING;
