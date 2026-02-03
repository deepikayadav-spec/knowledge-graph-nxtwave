
# Demo Mastery Data for Demonstration

## Overview

This plan adds demo/dummy mastery values for students to enable demonstration of the mastery visualization features without requiring real attempt data in the database. When a student is selected but has no recorded attempts, the system will generate realistic-looking dummy mastery data for all skills in the graph.

---

## Current Behavior

When a student is selected:
1. `useStudentMastery` fetches from `student_kp_mastery` table
2. If no records exist, the mastery Map is empty
3. Graph nodes show no mastery indicators (no data to display)

---

## Proposed Behavior

When a student is selected:
1. `useStudentMastery` fetches from database as usual
2. If no records exist OR only partial records, generate demo data for missing skills
3. Demo data uses deterministic randomization based on `skillId + studentId` for consistency
4. Each skill gets varied mastery levels, retention statuses, and attempt counts
5. Graph nodes display the demo mastery data with full visual indicators

---

## Implementation

### Modify: `src/hooks/useStudentMastery.ts`

Add a new helper function and integrate demo data generation:

```typescript
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

// Generate demo mastery for a skill
function generateDemoMastery(
  graphId: string, 
  studentId: string, 
  skillId: string
): KPMastery {
  const seed = `${graphId}-${studentId}-${skillId}`;
  const rand = seededRandom(seed);
  
  // Vary mastery between 20% and 100%
  const rawMastery = 0.2 + rand * 0.8;
  
  // Vary retention status
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
    stability: 1 + rand * 3,
    retrievalCount: Math.floor(rand * 8),
    lastReviewedAt: new Date(Date.now() - rand * 30 * 24 * 60 * 60 * 1000),
  };
}
```

### Modify: `loadMastery` function

After loading real data, fill in demo data for any skills without mastery records:

```typescript
// After loading real mastery data...

// NEW: If mastery map is empty or incomplete, generate demo data
// This requires knowing all skill IDs in the graph
// We'll add a prop for skill IDs or fetch them

// Generate demo data for skills without real mastery records
const allSkillIds = await fetchGraphSkillIds(graphId);
allSkillIds.forEach(skillId => {
  if (!masteryMap.has(skillId)) {
    const demoMastery = generateDemoMastery(graphId, studentId, skillId);
    masteryMap.set(skillId, demoMastery);
  }
});
```

### Option: Always Generate Demo Data (Simpler Approach)

For pure demonstration purposes, we can generate demo data without database calls:

```typescript
// Simplified: Generate demo data for all skills in the graph
// This is faster and ensures consistent demo experience
const generateDemoMasteryForGraph = (
  graphId: string,
  studentId: string,
  skillIds: string[]
): Map<string, KPMastery> => {
  const masteryMap = new Map<string, KPMastery>();
  skillIds.forEach(skillId => {
    masteryMap.set(skillId, generateDemoMastery(graphId, studentId, skillId));
  });
  return masteryMap;
};
```

---

## Updated Hook Interface

Add `skillIds` parameter so the hook knows which skills exist:

```typescript
interface UseStudentMasteryOptions {
  graphId: string;
  studentId: string;
  skillIds?: string[];  // NEW: For demo data generation
  autoLoad?: boolean;
  useDemoData?: boolean;  // NEW: Force demo data mode
}
```

---

## Integration in KnowledgeGraphApp

Pass skill IDs to the hook:

```typescript
// In KnowledgeGraphApp
const skillIds = useMemo(
  () => graph?.globalNodes.map(n => n.id) || [],
  [graph?.globalNodes]
);

const studentMasteryHook = useStudentMastery({
  graphId: currentGraphId || '',
  studentId: selectedStudentId || '',
  skillIds,  // Pass skill IDs
  autoLoad: !!currentGraphId && !!selectedStudentId,
  useDemoData: true,  // Enable demo mode for now
});
```

---

## Demo Data Characteristics

To make the demo realistic and educational:

| Characteristic | Range | Distribution |
|----------------|-------|--------------|
| Raw Mastery | 20% - 100% | Varied per skill |
| Retention Status | current/aging/expired | 60% current, 20% aging, 20% expired |
| Effective Mastery | 6% - 100% | Raw × Retention Factor |
| Retrieval Count | 0-8 | Varied |
| Max Points | 5-20 | Varied |
| Last Reviewed | 0-30 days ago | Varied |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useStudentMastery.ts` | Add demo data generation functions, modify loadMastery to use demo data |
| `src/components/KnowledgeGraphApp.tsx` | Pass skillIds to the hook |

---

## Summary

This implementation:
1. Generates realistic demo mastery data based on deterministic seeding
2. Each student+skill combination gets consistent but varied values
3. Demonstrates all mastery visualization features (colors, opacity, retention icons)
4. Requires no database changes
5. Can be toggled off when real data collection begins
