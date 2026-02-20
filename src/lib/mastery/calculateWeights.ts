// Weight calculation for skills in a question
// Simplified: every skill gets equal weight (1/n)

/**
 * Calculate skill weights for a question - equal distribution
 * Every skill gets weight = 1 / number_of_skills
 */
export function calculateSkillWeights(
  skills: string[]
): Record<string, number> {
  if (skills.length === 0) return {};
  const weight = 1.0 / skills.length;
  const weights: Record<string, number> = {};
  skills.forEach(skill => {
    weights[skill] = weight;
  });
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
 * Uses AI weights if provided and valid, falls back to equal split
 */
export function mergeWeights(
  skills: string[],
  aiWeights?: Record<string, number>
): Record<string, number> {
  // If no AI weights, use equal split
  if (!aiWeights || Object.keys(aiWeights).length === 0) {
    return calculateSkillWeights(skills);
  }
  
  // Validate AI weights cover all skills
  const allCovered = skills.every(s => s in aiWeights);
  if (!allCovered) {
    return calculateSkillWeights(skills);
  }
  
  // Normalize AI weights to sum to 1.0
  return normalizeWeights(aiWeights);
}
