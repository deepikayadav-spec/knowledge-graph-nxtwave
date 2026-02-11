import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'skills' | 'subtopics' | 'topics';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const modes: { value: ViewMode; label: string }[] = [
  { value: 'skills', label: 'Skills' },
  { value: 'subtopics', label: 'Subtopics' },
  { value: 'topics', label: 'Topics' },
];

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            value === mode.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
