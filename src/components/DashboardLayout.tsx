import { ReactNode } from "react";
import { WorkspaceLayout } from "@/components/workspace";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}
