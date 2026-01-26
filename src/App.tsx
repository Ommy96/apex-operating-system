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
import Dashboard from "./pages/Dashboard";
import Children from "./pages/Children";
import ChildProfile from "./pages/ChildProfile";
import ChildReport from "./pages/ChildReport";
import Alumni from "./pages/Alumni";
import GradeProgression from "./pages/GradeProgression";
import Programs from "./pages/Programs";
import ProgramsManagement from "./pages/ProgramsManagement";
import SponsorsManagement from "./pages/SponsorsManagement";
import Reports from "./pages/Reports";
import AttendanceManagement from "./pages/AttendanceManagement";

import OrganizationSettings from "./pages/OrganizationSettings";
import InferaAdminDashboard from "./pages/InferaAdminDashboard";
import ReportsAnalytics from "./pages/ReportsAnalytics";
import FeedingProgram from "./pages/FeedingProgram";
import KipawaSato from "./pages/KipawaSato";
import Medical from "./pages/Medical";
import FamilyAdoption from "./pages/FamilyAdoption";
import SelfEmpowerment from "./pages/SelfEmpowerment";
import SupportGroups from "./pages/SupportGroups";
import Documents from "./pages/Documents";
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
            <Route path="/sponsors-management" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SponsorsManagement />
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
            <Route path="/children" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Children />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/children/alumni" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Alumni />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/children/grade-progression" element={
              <ProtectedRoute requireRole="admin">
                <DashboardLayout>
                  <GradeProgression />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/children/:id" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ChildProfile />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/children/:id/report" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ChildReport />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/feeding" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FeedingProgram />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/kipawa-sato" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <KipawaSato />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/medical" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Medical />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/family-adoption" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FamilyAdoption />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/self-empowerment" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SelfEmpowerment />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/support-groups" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SupportGroups />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/programs/:programName" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Programs />
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
            <Route path="/reports" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports/attendance" element={
              <ProtectedRoute requireRole="admin">
                <DashboardLayout>
                  <AttendanceManagement />
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
            <Route path="/custom-reports" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CustomReports />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports-analytics" element={
              <ProtectedRoute requireRole="management">
                <DashboardLayout>
                  <ReportsAnalytics />
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
            <Route path="/documents" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Documents />
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
