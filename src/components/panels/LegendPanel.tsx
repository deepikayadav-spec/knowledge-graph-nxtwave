import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const levelColors = [
  { level: 0, color: 'bg-node-level0', label: 'Foundational' },
  { level: 1, color: 'bg-node-level1', label: 'Basic' },
  { level: 2, color: 'bg-node-level2', label: 'Intermediate' },
  { level: 3, color: 'bg-node-level3', label: 'Advanced' },
  { level: 4, color: 'bg-node-level4', label: 'Expert' },
];

export function LegendPanel() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Graph Legend</h4>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Node Levels
            </div>
            <div className="space-y-1.5">
              {levelColors.map(({ level, color, label }) => (
                <div key={level} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-xs font-mono">L{level}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">Node Info</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[9px] font-bold">
                  4
                </div>
                <span className="text-muted-foreground">
                  CME Level (1-7)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-node-active bg-white" />
                <span className="text-muted-foreground">Selected Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-border bg-white opacity-30" />
                <span className="text-muted-foreground">
                  Outside Course View
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">Edges</div>
            <div className="space-y-1.5 text-xs">
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
