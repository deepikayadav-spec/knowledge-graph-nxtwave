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

// Labels for prerequisite-computed levels (used for graph layout)
export const COMPUTED_LEVEL_LABELS = [
  'Foundational',
  'Building Blocks',
  'Core Skills',
  'Applied Skills',
  'Advanced',
  'Expert',
  'Mastery',
];

export type NodeType = 'root' | 'intermediate' | 'leaf';

export const NODE_TYPE_COLORS = {
  root: 'hsl(152, 69%, 41%)',        // Green - Foundational
  intermediate: 'hsl(262, 83%, 58%)', // Purple - Middle
  leaf: 'hsl(35, 92%, 53%)',          // Orange - Advanced
};

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
