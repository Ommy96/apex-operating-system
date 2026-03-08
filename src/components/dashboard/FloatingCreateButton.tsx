import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus, Target, FolderKanban, Eye, FileText, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const createActions = [
  { label: "Create Beneficiary", icon: UserPlus, path: "/beneficiaries" },
  { label: "Create Program", icon: Target, path: "/programs-management" },
  { label: "Create Project", icon: FolderKanban, path: "/programs-management" },
  { separator: true },
  { label: "Add Observation", icon: Eye, path: "/programs-management" },
  { label: "Add Report", icon: FileText, path: "/custom-reports" },
  { label: "Add Donation", icon: DollarSign, path: "/financial-suite" },
  { separator: true },
  { label: "Enroll Beneficiary", icon: Users, path: "/beneficiaries" },
];

export function FloatingCreateButton() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary-dark text-primary-foreground"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
          <DropdownMenuLabel>Quick Create</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {createActions.map((action, i) =>
            'separator' in action ? (
              <DropdownMenuSeparator key={`sep-${i}`} />
            ) : (
              <DropdownMenuItem
                key={action.label}
                onClick={() => navigate(action.path!)}
                className="cursor-pointer"
              >
                {'icon' in action && action.icon && <action.icon className="h-4 w-4 mr-2 text-muted-foreground" />}
                {action.label}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
