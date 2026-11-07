import { Navigate } from "react-router-dom";
import { TaskManagement } from "@/components/hr/TaskManagement";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkTasks() {
  const { can, isLoading } = usePermissions();
  if (isLoading) return <div className="space-y-3 p-6"><Skeleton className="h-10 w-60" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;
  if (!can.viewTasks) return <Navigate to="/dashboard" replace />;
  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6"><TaskManagement /></div>;
}