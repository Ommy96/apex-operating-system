import { useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecordNotFoundProps {
  /** e.g. "Beneficiary", "Project" */
  label?: string;
  /** Where the "Go back" button leads. */
  backTo?: string;
}

/**
 * Friendly empty state for URLs whose code/slug does not resolve inside the
 * current organization (wrong code, deleted record, or another tenant's link).
 */
export function RecordNotFound({ label = "Record", backTo }: RecordNotFoundProps) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="rounded-full bg-muted p-4">
        <FileQuestion className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="text-lg font-semibold">{label} not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This link doesn’t match any {label.toLowerCase()} in your organization. It may have been
        removed, or it belongs to a different organization.
      </p>
      <Button variant="outline" onClick={() => (backTo ? navigate(backTo) : navigate(-1))}>
        Go back
      </Button>
    </div>
  );
}

export default RecordNotFound;
