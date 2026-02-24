// Core mastery calculation functions

import { 
  INITIAL_STABILITY 
} from './constants';
import type { 
  KPMastery, 
  StudentAttempt, 
  IndependenceLevel,
  QuestionWithWeights 
} from '@/types/mastery';

/**
 * Create an empty mastery record for a skill
 */
export function createEmptyMastery(
  graphId: string,
  studentId: string,
  skillId: string
): KPMastery {
  return {
    graphId,
    studentId,
    skillId,
    earnedPoints: 0,
    maxPoints: 0,
    rawMastery: 0,
    lastReviewedAt: null,
    stability: INITIAL_STABILITY,
    retrievalCount: 0,
  };
}

/**
 * Process a single attempt and update mastery records
 * 
 * New formula:
 *   contribution = weight × weightageMultiplier × solutionScore × ISQ
 *   earned += contribution
 *   max += weight × weightageMultiplier
 * 
 * @param attempt - The student's attempt record
 * @param question - The question with skill weights
 * @param currentMastery - Map of current mastery records by skill ID
 * @returns Updated mastery map
 */
export function processAttempt(
  attempt: StudentAttempt,
  question: QuestionWithWeights,
  currentMastery: Map<string, KPMastery>
): Map<string, KPMastery> {
  
  // Binary scoring: 1 if correct, 0 if not
  const binaryScore = attempt.isCorrect ? 1 : 0;
  
  // Each KP mapped to this question gets +1 max, +1 earned if correct
  // No fractional weight splitting — every KP counts whole questions
  for (const skillId of question.skills) {
    // Get or create mastery record
    let mastery = currentMastery.get(skillId) || 
      createEmptyMastery(attempt.graphId, attempt.studentId, skillId);
    
    // Each question adds 1 to max for this KP
    mastery.maxPoints += 1;
    
    // Earned = 1 if correct, 0 if not (no independence multiplier)
    mastery.earnedPoints += binaryScore;
    
    // Update review timestamp
    if (binaryScore > 0) {
      mastery.retrievalCount += 1;
      mastery.lastReviewedAt = attempt.attemptedAt;
    }
    
    // Recalculate raw mastery
    mastery.rawMastery = mastery.maxPoints > 0 
      ? mastery.earnedPoints / mastery.maxPoints 
      : 0;
    
    currentMastery.set(skillId, mastery);
  }
  
  return currentMastery;
}

/**
 * Process multiple attempts in batch
 */
export function processAttemptsBatch(
  attempts: StudentAttempt[],
  questionsMap: Map<string, QuestionWithWeights>,
  initialMastery: Map<string, KPMastery>
): Map<string, KPMastery> {
  let mastery = new Map(initialMastery);
  
  // Sort attempts by timestamp to process in order
  const sortedAttempts = [...attempts].sort(
    (a, b) => a.attemptedAt.getTime() - b.attemptedAt.getTime()
  );
  
  for (const attempt of sortedAttempts) {
    const question = questionsMap.get(attempt.questionId);
    if (!question) continue;
    
    mastery = processAttempt(attempt, question, mastery);
  }
  
  return mastery;
}

/**
 * Compute effective mastery with retention decay for all records
 */
export function computeEffectiveMastery(
  masteryRecords: KPMastery[]
): KPMastery[] {
  // No retention decay — effective mastery = raw mastery
  return masteryRecords.map(mastery => ({
    ...mastery,
    effectiveMastery: mastery.rawMastery,
    retentionFactor: 1.0,
    retentionStatus: 'current' as const,
  }));
}

/**
 * Calculate overall mastery (weighted average across all KPs)
 */
export function calculateOverallMastery(
  masteryRecords: KPMastery[]
): number {
  if (masteryRecords.length === 0) return 0;
  
  const totalEffective = masteryRecords.reduce(
    (sum, m) => sum + (m.effectiveMastery ?? m.rawMastery),
    0
  );
  
  return totalEffective / masteryRecords.length;
}

/**
 * Get KPs that need review (aging or expired)
 */
export function getKPsNeedingReview(
  masteryRecords: KPMastery[]
): KPMastery[] {
  return masteryRecords.filter(
    m => m.retentionStatus === 'aging' || m.retentionStatus === 'expired'
  );
}

/**
 * Calculate points earned for a single answer (simplified: binary × weight)
 */
export function calculatePointsForAnswer(
  weight: number,
  solutionScore: number,
  _independenceLevel: IndependenceLevel
): number {
  return weight * solutionScore;
}
