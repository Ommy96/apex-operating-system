import { lazy, Suspense } from "react";
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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register-organization" element={<RegisterOrganization />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/super-admin" element={<SuperAdminLogin />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs-management" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProgramsManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/entities/:slug" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EntityDataPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiaries" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Beneficiaries />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/donors" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DonorManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiaries/:id" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <BeneficiaryProfile />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/dynamic/:programId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DynamicProgramPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/dashboard/:programId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProgramDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects/dashboard/:projectId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProjectDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />


            <Route path="/financial" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FinancialSuite />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/me-suite" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MESuite />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/hr" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <HRManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/automation" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AutomationEngine />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/communications" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CommunicationsHub />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/ai-insights" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AIInsights />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/document-management" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DocumentManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/compliance" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ComplianceGovernance />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/board-reporting" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <BoardReporting />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/volunteers" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <VolunteerManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/branches" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <BranchManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/partners" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PartnerCollaboration />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            {/* CustomReports merged into ReportsAnalytics as "Custom Reports" tab */}
            <Route path="/risk-intelligence" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <RiskIntelligence />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/field-mode" element={
              <ProtectedRoute>
                <FieldMode />
              </ProtectedRoute>
            } />
            <Route path="/reports-analytics" element={
              <ProtectedRoute requirePermission={{ module: 'reports', action: 'view', resource: 'reports' }}>
                <DashboardLayout>
                  <ReportsAnalytics />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/role-management" element={
              <ProtectedRoute requirePermission={{ module: 'users', action: 'manage', resource: 'roles' }}>
                <DashboardLayout>
                  <RoleManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/organization-settings" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <OrganizationSettings />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/infera" element={
              <SuperAdminRoute>
                <InferaAdminDashboard />
              </SuperAdminRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
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
