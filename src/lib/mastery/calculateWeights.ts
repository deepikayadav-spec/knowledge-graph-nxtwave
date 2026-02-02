// Weight calculation for skills in a question

import { PRIMARY_SKILL_WEIGHT, REMAINING_WEIGHT } from './constants';

/**
 * Calculate skill weights for a question based on primary/secondary designation
 * Primary skill gets 60%, remaining 40% split equally among secondaries
 */
export function calculateSkillWeights(
  skills: string[],
  primarySkill: string | null
): Record<string, number> {
  if (skills.length === 0) return {};
  if (skills.length === 1) return { [skills[0]]: 1.0 };
  
  const weights: Record<string, number> = {};
  const primary = primarySkill && skills.includes(primarySkill) ? primarySkill : skills[0];
  const otherSkills = skills.filter(s => s !== primary);
  
  // Primary skill gets 60%
  weights[primary] = PRIMARY_SKILL_WEIGHT;
  
  // Remaining 40% split equally among secondary skills
  if (otherSkills.length > 0) {
    const secondaryWeight = REMAINING_WEIGHT / otherSkills.length;
    otherSkills.forEach(skill => {
      weights[skill] = secondaryWeight;
    });
  }
  
  return weights;
}

/**
 * Normalize weights to ensure they sum to 1.0
 */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (total === 0) return weights;
  
  const normalized: Record<string, number> = {};
  for (const [skill, weight] of Object.entries(weights)) {
    normalized[skill] = weight / total;
  }
  return normalized;
}

/**
 * Merge AI-generated weights with defaults
 * Uses AI weights if provided and valid, falls back to calculated defaults
 */
export function mergeWeights(
  skills: string[],
  primarySkill: string | null,
  aiWeights?: Record<string, number>
): Record<string, number> {
  // If no AI weights, calculate defaults
  if (!aiWeights || Object.keys(aiWeights).length === 0) {
    return calculateSkillWeights(skills, primarySkill);
  }
  
  // Validate AI weights cover all skills
  const allCovered = skills.every(s => s in aiWeights);
  if (!allCovered) {
    // Fall back to defaults if AI weights are incomplete
    return calculateSkillWeights(skills, primarySkill);
  }
  
  // Normalize AI weights to sum to 1.0
  return normalizeWeights(aiWeights);
}
