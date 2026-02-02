import { Cloud, CloudOff, Check, Loader2 } from 'lucide-react';
import { AutosaveStatus } from '@/hooks/useAutosave';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  onManualSave?: () => void;
}

export function AutosaveIndicator({ 
  status, 
  lastSavedAt,
  onManualSave 
}: AutosaveIndicatorProps) {
  const getIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      case 'saved':
        return <Check className="h-3.5 w-3.5" />;
      case 'error':
        return <CloudOff className="h-3.5 w-3.5" />;
      case 'pending':
      case 'idle':
      default:
        return <Cloud className="h-3.5 w-3.5" />;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      case 'pending':
        return 'Unsaved changes';
      case 'idle':
      default:
        return lastSavedAt 
          ? `Saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
          : 'Autosave on';
    }
  };

  const getTooltip = () => {
    switch (status) {
      case 'saving':
        return 'Saving your changes...';
      case 'saved':
        return 'All changes saved';
      case 'error':
        return 'Failed to save. Click to retry.';
      case 'pending':
        return 'Changes will be saved automatically';
      case 'idle':
      default:
        return lastSavedAt 
          ? `Last saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
          : 'Autosave is enabled';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={status === 'error' || status === 'pending' ? onManualSave : undefined}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
              status === 'error' && "text-destructive hover:bg-destructive/10 cursor-pointer",
              status === 'pending' && "text-muted-foreground hover:bg-muted cursor-pointer",
              status === 'saving' && "text-muted-foreground",
              status === 'saved' && "text-accent",
              status === 'idle' && "text-muted-foreground",
              (status === 'error' || status === 'pending') && "hover:text-foreground"
            )}
          >
            {getIcon()}
            <span className="hidden sm:inline">{getLabel()}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{getTooltip()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
