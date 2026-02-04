// Weight calculation for skills in a question

import { PRIMARY_SKILL_WEIGHT, REMAINING_WEIGHT, MAX_PRIMARY_SKILLS } from './constants';

/**
 * Normalize primary skills input to array format
 * - Handles legacy single string
 * - Validates skills exist in question
 * - Caps at MAX_PRIMARY_SKILLS (2)
 */
function normalizePrimarySkills(
  input: string[] | string | null,
  allSkills: string[]
): string[] {
  if (!input) {
    // Default: first skill is primary
    return allSkills.length > 0 ? [allSkills[0]] : [];
  }
  
  // Convert single string to array (for backwards compatibility)
  const candidates = Array.isArray(input) ? input : [input];
  
  // Filter to only valid skills and cap at MAX_PRIMARY_SKILLS
  const valid = candidates
    .filter(s => allSkills.includes(s))
    .slice(0, MAX_PRIMARY_SKILLS);
  
  // Fallback if no valid primaries
  return valid.length > 0 ? valid : (allSkills.length > 0 ? [allSkills[0]] : []);
}

/**
 * Calculate skill weights for a question based on primary/secondary designation
 * - If 1 primary: Primary gets 60%, secondaries split 40%
 * - If 2 primaries: Each primary gets 30%, secondaries split 40%
 */
export function calculateSkillWeights(
  skills: string[],
  primarySkills: string[] | string | null  // Accept array or legacy single value
): Record<string, number> {
  if (skills.length === 0) return {};
  if (skills.length === 1) return { [skills[0]]: 1.0 };
  
  // Normalize to array
  const primaries = normalizePrimarySkills(primarySkills, skills);
  const weights: Record<string, number> = {};
  
  // Split primary weight among primaries (60% / count)
  // If 1 primary: 60%, if 2 primaries: 30% each
  const primaryWeightEach = PRIMARY_SKILL_WEIGHT / primaries.length;
  primaries.forEach(skill => {
    weights[skill] = primaryWeightEach;
  });
  
  // Remaining 40% split equally among secondary skills
  const secondarySkills = skills.filter(s => !primaries.includes(s));
  if (secondarySkills.length > 0) {
    const secondaryWeight = REMAINING_WEIGHT / secondarySkills.length;
    secondarySkills.forEach(skill => {
      weights[skill] = secondaryWeight;
    });
  } else if (primaries.length === 2) {
    // No secondaries, 2 primaries split 100% equally
    primaries.forEach(skill => {
      weights[skill] = 0.5;
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
  primarySkills: string[] | string | null,
  aiWeights?: Record<string, number>
): Record<string, number> {
  // If no AI weights, calculate defaults
  if (!aiWeights || Object.keys(aiWeights).length === 0) {
    return calculateSkillWeights(skills, primarySkills);
  }
  
  // Validate AI weights cover all skills
  const allCovered = skills.every(s => s in aiWeights);
  if (!allCovered) {
    // Fall back to defaults if AI weights are incomplete
    return calculateSkillWeights(skills, primarySkills);
  }
  
  // Normalize AI weights to sum to 1.0
  return normalizeWeights(aiWeights);
}
