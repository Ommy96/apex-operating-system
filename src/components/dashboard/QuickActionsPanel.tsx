import {
  UserPlus, Target, Eye, FileText, DollarSign, HandCoins, Notebook, Receipt, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { useBeneficiaryTerminology } from "@/hooks/useBeneficiaryTerminology";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  url: string;
  show: boolean;
}

export function QuickActionsPanel() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { term } = useBeneficiaryTerminology();

  const actions: QuickAction[] = [
    { id: "add-beneficiary", label: `Add ${term}`, icon: UserPlus, url: "/beneficiaries", show: can.viewBeneficiaries },
    { id: "enroll-beneficiary", label: "Enroll in Program", icon: Users, url: "/beneficiaries", show: can.viewBeneficiaries },
    { id: "add-observation", label: "Add Observation", icon: Eye, url: "/programs-management", show: can.viewPrograms },
    { id: "add-report", label: "Add Report", icon: FileText, url: "/analytics", show: can.viewReports },
    { id: "record-donation", label: "Record Donation", icon: DollarSign, url: "/donors", show: can.viewDonors },
    { id: "add-sponsorship", label: "Add Sponsorship", icon: HandCoins, url: "/financial", show: can.viewFinancials },
    { id: "record-expense", label: "Record Expense", icon: Receipt, url: "/financial", show: can.viewFinancials },
    { id: "add-case-note", label: "Add Case Note", icon: Notebook, url: "/beneficiaries", show: can.viewBeneficiaries },
  ];

  const visibleActions = actions.filter(a => a.show);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2">
      {visibleActions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          onClick={() => navigate(action.url)}
          className="h-auto py-3 px-3 flex flex-col items-center gap-1.5 bg-card hover:bg-muted/50 border-border text-foreground"
        >
          <action.icon className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
