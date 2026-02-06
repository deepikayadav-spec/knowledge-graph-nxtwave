

# Question Weightage Multiplier System

## Overview

Implement a **difficulty-based weightage multiplier** for questions based on your rubric document. This will scale the impact of questions on KP mastery calculations - harder questions contribute more to a student's mastery score.

## Rubric Summary

Your rubric has 4 dimensions, each scored with points:

| Dimension | Description | Points Range |
|-----------|-------------|--------------|
| **Cognitive Complexity** | Bloom's taxonomy level | 1-4 |
| **Task Structure** | How well-defined the problem is | 1-3 |
| **Algorithmic Demands** | Efficiency requirements | 1-3 |
| **Scope & Integration** | Single concept vs system | 1-3 |

**Total Points Range:** 4-13

**Multiplier Mapping:**

| Raw Points | Difficulty | Multiplier |
|------------|------------|------------|
| 4-6 | Basic/Novice | 1.0x |
| 7-9 | Intermediate | 1.5x |
| 10-11 | Advanced | 2.0x |
| 12-13 | Expert | 3.0x |

## How Weightage Affects Mastery

Currently, when a student answers a question:
```
For each KP in question:
  maxPoints += KP_weight           // e.g., 0.3 for a primary
  earnedPoints += KP_weight * independence_multiplier  // if correct
```

With weightage:
```
For each KP in question:
  maxPoints += KP_weight * weightage_multiplier
  earnedPoints += KP_weight * weightage_multiplier * independence_multiplier
```

**Example:**
- Q1 (Basic, 1.0x): Primary KP weight = 0.6 -> contributes 0.6 max points
- Q2 (Expert, 3.0x): Primary KP weight = 0.6 -> contributes 1.8 max points

This means:
- Passing an Expert question proves 3x more mastery than a Basic one
- Failing an Expert question has 3x more impact on the mastery deficit

## Implementation Plan

### 1. Database Migration

Add columns to the `questions` table:

```sql
ALTER TABLE questions
ADD COLUMN cognitive_complexity INTEGER CHECK (cognitive_complexity BETWEEN 1 AND 4),
ADD COLUMN task_structure INTEGER CHECK (task_structure BETWEEN 1 AND 3),
ADD COLUMN algorithmic_demands INTEGER CHECK (algorithmic_demands BETWEEN 1 AND 3),
ADD COLUMN scope_integration INTEGER CHECK (scope_integration BETWEEN 1 AND 3),
ADD COLUMN weightage_multiplier NUMERIC DEFAULT 1.0;
```

### 2. New Edge Function: `analyze-difficulty`

Create a new edge function that uses AI to analyze question difficulty:

**Input:**
```json
{
  "questions": [
    { "id": "uuid", "questionText": "Write a function..." }
  ]
}
```

**Output:**
```json
{
  "question_id": {
    "cognitiveComplexity": 3,
    "taskStructure": 2,
    "algorithmicDemands": 2,
    "scopeIntegration": 2,
    "rawPoints": 9,
    "weightageMultiplier": 1.5
  }
}
```

The edge function will include your rubric criteria in the AI prompt to ensure consistent scoring.

### 3. New Hook: `useRegenerateDifficulty`

Similar to `useRegenerateWeights`, this hook will:
1. Load all questions for a graph
2. Send them in batches to the `analyze-difficulty` edge function
3. Update the database with the 4 dimension scores + computed multiplier
4. Show progress (loading -> analyzing -> updating -> complete)

### 4. Update Mastery Calculation

Modify `src/lib/mastery/calculateMastery.ts`:

```typescript
// In processAttempt function
const weightageMultiplier = question.weightageMultiplier || 1.0;

for (const [skillId, weight] of Object.entries(weights)) {
  // Apply weightage to both max and earned
  const scaledWeight = weight * weightageMultiplier;
  
  mastery.maxPoints += scaledWeight;  // Was: weight
  
  if (attempt.isCorrect) {
    mastery.earnedPoints += scaledWeight * independenceMultiplier;
    // ...
  } else {
    mastery.earnedPoints -= scaledWeight * WRONG_ANSWER_PENALTY;
    // ...
  }
}
```

### 5. Update Types

Extend `QuestionWithWeights` in `src/types/mastery.ts`:

```typescript
export interface QuestionWithWeights {
  id: string;
  graphId: string;
  questionText: string;
  skills: string[];
  primarySkills: string[];
  skillWeights: Record<string, number>;
  // New fields
  cognitiveComplexity?: number;
  taskStructure?: number;
  algorithmicDemands?: number;
  scopeIntegration?: number;
  weightageMultiplier: number;  // Defaults to 1.0
}
```

### 6. UI Updates

**GraphManagerPanel** - Add "Regenerate Difficulty" button alongside "Regenerate Weights":
- Opens a confirmation dialog explaining what it does
- Shows progress during regeneration
- Triggers refresh after completion

**Optional NodeDetailPanel enhancement** - Show difficulty badge/indicator when viewing a question's details.

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/migrations/xxx_add_question_difficulty.sql` | Add 5 new columns |
| `supabase/functions/analyze-difficulty/index.ts` | **NEW** - AI difficulty analyzer |
| `supabase/config.toml` | Register new edge function |
| `src/hooks/useRegenerateDifficulty.ts` | **NEW** - Hook for regeneration UI |
| `src/types/mastery.ts` | Add difficulty fields to `QuestionWithWeights` |
| `src/lib/mastery/calculateMastery.ts` | Apply weightage multiplier |
| `src/lib/mastery/persistMastery.ts` | Include new fields in questions map |
| `src/components/panels/GraphManagerPanel.tsx` | Add "Regenerate Difficulty" button |

## Data Flow Diagram

```text
+------------------+       +----------------------+       +------------------+
| GraphManagerPanel|       | analyze-difficulty   |       | questions table  |
| [Regen Difficulty]------>| Edge Function        |------>| cognitive_...    |
+------------------+       | (AI Analysis)        |       | task_...         |
                           +----------------------+       | algorithmic_...  |
                                                          | scope_...        |
                                                          | weightage_mult.  |
                                                          +--------+---------+
                                                                   |
                                                                   v
+------------------+       +----------------------+       +------------------+
| Student Attempt  |------>| calculateMastery.ts  |------>| student_kp_mastery|
| (CSV Upload)     |       | scaledWeight = weight|       | earnedPoints     |
|                  |       |   * weightageMultiplier|     | maxPoints        |
+------------------+       +----------------------+       +------------------+
```

## Rollout Strategy

1. **Phase 1**: Database migration + edge function + regeneration hook
2. **Phase 2**: UI button in GraphManagerPanel
3. **Phase 3**: Run "Regenerate Difficulty" on Programming Foundations graph
4. **Phase 4**: Verify mastery calculations now use weightage

## Technical Notes

- Default `weightage_multiplier = 1.0` ensures backward compatibility
- Existing mastery records don't need recalculation - multiplier only applies to new attempts
- To recalculate existing mastery with new multipliers, you would need to:
  1. Clear `student_kp_mastery` for the graph
  2. Re-process all attempts from `student_attempts`
- The 4 dimension scores are stored for future analytics (e.g., "students struggle with high-algorithmic-demand questions")

