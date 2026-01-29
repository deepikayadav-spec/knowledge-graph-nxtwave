import { GraphNode, GraphEdge } from '@/types/graph';
import { X, Brain, Clock, TrendingUp, ArrowRight, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface NodeDetailPanelProps {
  node: GraphNode;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
}

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

  // Dummy learning metrics for display
  const learningValue = Math.floor(Math.random() * 40) + 60; // 60-100
  const learningEffort = Math.floor(Math.random() * 30) + 10; // 10-40 minutes

  return (
    <div className="panel-glass w-80 max-h-[calc(100vh-2rem)] overflow-y-auto animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm p-4 border-b border-border z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
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

      <div className="p-4 space-y-5">
        {/* Learning Metrics */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Brain className="h-4 w-4 text-accent" />
            Learning Metrics
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-accent/10 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Learning Value</div>
              <div className="text-2xl font-bold text-accent">{learningValue}</div>
              <div className="text-xs text-muted-foreground">points</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Learning Effort
              </div>
              <div className="text-2xl font-bold text-foreground">{learningEffort}</div>
              <div className="text-xs text-muted-foreground">minutes</div>
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
