import { GraphNode, GraphEdge } from '@/types/graph';
import { X, Brain, Clock, TrendingUp, ArrowRight, Link, Activity, Target, Shield, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface NodeDetailPanelProps {
  node: GraphNode;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
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
                <p className="text-muted-foreground mt-2">
                  {node.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <TrendingUp className="h-5 w-5 text-accent rotate-180" />
                Prerequisites ({prerequisites.length})
              </div>
              <div className="space-y-3 pl-7">
                {prerequisites.map(({ node: prereq, reason }) => (
                  <button
                    key={prereq!.id}
                    className="w-full text-left group"
                    onClick={() => onNodeSelect(prereq!.id)}
                  >
                    <div className="flex items-center gap-2 text-base text-foreground group-hover:text-accent transition-colors">
                      <Link className="h-4 w-4" />
                      {prereq!.name}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 pl-6">
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
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <ArrowRight className="h-5 w-5 text-accent" />
                Unlocks ({unlocks.length})
              </div>
              <div className="space-y-3 pl-7">
                {unlocks.map(({ node: unlock, reason }) => (
                  <button
                    key={unlock!.id}
                    className="w-full text-left group"
                    onClick={() => onNodeSelect(unlock!.id)}
                  >
                    <div className="flex items-center gap-2 text-base text-foreground group-hover:text-accent transition-colors">
                      <Link className="h-4 w-4" />
                      {unlock!.name}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 pl-6">
                      {reason}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
