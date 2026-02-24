// Grade scale definitions and helper functions

export interface GradeDefinition {
  grade: string;
  minPct: number;
  color: string;
}

export interface GradeBoundary {
  grade: string;
  minScore: number;
  color: string;
}

export const GRADE_SCALE: GradeDefinition[] = [
  { grade: 'A+', minPct: 0.90, color: '#22c55e' },
  { grade: 'A',  minPct: 0.75, color: '#4ade80' },
  { grade: 'B',  minPct: 0.60, color: '#3b82f6' },
  { grade: 'C',  minPct: 0.45, color: '#eab308' },
  { grade: 'D',  minPct: 0.30, color: '#f97316' },
  { grade: 'F',  minPct: 0.00, color: '#ef4444' },
];

/** Get the grade for a given score and max score */
export function getGradeForScore(score: number, maxScore: number): GradeDefinition {
  if (maxScore <= 0) return GRADE_SCALE[GRADE_SCALE.length - 1];
  const pct = score / maxScore;
  return getGradeForPercent(pct);
}

/** Get the grade for a 0-1 percentage directly */
export function getGradeForPercent(pct: number): GradeDefinition {
  for (const g of GRADE_SCALE) {
    if (pct >= g.minPct) return g;
  }
  return GRADE_SCALE[GRADE_SCALE.length - 1];
}

/** Get all grade boundaries (min score cutoffs) for a given max score */
export function getGradeBoundaries(maxScore: number): GradeBoundary[] {
  return GRADE_SCALE.map(g => ({
    grade: g.grade,
    minScore: Math.ceil(g.minPct * maxScore),
    color: g.color,
  }));
}
