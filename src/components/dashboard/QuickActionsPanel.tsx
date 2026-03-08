import { useState } from "react";
import {
  UserPlus, Target, Eye, FileText, DollarSign, HandCoins, Notebook, Receipt, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/usePermissions";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  permissionCheck?: boolean;
  formComponent?: string;
}

const allActions: QuickAction[] = [
  { id: "add-beneficiary", label: "Add Beneficiary", icon: UserPlus, permissionCheck: true },
  { id: "enroll-beneficiary", label: "Enroll in Program", icon: Users },
  { id: "add-observation", label: "Add Observation", icon: Eye },
  { id: "add-report", label: "Add Project Report", icon: FileText },
  { id: "record-donation", label: "Record Donation", icon: DollarSign },
  { id: "add-sponsorship", label: "Add Sponsorship", icon: HandCoins },
  { id: "record-expense", label: "Record Expense", icon: Receipt },
  { id: "add-case-note", label: "Add Case Note", icon: Notebook },
];

export function QuickActionsPanel() {
  const { can } = usePermissions();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const getFormContent = (actionId: string) => {
    switch (actionId) {
      case "add-beneficiary":
        return <p className="text-sm text-muted-foreground py-8 text-center">Navigate to <a href="/beneficiaries" className="text-primary underline">Beneficiaries</a> to add a new beneficiary with the full registration form.</p>;
      case "enroll-beneficiary":
        return <p className="text-sm text-muted-foreground py-8 text-center">Navigate to a <a href="/beneficiaries" className="text-primary underline">beneficiary profile</a> to enroll them in a program.</p>;
      case "add-observation":
        return <p className="text-sm text-muted-foreground py-8 text-center">Navigate to <a href="/programs-management" className="text-primary underline">Programs</a> to add an observation to a specific program.</p>;
      case "add-report":
        return <p className="text-sm text-muted-foreground py-8 text-center">Navigate to <a href="/custom-reports" className="text-primary underline">Reports</a> to create a new project report.</p>;
      case "record-donation":
      case "add-sponsorship":
        return <p className="text-sm text-muted-foreground py-8 text-center">Navigate to <a href="/financial-suite" className="text-primary underline">Financial Suite</a> to record a donation or sponsorship.</p>;
      case "record-expense":
        return <p className="text-sm text-muted-foreground py-8 text-center">Navigate to <a href="/financial-suite" className="text-primary underline">Financial Suite</a> to record an expense.</p>;
      case "add-case-note":
        return <p className="text-sm text-muted-foreground py-8 text-center">Navigate to a <a href="/beneficiaries" className="text-primary underline">beneficiary profile</a> to add a case note.</p>;
      default:
        return null;
    }
  };

  const activeLabel = allActions.find((a) => a.id === activeAction)?.label;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2">
        {allActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => setActiveAction(action.id)}
            className="h-auto py-3 px-3 flex flex-col items-center gap-1.5 bg-card hover:bg-muted/50 border-border text-foreground"
          >
            <action.icon className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
          </Button>
        ))}
      </div>

      <Dialog open={!!activeAction} onOpenChange={() => setActiveAction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeLabel}</DialogTitle>
          </DialogHeader>
          {activeAction && getFormContent(activeAction)}
        </DialogContent>
      </Dialog>
    </>
  );
}
