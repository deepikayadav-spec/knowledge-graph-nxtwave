import { GraphNode, LEVEL_LABELS, GraphEdge } from '@/types/graph';
import { X, Brain, Clock, TrendingUp, ArrowRight, Link, Target, FileQuestion, AlertCircle, Beaker } from 'lucide-react';
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

const independenceColors: Record<string, string> = {
  Unknown: 'bg-muted text-muted-foreground',
  Independent: 'bg-node-level0 text-white',
  'Lightly Scaffolded': 'bg-node-level2 text-white',
  'Heavily Assisted': 'bg-node-level4 text-white',
};

const retentionColors: Record<string, string> = {
  Unknown: 'bg-muted text-muted-foreground',
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
      relationshipType: e.relationshipType,
    }))
    .filter((p) => p.node);

  const unlocks = edges
    .filter((e) => e.from === node.id)
    .map((e) => ({
      node: allNodes.find((n) => n.id === e.to),
      reason: e.reason,
      relationshipType: e.relationshipType,
    }))
    .filter((u) => u.node);

  // Check if CME/LE are measured or estimated
  const isCmeMeasured = node.cme.measured;
  const isLeEstimated = node.le.estimated;

  return (
    <div className="panel-glass w-96 max-h-[calc(100vh-2rem)] overflow-y-auto animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm p-4 border-b border-border z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs font-mono">
                Level {node.level}
              </Badge>
              {node.knowledgePoint && (
                <Badge variant="secondary" className="text-xs">
                  Target: L{node.knowledgePoint.targetAssessmentLevel}
                </Badge>
              )}
              {!isCmeMeasured && (
                <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                  <Beaker className="h-3 w-3 mr-1" />
                  Unmeasured
                </Badge>
              )}
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
        {/* Knowledge Point Section (New!) */}
        {node.knowledgePoint && (
          <>
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Target className="h-4 w-4 text-accent" />
                Knowledge Point
              </div>

              <div className="space-y-3 pl-6">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Atomicity Check
                  </div>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-2">
                    {node.knowledgePoint.atomicityCheck}
                  </p>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <FileQuestion className="h-3 w-3" />
                    Assessment Example
                  </div>
                  <p className="text-sm text-foreground bg-accent/10 rounded-lg p-2 font-mono">
                    {node.knowledgePoint.assessmentExample}
                  </p>
                </div>

                {node.knowledgePoint.appearsInQuestions.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Used in Questions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {node.knowledgePoint.appearsInQuestions.map((q, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {q.length > 30 ? q.substring(0, 27) + '...' : q}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Separator />
          </>
        )}

        {/* CME Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Brain className="h-4 w-4 text-accent" />
            Concept Mastery Evidence (CME)
            {!isCmeMeasured && (
              <Badge variant="outline" className="text-xs ml-auto border-dashed text-muted-foreground">
                No student data
              </Badge>
            )}
          </div>

          {isCmeMeasured ? (
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

              {Object.keys(node.cme.evidenceByLevel).length > 0 && (
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
              )}
            </div>
          ) : (
            <div className="pl-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Mastery data will appear after students complete assessments.</span>
              </div>
            </div>
          )}
        </section>

        <Separator />

        {/* LE Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-accent" />
            Learning Effort (LE)
            {isLeEstimated && (
              <Badge variant="outline" className="text-xs ml-auto border-dashed text-muted-foreground">
                AI Estimate
              </Badge>
            )}
          </div>

          <div className="pl-6">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">
                {isLeEstimated ? 'Estimated Time' : 'Average Time'}
              </div>
              <div className="text-2xl font-semibold text-foreground">
                {isLeEstimated ? node.le.estimatedMinutes : (node.le.measuredMinutes || node.le.finalLE || 0)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  minutes
                </span>
              </div>
            </div>

            {/* Show detailed breakdown only if measured */}
            {!isLeEstimated && node.le.passiveTime !== undefined && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Passive Time</div>
                  <div className="text-lg font-semibold text-foreground">
                    {node.le.passiveTime}
                    <span className="text-xs font-normal text-muted-foreground ml-1">min</span>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Active Time</div>
                  <div className="text-lg font-semibold text-foreground">
                    {node.le.activeTime}
                    <span className="text-xs font-normal text-muted-foreground ml-1">min</span>
                  </div>
                </div>
              </div>
            )}

            {!isLeEstimated && node.le.persistenceSignals && (
              <div className="mt-3">
                <div className="text-xs text-muted-foreground mb-2">
                  Persistence Signals
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={node.le.persistenceSignals.reattemptAfterWrong ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {node.le.persistenceSignals.reattemptAfterWrong ? '✓' : '○'} Reattempt after wrong
                  </Badge>
                  <Badge
                    variant={node.le.persistenceSignals.returnAfterExit ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {node.le.persistenceSignals.returnAfterExit ? '✓' : '○'} Return after exit
                  </Badge>
                </div>
              </div>
            )}
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
              {prerequisites.map(({ node: prereq, reason, relationshipType }) => (
                <button
                  key={prereq!.id}
                  className="w-full text-left group"
                  onClick={() => onNodeSelect(prereq!.id)}
                >
                  <div className="flex items-center gap-2 text-sm text-foreground group-hover:text-accent transition-colors">
                    <Link className="h-3 w-3" />
                    {prereq!.name}
                    {relationshipType && relationshipType !== 'requires' && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        {relationshipType}
                      </Badge>
                    )}
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
              {unlocks.map(({ node: unlock, reason, relationshipType }) => (
                <button
                  key={unlock!.id}
                  className="w-full text-left group"
                  onClick={() => onNodeSelect(unlock!.id)}
                >
                  <div className="flex items-center gap-2 text-sm text-foreground group-hover:text-accent transition-colors">
                    <Link className="h-3 w-3" />
                    {unlock!.name}
                    {relationshipType && relationshipType !== 'requires' && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        {relationshipType}
                      </Badge>
                    )}
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
