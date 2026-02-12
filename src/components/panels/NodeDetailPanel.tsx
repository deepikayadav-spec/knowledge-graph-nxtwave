import { useState } from 'react';
import { GraphNode, GraphEdge } from '@/types/graph';
import { X, Brain, Clock, TrendingUp, ArrowRight, Link, Activity, Target, Shield, Timer, User, BarChart3, RefreshCw, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AddEdgeDialog } from './AddEdgeDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { KPMastery } from '@/types/mastery';

interface NodeDetailPanelProps {
  node: GraphNode;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
  // Mastery mode props
  masteryMode?: boolean;
  studentMastery?: KPMastery;
  studentName?: string | null;
  // CRUD props
  onDeleteNode?: (nodeId: string) => void;
  onAddEdge?: (fromSkill: string, toSkill: string) => Promise<void>;
  onRemoveEdge?: (fromSkill: string, toSkill: string) => Promise<void>;
}

// Concept level descriptions from the framework
const CONCEPT_LEVELS = [
  { level: 1, name: 'Recognition', description: 'Identify concept when presented' },
  { level: 2, name: 'Recall', description: 'Remember and reproduce' },
  { level: 3, name: 'Comprehension', description: 'Explain in own words' },
  { level: 4, name: 'Direct Application', description: 'Apply in straightforward context' },
  { level: 5, name: 'Adapted Application', description: 'Apply with modifications' },
  { level: 6, name: 'Integration', description: 'Combine multiple concepts' },
  { level: 7, name: 'Transfer', description: 'Apply to novel domains' },
];

const INDEPENDENCE_STATUSES = ['Independent', 'Lightly Scaffolded', 'Heavily Assisted'] as const;
const RETENTION_STATUSES = ['Current', 'Aging', 'Expired'] as const;

// Generate dummy CME data
const generateDummyCME = () => {
  const highestLevel = Math.floor(Math.random() * 4) + 1; // 1-4 for dummy
  const independence = INDEPENDENCE_STATUSES[Math.floor(Math.random() * 3)];
  const retention = RETENTION_STATUSES[Math.floor(Math.random() * 3)];
  
  // Generate level percentages (higher levels have lower percentages)
  const levelBreakdown: Record<number, number> = {};
  let currentPct = 100;
  for (let i = 1; i <= highestLevel; i++) {
    levelBreakdown[i] = Math.max(20, currentPct - Math.floor(Math.random() * 20));
    currentPct = levelBreakdown[i];
  }
  
  return { highestLevel, independence, retention, levelBreakdown };
};

// Generate dummy LE data
const generateDummyLE = () => {
  const passiveTime = Math.floor(Math.random() * 16) + 5; // 5-20 min
  const activeTime = Math.floor(Math.random() * 11) + 5; // 5-15 min
  const wetWeight = 0.7; // Weight for active time in WET calculation
  const wet = Math.round(passiveTime * (1 - wetWeight) + activeTime * wetWeight);
  const persistence = Math.random() > 0.5 ? 0.25 : 0.5;
  const finalLE = Math.round(wet * (1 + persistence) * 10) / 10;
  
  return { passiveTime, activeTime, wet, persistence, finalLE };
};

