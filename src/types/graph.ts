// Knowledge Point metadata - describes atomic cognitive capability
export interface KnowledgePoint {
  atomicityCheck: string;       // Self-check that this is truly atomic
  assessmentExample: string;    // Sample question testing ONLY this skill
  targetAssessmentLevel: 1 | 2 | 3 | 4; // What level we TEACH to (Recognition to Direct Application)
  appearsInQuestions: string[]; // Which input questions use this
}

// CME - now separates measured from AI-generated data
export interface CME {
  measured: boolean;            // false until real student data exists
  highestConceptLevel: number;  // 0 until measured, 1-7 when measured
  levelLabels: string[];
  independence: 'Unknown' | 'Independent' | 'Lightly Scaffolded' | 'Heavily Assisted';
  retention: 'Unknown' | 'Current' | 'Aging' | 'Expired';
  evidenceByLevel: Record<number, number>; // level -> percentage (empty if unmeasured)
}

// LE - distinguishes AI estimates from measured student data
export interface LE {
  estimated: boolean;           // true = AI estimate, false = measured
  estimatedMinutes: number;     // AI-generated estimate
  measuredMinutes?: number;     // From actual student data (optional)
  // Detailed breakdown (for measured data)
  passiveTime?: number;
  activeTime?: number;
  weightedEngagementTime?: number;
  persistenceSignals?: {
    reattemptAfterWrong: boolean;
    returnAfterExit: boolean;
  };
  persistenceFactor?: number;
  finalLE?: number;
}

export type SkillTier = 'foundational' | 'core' | 'applied' | 'advanced';

export interface GraphNode {
  id: string;
  name: string;
  level: number;                // Computed from prerequisites
  description?: string;
  knowledgePoint: KnowledgePoint;
  cme: CME;
  le: LE;
  // New skill taxonomy fields
  tier?: SkillTier;
  transferableContexts?: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
  reason: string;
  relationshipType?: 'requires' | 'builds_on' | 'extends';
}

// Enhanced question path with validation
export interface QuestionPath {
  requiredNodes: string[];
  executionOrder: string[];
  validationStatus: 'valid' | 'missing_prereqs' | 'invalid_order';
  validationErrors?: string[];
}

export interface CourseView {
  nodes: Array<{
    id: string;
    inCourse: boolean;
  }>;
}

// IPA step for transparent analysis
export interface IPAStep {
  step: number;
  type: 'RECOGNIZE' | 'RECALL' | 'APPLY' | 'CHECK' | 'BRANCH';
  operation: string;
}

export interface KnowledgeGraph {
  globalNodes: GraphNode[];
  edges: GraphEdge[];
  courses: Record<string, CourseView>;
  questionPaths: Record<string, QuestionPath | string[]>; // Support both formats for backwards compat
  ipaByQuestion?: Record<string, IPAStep[]>; // Raw IPA analysis (optional)
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
  'Unknown': 'hsl(var(--muted))',
  'Independent': 'hsl(var(--node-level-0))',
  'Lightly Scaffolded': 'hsl(var(--node-level-2))',
  'Heavily Assisted': 'hsl(var(--node-level-4))',
};

export const RETENTION_COLORS = {
  'Unknown': 'hsl(var(--muted))',
  'Current': 'hsl(var(--node-level-0))',
  'Aging': 'hsl(var(--node-level-3))',
  'Expired': 'hsl(var(--destructive))',
};
