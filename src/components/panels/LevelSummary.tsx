import { useMemo } from 'react';
import { GraphNode, GraphEdge, COMPUTED_LEVEL_LABELS } from '@/types/graph';
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
  edges: GraphEdge[];
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
  edges,
  onLevelClick,
  isOpen,
  onOpenChange,
}: LevelSummaryProps) {
  // Compute levels based on prerequisites (same logic as GraphCanvas)
  const computedLevels = useMemo(() => {
    const inDegree: Record<string, Set<string>> = {};
    
    edges.forEach(edge => {
      if (!inDegree[edge.to]) inDegree[edge.to] = new Set();
      inDegree[edge.to].add(edge.from);
    });
    
    const levels: Record<string, number> = {};
    
    const getLevel = (nodeId: string, visited: Set<string>): number => {
      if (levels[nodeId] !== undefined) return levels[nodeId];
      if (visited.has(nodeId)) return 0;
      
      visited.add(nodeId);
      const prereqs = inDegree[nodeId];
      if (!prereqs || prereqs.size === 0) {
        levels[nodeId] = 0;
      } else {
        const maxPrereqLevel = Math.max(
          ...Array.from(prereqs).map(p => getLevel(p, new Set(visited)))
        );
        levels[nodeId] = maxPrereqLevel + 1;
      }
      return levels[nodeId];
    };
    
    nodes.forEach(node => getLevel(node.id, new Set()));
    return levels;
  }, [nodes, edges]);

  const levelStats = useMemo(() => {
    const stats: Record<number, LevelStats> = {};

    nodes.forEach((node) => {
      const level = computedLevels[node.id] ?? 0;
      if (!stats[level]) {
        stats[level] = {
          level,
          name: COMPUTED_LEVEL_LABELS[level] || `Level ${level}`,
          nodeCount: 0,
          masteredCount: 0,
          masteryPercent: 0,
        };
      }
      stats[level].nodeCount++;
      // Consider "mastered" if highest concept level >= 5 and independence is "Independent"
      if (
        node.cme.highestConceptLevel >= 5 &&
        node.cme.independence === 'Independent'
      ) {
        stats[level].masteredCount++;
      }
    });

    // Calculate percentages
    Object.values(stats).forEach((stat) => {
      stat.masteryPercent = Math.round(
        (stat.masteredCount / stat.nodeCount) * 100
      );
    });

    // Sort by level descending (advanced at top)
    return Object.values(stats).sort((a, b) => b.level - a.level);
  }, [nodes, computedLevels]);

  const totalMastered = levelStats.reduce((sum, s) => sum + s.masteredCount, 0);
  const totalNodes = nodes.length;
  const overallPercent = Math.round((totalMastered / totalNodes) * 100) || 0;

  // Color based on level position
  const getLevelColor = (level: number) => {
    const maxLevel = Math.max(...levelStats.map(s => s.level), 1);
    if (level === 0) return 'hsl(152, 69%, 41%)'; // Green for foundational
    if (level === maxLevel) return 'hsl(35, 92%, 53%)'; // Orange for advanced
    return 'hsl(262, 83%, 58%)'; // Purple for intermediate
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="w-full">
        <div className="panel-glass p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-foreground">
              Prerequisite Levels
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
                  backgroundColor: getLevelColor(stat.level),
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
