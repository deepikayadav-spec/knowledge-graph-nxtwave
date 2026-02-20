// Mastery calculation constants

// Independence multipliers - how much credit for each scaffolding level
export const INDEPENDENCE_MULTIPLIERS = {
  independent: 1.0,
  lightly_scaffolded: 0.7,
  heavily_assisted: 0.4,
  solution_driven: 0.2,
} as const;


// Retention thresholds (Ebbinghaus curve)
export const RETENTION_THRESHOLDS = {
  current: 0.8,    // >= 80% retention = Current
  aging: 0.5,      // 50-79% = Aging
  // Below 50% = Expired
} as const;

// Initial stability for memory strength (in days)
export const INITIAL_STABILITY = 14.0;

// Stability curve parameters (multiplicative formula)
// S_new = S_old × (A × S_old^(-B) × e^(C × R) + D)
export const STABILITY_A = 1.2;
export const STABILITY_B = 0.25;
export const STABILITY_C = 1.5;
export const STABILITY_D = 0.1;

// Mastery level thresholds for visualization
export const MASTERY_THRESHOLDS = {
  mastered: 0.9,    // >= 90% = fully mastered (green glow)
  proficient: 0.7,  // 70-89% = proficient
  developing: 0.4,  // 40-69% = developing
  // Below 40% = needs work
} as const;

// Coding Solution Scoring Rubric
export interface RubricLevel {
  label: string;
  marks: number;
}

export interface RubricDimension {
  name: string;
  maxMarks: number;
  levels: RubricLevel[];
}

export const CODING_RUBRIC_DIMENSIONS: RubricDimension[] = [
  {
    name: 'Programming Abilities',
    maxMarks: 3,
    levels: [
      { label: 'Excellent', marks: 3 },
      { label: 'Good', marks: 2 },
      { label: 'Basic', marks: 1 },
      { label: 'Poor', marks: 0 },
    ],
  },
  {
    name: 'Analytical Skills',
    maxMarks: 4,
    levels: [
      { label: 'Excellent', marks: 4 },
      { label: 'Good', marks: 3 },
      { label: 'Basic', marks: 2 },
      { label: 'Attempted', marks: 1 },
      { label: 'Incorrect', marks: 0 },
    ],
  },
  {
    name: 'Optimization Skills',
    maxMarks: 1,
    levels: [
      { label: 'Efficient', marks: 1 },
      { label: 'Acceptable', marks: 0.5 },
      { label: 'Inefficient', marks: 0 },
    ],
  },
  {
    name: 'Applications Design',
    maxMarks: 2,
    levels: [
      { label: 'Well-Structured', marks: 2 },
      { label: 'Partially Structured', marks: 1 },
      { label: 'Unstructured', marks: 0 },
    ],
  },
];

export const CODING_RUBRIC_TOTAL = 10;

/**
 * Calculate independence score based on granular inputs.
 * 
 * Rules:
 * - Solution viewed → Solution-Driven (0.1-0.3)
 * - Not viewed, no AI tutor → Independent (1.0)
 * - Not viewed, 1-2 AI tutor uses → Lightly Scaffolded (0.6-0.8)
 * - Not viewed, 3+ AI tutor uses → Heavily Scaffolded (0.3-0.5)
 */
export function calculateIndependenceScore(
  solutionViewed: boolean,
  aiTutorCount: number,
  totalSubmissions: number
): number {
  if (solutionViewed) {
    // Solution-Driven
    if (totalSubmissions <= 1) return 0.1;
    if (totalSubmissions <= 4) return 0.2;
    return 0.3;
  }

  if (aiTutorCount === 0) {
    // Independent
    return 1.0;
  }

  if (aiTutorCount <= 2) {
    // Lightly Scaffolded
    if (totalSubmissions <= 1) return 0.6;
    if (totalSubmissions <= 4) return 0.7;
    return 0.8;
  }

  // Heavily Scaffolded (ai_tutor_count >= 3)
  if (totalSubmissions <= 1) return 0.3;
  if (totalSubmissions <= 4) return 0.4;
  return 0.5;
}
