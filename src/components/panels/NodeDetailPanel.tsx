import { GraphNode, LEVEL_LABELS, GraphEdge } from '@/types/graph';
import { X, Brain, Clock, TrendingUp, ArrowRight, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NodeDetailPanelProps {
  node: GraphNode;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
}

const independenceColors = {
  Independent: 'bg-node-level0 text-white',
  'Lightly Scaffolded': 'bg-node-level2 text-white',
  'Heavily Assisted': 'bg-node-level4 text-white',
};

const retentionColors = {
  Current: 'bg-node-level0 text-white',
  Aging: 'bg-node-level3 text-white',
  Expired: 'bg-destructive text-destructive-foreground',
};

export function NodeDetailPanel({
  node,
  edges,
  allNodes,
  onClose,
  onNodeSelect,
}: NodeDetailPanelProps) {
  const prerequisites = edges
    .filter((e) => e.to === node.id)
    .map((e) => ({
      node: allNodes.find((n) => n.id === e.from),
      reason: e.reason,
    }))
    .filter((p) => p.node);

  const unlocks = edges
    .filter((e) => e.from === node.id)
    .map((e) => ({
      node: allNodes.find((n) => n.id === e.to),
      reason: e.reason,
    }))
    .filter((u) => u.node);

  return (
    <div className="panel-glass w-96 max-h-[calc(100vh-2rem)] overflow-y-auto animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm p-4 border-b border-border z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono">
                Level {node.level}
              </Badge>
              <Badge 
                variant="secondary" 
                className="text-xs"
              >
                CME: {node.cme.highestConceptLevel}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold text-foreground leading-tight">
              {node.name}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {node.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {node.description}
          </p>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* CME Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Brain className="h-4 w-4 text-accent" />
            Concept Mastery Evidence (CME)
          </div>

          <div className="space-y-3 pl-6">
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Highest Concept Level
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {node.cme.highestConceptLevel}
                </span>
                <span className="text-sm text-muted-foreground">
                  {LEVEL_LABELS[node.cme.highestConceptLevel - 1]}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Independence
                </div>
                <Badge
                  className={cn(
                    'text-xs',
                    independenceColors[node.cme.independence]
                  )}
                >
                  {node.cme.independence}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Retention
                </div>
                <Badge
                  className={cn(
                    'text-xs',
                    retentionColors[node.cme.retention]
                  )}
                >
                  {node.cme.retention}
                </Badge>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2">
                Evidence by Level
              </div>
              <div className="space-y-1.5">
                {Object.entries(node.cme.evidenceByLevel).map(([level, pct]) => (
                  <div key={level} className="flex items-center gap-2">
                    <span className="text-xs font-mono w-6 text-muted-foreground">
                      L{level}
                    </span>
                    <Progress value={pct} className="h-2 flex-1" />
                    <span className="text-xs font-mono w-10 text-right text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* LE Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-accent" />
            Learning Effort (LE)
          </div>

          <div className="grid grid-cols-2 gap-3 pl-6">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Passive Time</div>
              <div className="text-lg font-semibold text-foreground">
                {node.le.passiveTime}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  min
                </span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Active Time</div>
              <div className="text-lg font-semibold text-foreground">
                {node.le.activeTime}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  min
                </span>
              </div>
            </div>
            <div className="bg-accent/10 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">WET</div>
              <div className="text-lg font-semibold text-accent">
                {node.le.weightedEngagementTime.toFixed(1)}
              </div>
            </div>
            <div className="bg-accent/10 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Final LE</div>
              <div className="text-lg font-semibold text-accent">
                {node.le.finalLE.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="pl-6">
            <div className="text-xs text-muted-foreground mb-2">
              Persistence Signals
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  node.le.persistenceSignals.reattemptAfterWrong
                    ? 'default'
                    : 'outline'
                }
                className="text-xs"
              >
                {node.le.persistenceSignals.reattemptAfterWrong ? '✓' : '○'}{' '}
                Reattempt after wrong
              </Badge>
              <Badge
                variant={
                  node.le.persistenceSignals.returnAfterExit
                    ? 'default'
                    : 'outline'
                }
                className="text-xs"
              >
                {node.le.persistenceSignals.returnAfterExit ? '✓' : '○'} Return
                after exit
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Persistence Factor:{' '}
              <span className="font-mono text-foreground">
                +{node.le.persistenceFactor.toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        <Separator />

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-accent rotate-180" />
              Prerequisites ({prerequisites.length})
            </div>
            <div className="space-y-2 pl-6">
              {prerequisites.map(({ node: prereq, reason }) => (
                <button
                  key={prereq!.id}
                  className="w-full text-left group"
                  onClick={() => onNodeSelect(prereq!.id)}
                >
                  <div className="flex items-center gap-2 text-sm text-foreground group-hover:text-accent transition-colors">
                    <Link className="h-3 w-3" />
                    {prereq!.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 pl-5">
                    {reason}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Unlocks */}
        {unlocks.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ArrowRight className="h-4 w-4 text-accent" />
              Unlocks ({unlocks.length})
            </div>
            <div className="space-y-2 pl-6">
              {unlocks.map(({ node: unlock, reason }) => (
                <button
                  key={unlock!.id}
                  className="w-full text-left group"
                  onClick={() => onNodeSelect(unlock!.id)}
                >
                  <div className="flex items-center gap-2 text-sm text-foreground group-hover:text-accent transition-colors">
                    <Link className="h-3 w-3" />
                    {unlock!.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 pl-5">
                    {reason}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
