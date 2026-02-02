// Mastery calculation constants

// Independence multipliers - how much credit for each scaffolding level
export const INDEPENDENCE_MULTIPLIERS = {
  independent: 1.0,
  lightly_scaffolded: 0.7,
  heavily_assisted: 0.4,
} as const;

// Weight distribution for skills in a question
export const PRIMARY_SKILL_WEIGHT = 0.6;
export const REMAINING_WEIGHT = 0.4;

// Wrong answer penalty factor (20% of weight)
export const WRONG_ANSWER_PENALTY = 0.2;

// Retention thresholds (Ebbinghaus curve)
export const RETENTION_THRESHOLDS = {
  current: 0.8,    // >= 80% retention = Current
  aging: 0.5,      // 50-79% = Aging
  // Below 50% = Expired
} as const;

// Initial stability for memory strength (in days)
export const INITIAL_STABILITY = 1.0;

// Stability growth factor per successful retrieval
export const STABILITY_GROWTH_FACTOR = 0.1;

// Mastery level thresholds for visualization
export const MASTERY_THRESHOLDS = {
  mastered: 0.9,    // >= 90% = fully mastered (green glow)
  proficient: 0.7,  // 70-89% = proficient
  developing: 0.4,  // 40-69% = developing
  // Below 40% = needs work
} as const;
