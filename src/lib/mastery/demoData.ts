// Demo mastery data generation for demonstration purposes
import type { KPMastery, RetentionStatus } from '@/types/mastery';

// Generate deterministic pseudo-random number from string seed
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(Math.sin(hash)) % 1;
}

// Generate demo mastery for a single skill
export function generateDemoMastery(
  graphId: string, 
  studentId: string, 
  skillId: string
): KPMastery {
  const seed = `${graphId}-${studentId}-${skillId}`;
  const rand = seededRandom(seed);
  
  // Vary mastery between 20% and 100%
  const rawMastery = 0.2 + rand * 0.8;
  
  // Vary retention status (60% current, 20% aging, 20% expired)
  const retentionRand = seededRandom(seed + '-retention');
  let retentionStatus: RetentionStatus = 'current';
  let retentionFactor = 1.0;
  
  if (retentionRand < 0.2) {
    retentionStatus = 'expired';
    retentionFactor = 0.3 + retentionRand * 0.2;
  } else if (retentionRand < 0.4) {
    retentionStatus = 'aging';
    retentionFactor = 0.5 + retentionRand * 0.3;
  }
  
  const effectiveMastery = rawMastery * retentionFactor;
  
  // Random attempt data
  const maxPoints = 5 + Math.floor(rand * 15);
  const earnedPoints = maxPoints * rawMastery;
  
  return {
    graphId,
    studentId,
    skillId,
    earnedPoints,
    maxPoints,
    rawMastery,
    effectiveMastery,
    retentionFactor,
    retentionStatus,
    stability: 14 + rand * 46,       // 14-60 days (new initial stability = 14)
    retrievalCount: Math.floor(rand * 8),
    lastReviewedAt: new Date(Date.now() - rand * 30 * 24 * 60 * 60 * 1000),
  };
}

// Generate demo mastery for all skills in a graph
export function generateDemoMasteryForGraph(
  graphId: string,
  studentId: string,
  skillIds: string[]
): Map<string, KPMastery> {
  const masteryMap = new Map<string, KPMastery>();
  skillIds.forEach(skillId => {
    masteryMap.set(skillId, generateDemoMastery(graphId, studentId, skillId));
  });
  return masteryMap;
}
