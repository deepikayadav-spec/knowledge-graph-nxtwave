// Ebbinghaus forgetting curve implementation

import { 
  INITIAL_STABILITY, 
  STABILITY_A,
  STABILITY_B,
  STABILITY_C,
  STABILITY_D,
  RETENTION_THRESHOLDS 
} from './constants';
import type { RetentionStatus } from '@/types/mastery';

/**
 * Calculate retention using Ebbinghaus forgetting curve
 * R(t) = e^(-t/S)
 * 
 * @param lastReviewedAt - Date of last successful attempt
 * @param stability - Memory strength (grows with successful recalls)
 * @returns Retention factor between 0 and 1
 */
export function calculateRetention(
  lastReviewedAt: Date | null,
  stability: number
): number {
  // If never reviewed, assume full retention (no decay yet)
  if (!lastReviewedAt) return 1.0;
  
  const now = new Date();
  const daysSince = (now.getTime() - lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Ensure stability is at least the initial value
  const effectiveStability = Math.max(stability, INITIAL_STABILITY);
  
  // R(t) = e^(-t/S)
  return Math.exp(-daysSince / effectiveStability);
}

/**
 * Update stability after a successful retrieval using multiplicative formula
 * S_new = S_old × (A × S_old^(-B) × e^(C × R) + D)
 * 
 * Where R = retention at the moment of review (computed from time since last review)
 * 
 * @param currentStability - Current memory strength
 * @param lastReviewedAt - Date of last review (to compute retention at review time)
 * @returns New stability value
 */
export function updateStability(
  currentStability: number,
  lastReviewedAt: Date | null
): number {
  // Compute retention at the moment of this review
  const R = calculateRetention(lastReviewedAt, currentStability);
  
  // S_new = S_old × (A × S_old^(-B) × e^(C × R) + D)
  const multiplier = STABILITY_A * Math.pow(currentStability, -STABILITY_B) * Math.exp(STABILITY_C * R) + STABILITY_D;
  return currentStability * multiplier;
}

/**
 * Get retention status based on retention factor
 */
export function getRetentionStatus(retention: number): RetentionStatus {
  if (retention >= RETENTION_THRESHOLDS.current) return 'current';
  if (retention >= RETENTION_THRESHOLDS.aging) return 'aging';
  return 'expired';
}

/**
 * Calculate days until knowledge "expires" (drops below aging threshold)
 * 
 * @param stability - Current memory strength
 * @param currentRetention - Current retention factor
 * @returns Days until expiry, or null if already expired
 */
export function daysUntilExpiry(
  stability: number,
  currentRetention: number
): number | null {
  if (currentRetention < RETENTION_THRESHOLDS.aging) {
    return null; // Already expired
  }
  
  // Solve for t when R(t) = threshold
  // threshold = e^(-t/S)
  // ln(threshold) = -t/S
  // t = -S * ln(threshold)
  const daysToAging = -stability * Math.log(RETENTION_THRESHOLDS.aging);
  const daysSince = 0;
  
  return Math.max(0, daysToAging - daysSince);
}

/**
 * Calculate effective mastery (raw mastery × retention)
 */
export function calculateEffectiveMastery(
  rawMastery: number,
  lastReviewedAt: Date | null,
  stability: number
): { effectiveMastery: number; retentionFactor: number; retentionStatus: RetentionStatus } {
  const retentionFactor = calculateRetention(lastReviewedAt, stability);
  const effectiveMastery = rawMastery * retentionFactor;
  const retentionStatus = getRetentionStatus(retentionFactor);
  
  return { effectiveMastery, retentionFactor, retentionStatus };
}
