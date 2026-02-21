import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RegisterOrganization from "./pages/RegisterOrganization";
import ResetPassword from "./pages/ResetPassword";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import RoleManagement from "./pages/RoleManagement";
import Dashboard from "./pages/Dashboard";
import ProgramsManagement from "./pages/ProgramsManagement";
import ProgramDashboard from "./pages/ProgramDashboard";



import Beneficiaries from "./pages/Beneficiaries";
import BeneficiaryProfile from "./pages/BeneficiaryProfile";
import OrganizationSettings from "./pages/OrganizationSettings";
import InferaAdminDashboard from "./pages/InferaAdminDashboard";
import ReportsAnalytics from "./pages/ReportsAnalytics";

import { DashboardLayout } from "./components/DashboardLayout";
import { AuthProvider } from "./hooks/useAuth";
import { OrganizationProvider } from "./hooks/useOrganization";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { SessionManager } from "./components/SessionManager";
import NotFound from "./pages/NotFound";
import DynamicProgramPage from "./pages/DynamicProgramPage";
import CustomReports from "./pages/CustomReports";
import EntityDataPage from "./pages/EntityDataPage";
import FinancialSuite from "./pages/FinancialSuite";
import MESuite from "./pages/MEsuite";
import HRManagement from "./pages/HRManagement";
import AutomationEngine from "./pages/AutomationEngine";
import CommunicationsHub from "./pages/CommunicationsHub";
import AIInsights from "./pages/AIInsights";
import DocumentManagement from "./pages/DocumentManagement";

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
            <Route path="/custom-reports" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CustomReports />
                </DashboardLayout>
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
                <DashboardLayout>
                  <InferaAdminDashboard />
                </DashboardLayout>
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
