export interface CME {
  highestConceptLevel: number; // 1-7
  levelLabels: string[];
  independence: 'Independent' | 'Lightly Scaffolded' | 'Heavily Assisted';
  retention: 'Current' | 'Aging' | 'Expired';
  evidenceByLevel: Record<number, number>; // level -> percentage
}

export interface LE {
  passiveTime: number; // minutes
  activeTime: number; // minutes
  weightedEngagementTime: number; // WET
  persistenceSignals: {
    reattemptAfterWrong: boolean;
    returnAfterExit: boolean;
  };
  persistenceFactor: number;
  finalLE: number;
}

export interface GraphNode {
  id: string;
  name: string;
  level: number;
  cme: CME;
  le: LE;
  description?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  reason: string;
}

export interface CourseView {
  nodes: Array<{
    id: string;
    inCourse: boolean;
  }>;
}

export interface KnowledgeGraph {
  globalNodes: GraphNode[];
  edges: GraphEdge[];
  courses: Record<string, CourseView>;
  questionPaths: Record<string, string[]>;
}

export const LEVEL_LABELS = [
  'Recognition',
  'Recall (simple)',
  'Recall (complex)',
  'Direct application',
  'Complex application',
  'Transfer',
  'Articulation',
];

export const INDEPENDENCE_COLORS = {
  'Independent': 'hsl(var(--node-level-0))',
  'Lightly Scaffolded': 'hsl(var(--node-level-2))',
  'Heavily Assisted': 'hsl(var(--node-level-4))',
};

export const RETENTION_COLORS = {
  'Current': 'hsl(var(--node-level-0))',
  'Aging': 'hsl(var(--node-level-3))',
  'Expired': 'hsl(var(--destructive))',
};
