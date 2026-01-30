import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { NODE_TYPE_COLORS } from '@/types/graph';

const nodeTypes = [
  { type: 'root', color: NODE_TYPE_COLORS.root, label: 'Root', description: 'No prerequisites' },
  { type: 'intermediate', color: NODE_TYPE_COLORS.intermediate, label: 'Intermediate', description: 'Has prerequisites & dependents' },
  { type: 'leaf', color: NODE_TYPE_COLORS.leaf, label: 'Leaf', description: 'No dependents' },
];

const cognitiveTargets = [
  { level: 1, label: 'Lv1 - Recall', description: 'Remember facts' },
  { level: 2, label: 'Lv2 - Understand', description: 'Explain concepts' },
  { level: 3, label: 'Lv3 - Apply', description: 'Use in new contexts' },
  { level: 4, label: 'Lv4 - Analyze', description: 'Break down complexity' },
];

export function LegendPanel() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Graph Legend</h4>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Node Types (by position)
            </div>
            <div className="space-y-1.5">
              {nodeTypes.map(({ type, color, label, description }) => (
                <div key={type} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">— {description}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Cognitive Target (badge)
            </div>
            <div className="space-y-1.5 text-xs">
              {cognitiveTargets.map(({ level, label, description }) => (
                <div key={level} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-muted border border-dashed border-border flex items-center justify-center text-[8px] font-semibold text-muted-foreground">
                    Lv{level}
                  </div>
                  <span className="text-muted-foreground">{description}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">Interactions</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-node-active bg-background" />
                <span className="text-muted-foreground">Selected Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-edge-highlight rounded" />
                <span className="text-muted-foreground">Highlighted Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-edge rounded" />
                <span className="text-muted-foreground">Prerequisite Link</span>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
