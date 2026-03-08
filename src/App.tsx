import { lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { OrganizationProvider } from "./hooks/useOrganization";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { SessionManager } from "./components/SessionManager";
import { DashboardLayout } from "./components/DashboardLayout";

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
const Beneficiaries = lazy(() => import("./pages/Beneficiaries"));
const BeneficiaryProfile = lazy(() => import("./pages/BeneficiaryProfile"));
const DonorManagement = lazy(() => import("./pages/DonorManagement"));
const DynamicProgramPage = lazy(() => import("./pages/DynamicProgramPage"));
const EntityDataPage = lazy(() => import("./pages/EntityDataPage"));
const OrganizationSettings = lazy(() => import("./pages/OrganizationSettings"));
const InferaAdminDashboard = lazy(() => import("./pages/InferaAdminDashboard"));
const ReportsAnalytics = lazy(() => import("./pages/ReportsAnalytics"));
const RoleManagement = lazy(() => import("./pages/RoleManagement"));
const FinancialSuite = lazy(() => import("./pages/FinancialSuite"));
const MESuite = lazy(() => import("./pages/MEsuite"));
const HRManagement = lazy(() => import("./pages/HRManagement"));
const AutomationEngine = lazy(() => import("./pages/AutomationEngine"));
const CommunicationsHub = lazy(() => import("./pages/CommunicationsHub"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const DocumentManagement = lazy(() => import("./pages/DocumentManagement"));
const ComplianceGovernance = lazy(() => import("./pages/ComplianceGovernance"));
const BoardReporting = lazy(() => import("./pages/BoardReporting"));
const VolunteerManagement = lazy(() => import("./pages/VolunteerManagement"));
const BranchManagement = lazy(() => import("./pages/BranchManagement"));
const PartnerCollaboration = lazy(() => import("./pages/PartnerCollaboration"));
const RiskIntelligence = lazy(() => import("./pages/RiskIntelligence"));
const FieldMode = lazy(() => import("./pages/FieldMode"));

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
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <LazyRoute><Dashboard /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs-management" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout>
                  <LazyRoute><ProgramsManagement /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/entities/:slug" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <LazyRoute><EntityDataPage /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiaries" element={
              <ProtectedRoute requirePermission={{ module: 'beneficiaries', action: 'view', resource: 'beneficiaries' }}>
                <DashboardLayout>
                  <LazyRoute><Beneficiaries /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/donors" element={
              <ProtectedRoute requirePermission={{ module: 'donors', action: 'view', resource: 'donors' }}>
                <DashboardLayout>
                  <LazyRoute><DonorManagement /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiaries/:id" element={
              <ProtectedRoute requirePermission={{ module: 'beneficiaries', action: 'view', resource: 'beneficiaries' }}>
                <DashboardLayout>
                  <LazyRoute><BeneficiaryProfile /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/dynamic/:programId" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout>
                  <LazyRoute><DynamicProgramPage /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/dashboard/:programId" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout>
                  <LazyRoute><ProgramDashboard /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects/dashboard/:projectId" element={
              <ProtectedRoute requirePermission={{ module: 'programs', action: 'view', resource: 'programs' }}>
                <DashboardLayout>
                  <LazyRoute><ProjectDashboard /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/financial" element={
              <ProtectedRoute requirePermission={{ module: 'financial', action: 'view', resource: 'financials' }}>
                <DashboardLayout>
                  <LazyRoute><FinancialSuite /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/me-suite" element={
              <ProtectedRoute requirePermission={{ module: 'me', action: 'view', resource: 'me' }}>
                <DashboardLayout>
                  <LazyRoute><MESuite /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/hr" element={
              <ProtectedRoute requirePermission={{ module: 'hr', action: 'view', resource: 'staff' }}>
                <DashboardLayout>
                  <LazyRoute><HRManagement /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/automation" element={
              <ProtectedRoute requirePermission={{ module: 'automation', action: 'view', resource: 'automation' }}>
                <DashboardLayout>
                  <LazyRoute><AutomationEngine /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/communications" element={
              <ProtectedRoute requirePermission={{ module: 'communications', action: 'view', resource: 'communications' }}>
                <DashboardLayout>
                  <LazyRoute><CommunicationsHub /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/ai-insights" element={
              <ProtectedRoute requirePermission={{ module: 'ai', action: 'view', resource: 'insights' }}>
                <DashboardLayout>
                  <LazyRoute><AIInsights /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/document-management" element={
              <ProtectedRoute requirePermission={{ module: 'documents', action: 'view', resource: 'documents' }}>
                <DashboardLayout>
                  <LazyRoute><DocumentManagement /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/compliance" element={
              <ProtectedRoute requirePermission={{ module: 'compliance', action: 'view', resource: 'compliance' }}>
                <DashboardLayout>
                  <LazyRoute><ComplianceGovernance /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/board-reporting" element={
              <ProtectedRoute requirePermission={{ module: 'board', action: 'view', resource: 'reports' }}>
                <DashboardLayout>
                  <LazyRoute><BoardReporting /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/volunteers" element={
              <ProtectedRoute requirePermission={{ module: 'volunteers', action: 'view', resource: 'volunteers' }}>
                <DashboardLayout>
                  <LazyRoute><VolunteerManagement /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/branches" element={
              <ProtectedRoute requirePermission={{ module: 'branches', action: 'view', resource: 'branches' }}>
                <DashboardLayout>
                  <LazyRoute><BranchManagement /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/partners" element={
              <ProtectedRoute requirePermission={{ module: 'partners', action: 'view', resource: 'partners' }}>
                <DashboardLayout>
                  <LazyRoute><PartnerCollaboration /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/risk-intelligence" element={
              <ProtectedRoute requirePermission={{ module: 'risk', action: 'view', resource: 'risk' }}>
                <DashboardLayout>
                  <LazyRoute><RiskIntelligence /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/field-mode" element={
              <ProtectedRoute>
                <LazyRoute><FieldMode /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/reports-analytics" element={
              <ProtectedRoute requirePermission={{ module: 'reports', action: 'view', resource: 'reports' }}>
                <DashboardLayout>
                  <LazyRoute><ReportsAnalytics /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/role-management" element={
              <ProtectedRoute requirePermission={{ module: 'users', action: 'manage', resource: 'roles' }}>
                <DashboardLayout>
                  <LazyRoute><RoleManagement /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/organization-settings" element={
              <ProtectedRoute requirePermission={{ module: 'settings', action: 'manage', resource: 'org_settings' }}>
                <DashboardLayout>
                  <LazyRoute><OrganizationSettings /></LazyRoute>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/infera" element={
              <SuperAdminRoute>
                <LazyRoute><InferaAdminDashboard /></LazyRoute>
              </SuperAdminRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
