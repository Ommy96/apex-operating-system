import { lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { OrganizationProvider } from "./hooks/useOrganization";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { SessionManager } from "./components/SessionManager";
import { DashboardLayout } from "./components/DashboardLayout";
import { FeatureFlagGuard } from "./components/FeatureFlagGuard";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const RegisterOrganization = lazy(() => import("./pages/RegisterOrganization"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProgramsManagement = lazy(() => import("./pages/ProgramsManagement"));
const ProgramDashboard = lazy(() => import("./pages/ProgramDashboard"));
const ProjectDashboard = lazy(() => import("./pages/ProjectDashboard"));
const ProjectReports = lazy(() => import("./pages/ProjectReports"));
const ProgramReports = lazy(() => import("./pages/ProgramReports"));
const ProjectEligibility = lazy(() => import("./pages/ProjectEligibility"));
const BeneficiaryEligibility = lazy(() => import("./pages/BeneficiaryEligibility"));
const LeadWorkspace = lazy(() => import("./pages/LeadWorkspace"));
const ProgramManagerWorkspace = lazy(() => import("./pages/ProgramManagerWorkspace"));
const BurnVsImpact = lazy(() => import("./pages/BurnVsImpact"));
const AllProjects = lazy(() => import("./pages/AllProjects"));
const Activities = lazy(() => import("./pages/Activities"));
const ActivityDetail = lazy(() => import("./pages/ActivityDetail"));
const Beneficiaries = lazy(() => import("./pages/Beneficiaries"));
const BeneficiaryProfile = lazy(() => import("./pages/BeneficiaryProfile"));
const DonorManagement = lazy(() => import("./pages/DonorManagement"));
const DynamicProgramPage = lazy(() => import("./pages/DynamicProgramPage"));
const EntityDataPage = lazy(() => import("./pages/EntityDataPage"));
const OrganizationSettings = lazy(() => import("./pages/OrganizationSettings"));
const InferaAdminDashboard = lazy(() => import("./pages/InferaAdminDashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const RoleManagement = lazy(() => import("./pages/RoleManagement"));
const FinancialSuite = lazy(() => import("./pages/FinancialSuite"));
const FundingIntelligence = lazy(() => import("./pages/FundingIntelligence"));
const AllocationEngine = lazy(() => import("./pages/AllocationEngine"));
const DonationsInbox = lazy(() => import("./pages/DonationsInbox"));
const GrantDiscovery = lazy(() => import("./pages/GrantDiscovery"));
const HRManagement = lazy(() => import("./pages/HRManagement"));
const AutomationEngine = lazy(() => import("./pages/AutomationEngine"));
const CommunicationsHub = lazy(() => import("./pages/CommunicationsHub"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const DocumentManagement = lazy(() => import("./pages/DocumentManagement"));
const ComplianceGovernance = lazy(() => import("./pages/ComplianceGovernance"));
const BoardReporting = lazy(() => import("./pages/BoardReporting"));

const BranchManagement = lazy(() => import("./pages/BranchManagement"));
const PartnerCollaboration = lazy(() => import("./pages/PartnerCollaboration"));
const RiskIntelligence = lazy(() => import("./pages/RiskIntelligence"));
const FieldMode = lazy(() => import("./pages/FieldMode"));
const DonorAuth = lazy(() => import("./pages/DonorAuth"));
const DonorPortal = lazy(() => import("./pages/DonorPortal"));
const BoardPortal = lazy(() => import("./pages/BoardPortal"));
const HouseholdProfile = lazy(() => import("./pages/HouseholdProfile"));
const Households = lazy(() => import("./pages/Households"));
const WaitlistManagement = lazy(() => import("./pages/WaitlistManagement"));
const SponsorshipPackages = lazy(() => import("./pages/SponsorshipPackages"));
const ConsentOverview = lazy(() => import("./pages/ConsentOverview"));
const VisitManagement = lazy(() => import("./pages/VisitManagement"));

// Sprint 2 pages
const ComplaintIntake = lazy(() => import("./pages/ComplaintIntake"));
const ComplaintManagement = lazy(() => import("./pages/ComplaintManagement"));
const WhistleblowerForm = lazy(() => import("./pages/WhistleblowerForm"));
const WhistleblowerManagement = lazy(() => import("./pages/WhistleblowerManagement"));
const SafeguardingDashboard = lazy(() => import("./pages/SafeguardingDashboard"));
const DeduplicationReview = lazy(() => import("./pages/DeduplicationReview"));

// Sprint 3 pages
const CashTransfers = lazy(() => import("./pages/CashTransfers"));
const ExpenseClaims = lazy(() => import("./pages/ExpenseClaims"));

// Sprint 4 pages
const LessonsLearned = lazy(() => import("./pages/LessonsLearned"));
const ImpactStories = lazy(() => import("./pages/ImpactStories"));
const MECalendar = lazy(() => import("./pages/MECalendar"));
const Setup2FA = lazy(() => import("./pages/Setup2FA"));
const OrgSetupWizard = lazy(() => import("./pages/OrgSetupWizard"));

// Sprint 6 pages
const MapView = lazy(() => import("./pages/MapView"));
const MEConsolidated = lazy(() => import("./pages/MEConsolidated"));
const IndicatorManagement = lazy(() => import("./pages/IndicatorManagement"));
const IndicatorDetail = lazy(() => import("./pages/IndicatorDetail"));
const FormBuilderList = lazy(() => import("./pages/FormBuilderList"));
const FormBuilderEditor = lazy(() => import("./pages/FormBuilderEditor"));
const CaseManagement = lazy(() => import("./pages/CaseManagement"));
const CaseDetail = lazy(() => import("./pages/CaseDetail"));
const DataQualityDashboard = lazy(() => import("./pages/DataQualityDashboard"));
const ReportAssembly = lazy(() => import("./pages/ReportAssembly"));
const StakeholderAccessManagement = lazy(() => import("./pages/StakeholderAccessManagement"));
const StakeholderPortal = lazy(() => import("./pages/StakeholderPortal"));
const PublicDonationPage = lazy(() => import("./pages/PublicDonationPage"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrganizationProvider>
        <SessionManager>
          <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<LazyRoute><Index /></LazyRoute>} />
            <Route path="/auth" element={<LazyRoute><Auth /></LazyRoute>} />
            <Route path="/register-organization" element={<LazyRoute><RegisterOrganization /></LazyRoute>} />
            <Route path="/reset-password" element={<LazyRoute><ResetPassword /></LazyRoute>} />
            <Route path="/super-admin" element={<LazyRoute><SuperAdminLogin /></LazyRoute>} />

            {/* Public intake forms (no auth) */}
            <Route path="/feedback/:orgSlug" element={<LazyRoute><ComplaintIntake /></LazyRoute>} />
            <Route path="/report/:orgSlug" element={<LazyRoute><WhistleblowerForm /></LazyRoute>} />
            <Route path="/stakeholder/:token" element={<LazyRoute><StakeholderPortal /></LazyRoute>} />
            <Route path="/give/:orgSlug/:campaignSlug" element={<LazyRoute><PublicDonationPage /></LazyRoute>} />

            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardLayout><LazyRoute><Dashboard /></LazyRoute></DashboardLayout></ProtectedRoute>
            } />
            <Route path="/programs-management" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><ProgramsManagement /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/portfolio" element={<Navigate to="/programs-management?tab=portfolio" replace />} />
            <Route path="/entities/:slug" element={
              <ProtectedRoute><DashboardLayout><LazyRoute><EntityDataPage /></LazyRoute></DashboardLayout></ProtectedRoute>
            } />
            <Route path="/beneficiaries" element={
              <ProtectedRoute requirePermission={{ module: 'beneficiaries', action: 'view', resource: 'beneficiaries' }}>
                <DashboardLayout><LazyRoute><Beneficiaries /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/donors" element={
              <ProtectedRoute requirePermission={{ module: 'donors', action: 'view', resource: 'donors' }}>
                <DashboardLayout><LazyRoute><DonorManagement /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiaries/:id" element={
              <ProtectedRoute requirePermission={{ module: 'beneficiaries', action: 'view', resource: 'beneficiaries' }}>
                <DashboardLayout><LazyRoute><BeneficiaryProfile /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/households" element={
              <ProtectedRoute requirePermission={{ module: 'beneficiaries', action: 'view', resource: 'beneficiaries' }}>
                <DashboardLayout><LazyRoute><Households /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/households/:householdId" element={
              <ProtectedRoute requirePermission={{ module: 'beneficiaries', action: 'view', resource: 'beneficiaries' }}>
                <DashboardLayout><LazyRoute><HouseholdProfile /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/waitlist" element={
              <ProtectedRoute requirePermission={{ module: 'beneficiaries', action: 'view', resource: 'beneficiaries' }}>
                <DashboardLayout><LazyRoute><WaitlistManagement /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/sponsorship-packages" element={
              <ProtectedRoute requirePermission={{ module: 'beneficiaries', action: 'view', resource: 'beneficiaries' }}>
                <DashboardLayout><LazyRoute><SponsorshipPackages /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/governance/consent" element={
              <ProtectedRoute>
                <DashboardLayout><LazyRoute><ConsentOverview /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/staff/visits" element={
              <ProtectedRoute>
                <DashboardLayout><LazyRoute><VisitManagement /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/dynamic/:programId" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><DynamicProgramPage /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/dashboard/:programId" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><ProgramDashboard /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects/dashboard/:projectId" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><ProjectDashboard /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects/:projectId/reports" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><ProjectReports /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/:programId/reports" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><ProgramReports /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects/:projectId/eligibility" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><ProjectEligibility /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiaries/:id/eligibility" element={
              <ProtectedRoute requirePermission={{ module: 'beneficiaries', action: 'view', resource: 'beneficiaries' }}>
                <DashboardLayout><LazyRoute><BeneficiaryEligibility /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/workspace/lead" element={
              <ProtectedRoute><DashboardLayout><LazyRoute><LeadWorkspace /></LazyRoute></DashboardLayout></ProtectedRoute>
            } />
            <Route path="/workspace/program" element={
              <ProtectedRoute><DashboardLayout><LazyRoute><ProgramManagerWorkspace /></LazyRoute></DashboardLayout></ProtectedRoute>
            } />
            <Route path="/my-project" element={<Navigate to="/workspace/lead" replace />} />
            <Route path="/intelligence/burn-vs-impact" element={
              <ProtectedRoute><DashboardLayout><LazyRoute><BurnVsImpact /></LazyRoute></DashboardLayout></ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><AllProjects /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/activities" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><Activities /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/activities/:id" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><ActivityDetail /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/workplans" element={
              <Navigate to="/projects?view=workplan" replace />
            } />
            <Route path="/portfolio" element={<Navigate to="/programs-management" replace />} />
            <Route path="/financial" element={
              <ProtectedRoute requirePermission={{ module: 'financial', action: 'view', resource: 'financials' }}>
                <DashboardLayout><LazyRoute><FinancialSuite /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/funding/intelligence" element={
              <ProtectedRoute requirePermission={{ module: 'financial', action: 'view', resource: 'financials' }}>
                <DashboardLayout><LazyRoute><FundingIntelligence /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/funding/allocation-engine" element={
              <ProtectedRoute requirePermission={{ module: 'financial', action: 'view', resource: 'financials' }}>
                <DashboardLayout><LazyRoute><AllocationEngine /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/funding/donations-inbox" element={
              <ProtectedRoute requirePermission={{ module: 'financial', action: 'view', resource: 'financials' }}>
                <DashboardLayout><LazyRoute><DonationsInbox /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/ai/grants" element={
              <ProtectedRoute>
                <DashboardLayout><LazyRoute><GrantDiscovery /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/me-suite" element={<Navigate to="/me" replace />} />
            <Route path="/me" element={
              <ProtectedRoute requirePermission={{ module: 'me', action: 'view', resource: 'me' }}>
                <DashboardLayout><LazyRoute><MEConsolidated /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/indicators" element={<Navigate to="/me?tab=indicators" replace />} />
            <Route path="/me/indicators" element={
              <ProtectedRoute requirePermission={{ module: 'me', action: 'view', resource: 'me' }}>
                <DashboardLayout><LazyRoute><IndicatorManagement /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/indicators/:id" element={
              <ProtectedRoute requirePermission={{ module: 'me', action: 'view', resource: 'me' }}>
                <DashboardLayout><LazyRoute><IndicatorDetail /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/me/forms" element={<Navigate to="/me?tab=forms" replace />} />
            <Route path="/me/forms/:id" element={
              <ProtectedRoute requirePermission={{ module: 'me', action: 'view', resource: 'me' }}>
                <DashboardLayout><LazyRoute><FormBuilderEditor /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/cases" element={<Navigate to="/me?tab=cases" replace />} />
            <Route path="/cases/:id" element={
              <ProtectedRoute requirePermission={{ module: 'me', action: 'view', resource: 'me' }}>
                <DashboardLayout><LazyRoute><CaseDetail /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/me/data-quality" element={
              <ProtectedRoute requirePermission={{ module: 'me', action: 'view', resource: 'me' }}>
                <DashboardLayout><LazyRoute><DataQualityDashboard /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/me/reports" element={
              <ProtectedRoute requirePermission={{ module: 'me', action: 'view', resource: 'me' }}>
                <DashboardLayout><LazyRoute><ReportAssembly /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/me/stakeholders" element={
              <ProtectedRoute requirePermission={{ module: 'me', action: 'view', resource: 'me' }}>
                <DashboardLayout><LazyRoute><StakeholderAccessManagement /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/hr" element={
              <ProtectedRoute requirePermission={{ module: 'hr', action: 'view', resource: 'staff' }}>
                <DashboardLayout><LazyRoute><HRManagement /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Feature-flagged routes */}
            <Route path="/automation" element={
              <ProtectedRoute requirePermission={{ module: 'automation', action: 'view', resource: 'automation' }}>
                <FeatureFlagGuard flag="automation" moduleName="Automation Engine">
                  <DashboardLayout><LazyRoute><AutomationEngine /></LazyRoute></DashboardLayout>
                </FeatureFlagGuard>
              </ProtectedRoute>
            } />
            <Route path="/ai-insights" element={
              <ProtectedRoute requirePermission={{ module: 'ai', action: 'view', resource: 'insights' }}>
                <FeatureFlagGuard flag="ai_insights" moduleName="AI Insights">
                  <DashboardLayout><LazyRoute><AIInsights /></LazyRoute></DashboardLayout>
                </FeatureFlagGuard>
              </ProtectedRoute>
            } />
            <Route path="/field-mode" element={
              <ProtectedRoute>
                <FeatureFlagGuard flag="field_mode" moduleName="Field Mode">
                  <LazyRoute><FieldMode /></LazyRoute>
                </FeatureFlagGuard>
              </ProtectedRoute>
            } />
            <Route path="/branches" element={
              <ProtectedRoute requirePermission={{ module: 'branches', action: 'view', resource: 'branches' }}>
                <FeatureFlagGuard flag="multi_branch" moduleName="Branch Management">
                  <DashboardLayout><LazyRoute><BranchManagement /></LazyRoute></DashboardLayout>
                </FeatureFlagGuard>
              </ProtectedRoute>
            } />

            <Route path="/communications" element={
              <ProtectedRoute requirePermission={{ module: 'communications', action: 'view', resource: 'communications' }}>
                <DashboardLayout><LazyRoute><CommunicationsHub /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/document-management" element={
              <ProtectedRoute requirePermission={{ module: 'documents', action: 'view', resource: 'documents' }}>
                <DashboardLayout><LazyRoute><DocumentManagement /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/compliance" element={
              <ProtectedRoute requirePermission={{ module: 'compliance', action: 'view', resource: 'compliance' }}>
                <DashboardLayout><LazyRoute><ComplianceGovernance /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/board-reporting" element={
              <ProtectedRoute requirePermission={{ module: 'board', action: 'view', resource: 'reports' }}>
                <DashboardLayout><LazyRoute><BoardReporting /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/volunteers" element={<Navigate to="/hr" replace />} />
            <Route path="/people" element={<Navigate to="/hr" replace />} />
            <Route path="/partners" element={
              <ProtectedRoute requirePermission={{ module: 'partners', action: 'view', resource: 'partners' }}>
                <DashboardLayout><LazyRoute><PartnerCollaboration /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/risk-intelligence" element={
              <ProtectedRoute requirePermission={{ module: 'risk', action: 'view', resource: 'risk' }}>
                <DashboardLayout><LazyRoute><RiskIntelligence /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports-analytics" element={<Navigate to="/analytics" replace />} />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <DashboardLayout><LazyRoute><Analytics /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/role-management" element={
              <ProtectedRoute requirePermission={{ module: 'users', action: 'manage', resource: 'roles' }}>
                <DashboardLayout><LazyRoute><RoleManagement /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/organization-settings" element={
              <ProtectedRoute requirePermission={{ module: 'settings', action: 'manage', resource: 'org_settings' }}>
                <DashboardLayout><LazyRoute><OrganizationSettings /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Accountability routes */}
            <Route path="/complaints" element={
              <ProtectedRoute requirePermission={{ module: 'accountability', action: 'view', resource: 'accountability' }}>
                <DashboardLayout><LazyRoute><ComplaintManagement /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/safeguarding" element={
              <ProtectedRoute requirePermission={{ module: 'accountability', action: 'view', resource: 'safeguarding' }}>
                <DashboardLayout><LazyRoute><SafeguardingDashboard /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/whistleblower" element={
              <Navigate to="/safeguarding?tab=whistleblower" replace />
            } />
            <Route path="/deduplication" element={
              <Navigate to="/beneficiaries?tab=deduplication" replace />
            } />

            {/* Sprint 3: Financial routes */}
            <Route path="/cash-transfers" element={
              <ProtectedRoute requirePermission={{ module: 'financial', action: 'view', resource: 'financials' }}>
                <DashboardLayout><LazyRoute><CashTransfers /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/expense-claims" element={
              <ProtectedRoute>
                <DashboardLayout><LazyRoute><ExpenseClaims /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Sprint 4 routes */}
            <Route path="/lessons-learned" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><LessonsLearned /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/impact-stories" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><ImpactStories /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/me-calendar" element={<Navigate to="/me?tab=data-collection" replace />} />
            <Route path="/setup-2fa" element={<LazyRoute><Setup2FA /></LazyRoute>} />
            <Route path="/setup/wizard" element={
              <ProtectedRoute><LazyRoute><OrgSetupWizard /></LazyRoute></ProtectedRoute>
            } />

            {/* Sprint 6 routes */}
            <Route path="/map" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout><LazyRoute><MapView /></LazyRoute></DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/procurement" element={<Navigate to="/dashboard" replace />} />

            <Route path="/admin/infera" element={
              <SuperAdminRoute><LazyRoute><InferaAdminDashboard /></LazyRoute></SuperAdminRoute>
            } />
            {/* Donor Portal */}
            <Route path="/donor/login" element={<LazyRoute><DonorAuth /></LazyRoute>} />
            <Route path="/donor/dashboard" element={<LazyRoute><DonorPortal /></LazyRoute>} />
            {/* Board Portal */}
            <Route path="/board-portal" element={<LazyRoute><BoardPortal /></LazyRoute>} />
            {/* Catch-all */}
            <Route path="*" element={<LazyRoute><NotFound /></LazyRoute>} />
          </Routes>
        </BrowserRouter>
        </div>
          </TooltipProvider>
        </SessionManager>
      </OrganizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
