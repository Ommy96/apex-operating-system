import { Eye, MessageSquare, DollarSign, FolderKanban, Upload, FileText, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileQuickActionsProps {
  onAddObservation: () => void;
  onAddFunding: () => void;
  onEnrollProgram: () => void;
  onUploadDocument: () => void;
}

export function ProfileQuickActions({
  onAddObservation,
  onAddFunding,
  onEnrollProgram,
  onUploadDocument,
}: ProfileQuickActionsProps) {
  const actions = [
    { label: 'Add Observation', icon: MessageSquare, onClick: onAddObservation, color: 'text-primary' },
    { label: 'Add Funding', icon: DollarSign, onClick: onAddFunding, color: 'text-success' },
    { label: 'Enroll in Program', icon: FolderKanban, onClick: onEnrollProgram, color: 'text-info' },
    { label: 'Upload Document', icon: Upload, onClick: onUploadDocument, color: 'text-warning' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="border-border hover:bg-accent"
        >
          <action.icon className={`h-4 w-4 mr-1.5 ${action.color}`} />
          <span className="hidden sm:inline">{action.label}</span>
          <span className="sm:hidden">{action.label.split(' ').pop()}</span>
        </Button>
      ))}
    </div>
  );
}