export function NodeDetailPanel({
  node,
  edges,
  allNodes,
  onClose,
  onNodeSelect,
  masteryMode = false,
  studentMastery,
  studentName,
  onDeleteNode,
  onAddEdge,
  onRemoveEdge,
}: NodeDetailPanelProps) {
  const [addEdgeMode, setAddEdgeMode] = useState<'prerequisite' | 'dependent' | null>(null);

  const prerequisites = edges
    .filter((e) => e.to === node.id)
    .map((e) => ({
      edge: e,
      node: allNodes.find((n) => n.id === e.from),
      reason: e.reason,
    }))
    .filter((p) => p.node);

  const unlocks = edges
    .filter((e) => e.from === node.id)
    .map((e) => ({
      edge: e,
      node: allNodes.find((n) => n.id === e.to),
      reason: e.reason,
    }))
    .filter((u) => u.node);

  // Generate dummy metrics (in real app, these would come from node data)
  const cmeData = generateDummyCME();
  const leData = generateDummyLE();

  const getRetentionColor = (status: string) => {
    switch (status) {
      case 'Current': return 'text-green-600 bg-green-100';
      case 'Aging': return 'text-amber-600 bg-amber-100';
      case 'Expired': return 'text-red-600 bg-red-100';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getIndependenceColor = (status: string) => {
    switch (status) {
      case 'Independent': return 'text-green-600 bg-green-100';
      case 'Lightly Scaffolded': return 'text-blue-600 bg-blue-100';
      case 'Heavily Assisted': return 'text-orange-600 bg-orange-100';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Existing prerequisite/dependent IDs for exclusion
  const prereqIds = prerequisites.map(p => p.node!.id);
  const unlockIds = unlocks.map(u => u.node!.id);

  const handleAddPrerequisite = async (targetId: string) => {
    if (onAddEdge) await onAddEdge(targetId, node.id);
  };

  const handleAddDependent = async (targetId: string) => {
    if (onAddEdge) await onAddEdge(node.id, targetId);
  };

  // Questions referencing this skill
  const referencingQuestions = node.knowledgePoint.appearsInQuestions || [];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
      onClick={handleBackdropClick}
    >
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in border border-border">
        {/* Sticky Header */}
        <div className="shrink-0 border-b border-border p-6 rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground leading-tight">
                {node.name}
              </h2>
              {node.description && (
                <p className="text-muted-foreground mt-2">{node.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs font-mono">{node.id}</Badge>
                {node.tier && <Badge variant="secondary" className="text-xs">{node.tier}</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onDeleteNode && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{node.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the knowledge point and all its edges ({prerequisites.length} prerequisites, {unlocks.length} dependents).
                        {referencingQuestions.length > 0 && (
                          <span className="block mt-2 text-destructive">
                            ⚠ Referenced by {referencingQuestions.length} question(s). The knowledge point will be removed from those questions.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { onDeleteNode(node.id); onClose(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Student Mastery Section (when in mastery mode with student selected) */}
          {masteryMode && studentName && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <User className="h-5 w-5 text-accent" />
                Student Mastery
                <Badge variant="secondary" className="text-xs ml-auto">{studentName}</Badge>
              </div>

              {studentMastery ? (
                <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                  {/* Effective Mastery */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="h-4 w-4" />
                        Effective Mastery
                      </span>
                      <span className={cn(
                        "text-lg font-bold",
                        (studentMastery.effectiveMastery ?? studentMastery.rawMastery) >= 0.8 
                          ? "text-green-600" 
                          : (studentMastery.effectiveMastery ?? studentMastery.rawMastery) >= 0.5 
                            ? "text-amber-600" 
                            : "text-red-600"
                      )}>
                        {Math.round((studentMastery.effectiveMastery ?? studentMastery.rawMastery) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(studentMastery.effectiveMastery ?? studentMastery.rawMastery) * 100} 
                      className="h-2.5" 
                    />
                  </div>

                  <Separator />

                  {/* Raw Mastery & Retention */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Raw Mastery</span>
                      <div className="font-medium">{Math.round(studentMastery.rawMastery * 100)}%</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Retention Factor</span>
                      <div className="font-medium">
                        {studentMastery.retentionFactor != null 
                          ? `${Math.round(studentMastery.retentionFactor * 100)}%` 
                          : '--'}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Retention Status & Stability */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Retention Status
                      </span>
                      <Badge className={cn(
                        "text-sm",
                        studentMastery.retentionStatus === 'current' 
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : studentMastery.retentionStatus === 'aging'
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                            : "bg-red-100 text-red-700 hover:bg-red-100"
                      )}>
                        {studentMastery.retentionStatus === 'current' ? 'Current' 
                          : studentMastery.retentionStatus === 'aging' ? 'Aging' 
                          : 'Expired'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="h-4 w-4" />
                        Stability
                      </span>
                      <div className="text-base font-medium">{studentMastery.stability.toFixed(2)}</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Practice Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Successful Recalls:</span>
                      <span className="font-medium">{studentMastery.retrievalCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Points:</span>
                      <span className="font-medium">
                        {studentMastery.earnedPoints.toFixed(1)}/{studentMastery.maxPoints.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {studentMastery.lastReviewedAt && (
                    <div className="text-xs text-muted-foreground">
                      Last reviewed: {new Date(studentMastery.lastReviewedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-4 text-center text-muted-foreground">
                  <p className="text-sm">No attempts recorded yet</p>
                  <p className="text-xs mt-1">Log attempts to track mastery</p>
                </div>
              )}
            </section>
          )}

          {masteryMode && studentName && <Separator />}

          {/* Learning Effort & CME Sections - Only in mastery mode with student selected */}
          {masteryMode && studentName && (
            <>
              {/* Learning Effort (LE) Section */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Timer className="h-5 w-5 text-accent" />
                  Learning Effort (LE)
                </div>

                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Passive Time:</span>
                      <span className="font-medium">{leData.passiveTime} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Time:</span>
                      <span className="font-medium">{leData.activeTime} min</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Weighted Engagement (WET):</span>
                    <span className="font-medium">{leData.wet} min</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Persistence Factor:</span>
                    <span className="font-medium">+{leData.persistence}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium text-foreground">Final LE:</span>
                    <span className="text-xl font-bold text-accent">{leData.finalLE} min</span>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Concept Mastery Evidence (CME) Section */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Brain className="h-5 w-5 text-accent" />
                  Concept Mastery Evidence (CME)
                </div>

                <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                  {/* Highest Concept Level */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        Highest Level
                      </span>
                      <Badge variant="secondary" className="text-sm">
                        L{cmeData.highestLevel}
                      </Badge>
                    </div>
                    <div className="text-base font-medium">
                      {CONCEPT_LEVELS[cmeData.highestLevel - 1]?.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {CONCEPT_LEVELS[cmeData.highestLevel - 1]?.description}
                    </div>
                  </div>

                  <Separator />

                  {/* Independence & Retention Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Shield className="h-4 w-4" />
                        Independence
                      </span>
                      <Badge className={`text-sm ${getIndependenceColor(cmeData.independence)}`}>
                        {cmeData.independence}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Retention
                      </span>
                      <Badge className={`text-sm ${getRetentionColor(cmeData.retention)}`}>
                        {cmeData.retention}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Level Breakdown */}
                  <div className="space-y-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      Level Breakdown
                    </span>
                    <div className="space-y-2">
                      {Object.entries(cmeData.levelBreakdown).map(([level, pct]) => (
                        <div key={level} className="flex items-center gap-3">
                          <span className="text-sm w-8 text-muted-foreground">L{level}</span>
                          <Progress value={pct} className="h-2.5 flex-1" />
                          <span className="text-sm w-10 text-right font-medium">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <Separator />
            </>
          )}

          {/* Prerequisites */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <TrendingUp className="h-5 w-5 text-accent rotate-180" />
                Prerequisites ({prerequisites.length})
              </div>
              {onAddEdge && (
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setAddEdgeMode('prerequisite')}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            {prerequisites.length > 0 ? (
              <div className="space-y-3 pl-7">
                {prerequisites.map(({ node: prereq, reason, edge }) => (
                  <div key={prereq!.id} className="flex items-start gap-2 group">
                    <button className="flex-1 text-left" onClick={() => onNodeSelect(prereq!.id)}>
                      <div className="flex items-center gap-2 text-base text-foreground group-hover:text-accent transition-colors">
                        <Link className="h-4 w-4" />{prereq!.name}
                      </div>
                      {reason && <div className="text-sm text-muted-foreground mt-1 pl-6">{reason}</div>}
                    </button>
                    {onRemoveEdge && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveEdge(edge.from, edge.to)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground pl-7">No prerequisites (Level 0 knowledge point)</p>
            )}
          </section>

          {/* Unlocks */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <ArrowRight className="h-5 w-5 text-accent" />
                Unlocks ({unlocks.length})
              </div>
              {onAddEdge && (
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setAddEdgeMode('dependent')}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            {unlocks.length > 0 ? (
              <div className="space-y-3 pl-7">
                {unlocks.map(({ node: unlock, reason, edge }) => (
                  <div key={unlock!.id} className="flex items-start gap-2 group">
                    <button className="flex-1 text-left" onClick={() => onNodeSelect(unlock!.id)}>
                      <div className="flex items-center gap-2 text-base text-foreground group-hover:text-accent transition-colors">
                        <Link className="h-4 w-4" />{unlock!.name}
                      </div>
                      {reason && <div className="text-sm text-muted-foreground mt-1 pl-6">{reason}</div>}
                    </button>
                    {onRemoveEdge && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveEdge(edge.from, edge.to)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground pl-7">No dependents (leaf knowledge point)</p>
            )}
          </section>
        </div>
      </div>

      {/* Add Edge Dialogs */}
      {addEdgeMode === 'prerequisite' && (
        <AddEdgeDialog
          open={true}
          onOpenChange={() => setAddEdgeMode(null)}
          onAdd={handleAddPrerequisite}
          allNodes={allNodes}
          excludeIds={[node.id, ...prereqIds]}
          mode="prerequisite"
          sourceNodeName={node.name}
        />
      )}
      {addEdgeMode === 'dependent' && (
        <AddEdgeDialog
          open={true}
          onOpenChange={() => setAddEdgeMode(null)}
          onAdd={handleAddDependent}
          allNodes={allNodes}
          excludeIds={[node.id, ...unlockIds]}
          mode="dependent"
          sourceNodeName={node.name}
        />
      )}
    </div>
  );
}
