// Header badge shown when in edit mode

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Pencil } from 'lucide-react';

interface EditModeHeaderProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

export function EditModeHeader({ isEditMode, onToggleEditMode }: EditModeHeaderProps) {
  if (!isEditMode) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleEditMode}
        className="gap-1.5"
      >
        <Pencil className="h-4 w-4" />
        Edit Groups
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="gap-1.5 py-1 px-2">
        <Pencil className="h-3 w-3" />
        Editing Groups
      </Badge>
      <Button
        variant="default"
        size="sm"
        onClick={onToggleEditMode}
        className="gap-1.5"
      >
        <CheckCircle className="h-4 w-4" />
        Done
      </Button>
    </div>
  );
}
