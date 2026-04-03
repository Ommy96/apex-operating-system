import { ReactNode, useEffect, useState } from "react";
import { WorkspaceLayout } from "@/components/workspace";
import { useBranding } from "@/hooks/useBranding";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Apply org branding (CSS variable + document.title)
  useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const needs2fa = sessionStorage.getItem("requires_2fa_setup") === "true";
    setShowBanner(needs2fa && location.pathname !== "/setup-2fa");
  }, [location.pathname]);

  return (
    <WorkspaceLayout>
      {showBanner && (
        <Alert className="mb-4 border-amber-500/50 bg-amber-500/10 no-print">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-amber-800 dark:text-amber-300">
              Your role requires two-factor authentication. Set it up now to maintain access.
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/setup-2fa")} className="text-xs">
                Set up 2FA
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowBanner(false); sessionStorage.removeItem("requires_2fa_setup"); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {children}
    </WorkspaceLayout>
  );
}
