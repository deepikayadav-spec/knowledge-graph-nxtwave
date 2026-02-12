import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, Pause, Play, X } from 'lucide-react';
import { BatchProgress } from '@/hooks/useBatchGeneration';

interface GenerationProgressProps {
  progress: BatchProgress;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  hasCheckpoint?: boolean;
}

export function GenerationProgress({ 
  progress, 
  onPause, 
  onResume, 
  onCancel,
  hasCheckpoint 
}: GenerationProgressProps) {
  const percentage = progress.totalBatches > 0 
    ? Math.round((progress.currentBatch / progress.totalBatches) * 100) 
    : 0;

  if (!progress.isProcessing && !hasCheckpoint) {
    return null;
  }

  // Show resume button if there's a checkpoint but not processing
  if (!progress.isProcessing && hasCheckpoint) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-foreground">
            Resume previous generation?
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="h-3 w-3 mr-1" />
              Discard
            </Button>
            <Button size="sm" onClick={onResume}>
              <Play className="h-3 w-3 mr-1" />
              Resume
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-foreground">
            Processing batch {progress.currentBatch} of {progress.totalBatches}
          </span>
        </div>
        {onPause && (
          <Button size="sm" variant="ghost" onClick={onPause}>
            <Pause className="h-3 w-3 mr-1" />
            Pause
          </Button>
        )}
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {progress.skillsDiscovered} knowledge points discovered
        </span>
        <span>
          {progress.estimatedTimeRemaining && `~${progress.estimatedTimeRemaining} remaining`}
        </span>
      </div>
    </div>
  );
}
