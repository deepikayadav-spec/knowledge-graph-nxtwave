import { useMemo } from 'react';
import { GraphNode, LEVEL_LABELS } from '@/types/graph';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface LevelSummaryProps {
  nodes: GraphNode[];
  onLevelClick: (level: number) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LevelStats {
  level: number;
  name: string;
  nodeCount: number;
  masteredCount: number;
  masteryPercent: number;
}

export function LevelSummary({
  nodes,
  onLevelClick,
  isOpen,
  onOpenChange,
}: LevelSummaryProps) {
  const levelStats = useMemo(() => {
    const stats: Record<number, LevelStats> = {};

    nodes.forEach((node) => {
      if (!stats[node.level]) {
        stats[node.level] = {
          level: node.level,
          name: LEVEL_LABELS[node.level] || `Level ${node.level}`,
          nodeCount: 0,
          masteredCount: 0,
          masteryPercent: 0,
        };
      }
      stats[node.level].nodeCount++;
      // Consider "mastered" if highest concept level >= 5 and independence is "Independent"
      if (
        node.cme.highestConceptLevel >= 5 &&
        node.cme.independence === 'Independent'
      ) {
        stats[node.level].masteredCount++;
      }
    });

    // Calculate percentages
    Object.values(stats).forEach((stat) => {
      stat.masteryPercent = Math.round(
        (stat.masteredCount / stat.nodeCount) * 100
      );
    });

    return Object.values(stats).sort((a, b) => a.level - b.level);
  }, [nodes]);

  const totalMastered = levelStats.reduce((sum, s) => sum + s.masteredCount, 0);
  const totalNodes = nodes.length;
  const overallPercent = Math.round((totalMastered / totalNodes) * 100) || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="w-full">
        <div className="panel-glass p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-foreground">
              Level Summary
            </div>
            <div className="text-xs text-muted-foreground">
              {totalMastered}/{totalNodes} concepts mastered
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-mono text-accent">{overallPercent}%</div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 space-y-1">
          {levelStats.map((stat) => (
            <button
              key={stat.level}
              onClick={() => onLevelClick(stat.level)}
              className={cn(
                'w-full panel-glass p-3 flex items-center gap-3',
                'hover:bg-muted/50 transition-colors text-left'
              )}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{
                  backgroundColor: `hsl(${173 + stat.level * 25} 58% 45%)`,
                }}
              >
                {stat.level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {stat.name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress
                    value={stat.masteryPercent}
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                    {stat.masteryPercent}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {stat.nodeCount} node{stat.nodeCount !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
