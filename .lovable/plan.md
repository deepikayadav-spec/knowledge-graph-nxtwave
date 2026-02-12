

# Update Mastery Calculation System

## Overview

Replace the current mastery equations with the new formulas from your uploaded documents. This touches 7 files across constants, calculation logic, retention/stability, UI inputs, and persistence.

## What Changes (Summary)

| Area | Current | New |
|------|---------|-----|
| Solution Score | Binary (correct/wrong) | Percentage (0-100%) |
| Wrong Answer Penalty | 20% deduction | No separate penalty (score of 0% just contributes 0) |
| Independence Levels | 3 levels (1.0, 0.7, 0.4) | 4 levels -- adds Solution-Driven (0.2) |
| Contribution Formula | `weight x correctMultiplier - penalty` | `weight x solutionScore x ISQ` |
| Initial Stability | 1 day | 14 days |
| Stability Growth | `S x (1 + 0.1 x ln(n+1))` linear-log | `S x (1.2 x S^-0.25 x e^(1.5xR) + 0.1)` multiplicative |
| Aggregation | earnedPoints / maxPoints (raw ratio) | Uses effectiveMastery (with decay) weighted by maxPoints |

---

## Detailed Changes by File

### 1. Database Migration

Add a `solution_score` column to `student_attempts` table:

```sql
ALTER TABLE student_attempts 
  ADD COLUMN solution_score numeric NOT NULL DEFAULT 1.0;
```

This stores the percentage score (0.0 to 1.0) per attempt. Default 1.0 preserves backward compatibility with existing binary data.

Also add `solution_score` to the `BulkUploadRow` CSV expected columns.

---

### 2. `src/types/mastery.ts`

- Add `'solution_driven'` to the `IndependenceLevel` type
- Add `solutionScore: number` (0-1) to `StudentAttempt`
- Add `solutionScore` to `BulkUploadRow`

---

### 3. `src/lib/mastery/constants.ts`

- Add `solution_driven: 0.2` to `INDEPENDENCE_MULTIPLIERS`
- Remove `WRONG_ANSWER_PENALTY` (no longer used)
- Change `INITIAL_STABILITY` from `1.0` to `14.0`
- Add new stability curve parameters:
  ```
  STABILITY_A = 1.2
  STABILITY_B = 0.25
  STABILITY_C = 1.5
  STABILITY_D = 0.1
  ```

---

### 4. `src/lib/mastery/retentionDecay.ts`

Replace `updateStability` function with the new multiplicative formula:

```
S_new = S_old x (a x S^(-b) x e^(c x R) + d)
```

Where R = retention at moment of review (calculated from time since last review and current stability). The `retrievalCount` parameter is no longer used for stability -- instead the retention at review time drives growth.

---

### 5. `src/lib/mastery/calculateMastery.ts`

**`processAttempt` function** -- rewrite the per-skill loop:

Current logic:
```
if correct:  earned += weight x independenceMultiplier
if wrong:    earned -= weight x WRONG_ANSWER_PENALTY
```

New logic:
```
contribution = weight x weightageMultiplier x solutionScore x ISQ
earned += contribution
max += weight x weightageMultiplier
```

No branching on correct/wrong -- the `solutionScore` (0 to 1) handles it naturally. A score of 0% contributes 0 points.

For stability update: only update when solutionScore > 0, and pass current retention (computed from time since last review) into the new `updateStability` function.

---

### 6. `src/lib/mastery/aggregateMastery.ts`

Update `calculateSubtopicMastery` to use **effectiveMastery** (with decay) for the weighted average instead of raw earnedPoints/maxPoints:

```
subtopicMastery = Sum(KP.effectiveMastery x KP.maxPoints) / Sum(KP.maxPoints)
```

Same change for `calculateTopicMastery` and `ungroupedMastery`.

---

### 7. `src/components/mastery/AttemptLoggerPanel.tsx`

- Replace the binary Correct/Wrong toggle with a **percentage slider** (0-100%) labeled "Solution Score"
- Add `solution_driven` as a 4th radio option: "Solution-Driven (20% credit)"
- Insert `solution_score` into the `student_attempts` record on submit

---

### 8. `src/components/mastery/BulkUploadPanel.tsx`

- Add `solution_score` to `EXPECTED_COLUMNS`
- Add `solution_driven` / `solution` to `INDEPENDENCE_LEVEL_MAP`
- Parse `solution_score` column as a number (0-100, converted to 0-1)
- Default to 100 if column is missing (backward compat)
- Include in attempt insert and mastery calculation

---

### 9. `src/hooks/useStudentMastery.ts`

- Update `recordAttempt` signature to accept `solutionScore: number` instead of `isCorrect: boolean`
- Pass `solutionScore` through to `processAttempt` and database insert
- Update the `student_attempts` insert to include `solution_score`

---

### 10. `src/lib/mastery/persistMastery.ts`

- Update `calculateAndPersistMastery` to pass `solutionScore` from attempt records
- Ensure the questions map builder includes all difficulty dimension fields for the weightage multiplier

---

### 11. `src/lib/mastery/demoData.ts`

- Update demo data generator to use new initial stability (14 days) and generate realistic `solutionScore`-based mastery values

---

## What Stays Unchanged

- Primary/secondary KP weight split (60/40) -- kept as-is
- Weight calculation logic in `calculateWeights.ts` -- untouched
- Database schema for `student_kp_mastery` -- same columns
- Weightage multiplier rubric (1.0x-3.0x from 4 dimensions) -- untouched
- Graph visualization, node rendering, retention status colors -- untouched
- All variable/column naming conventions

## Order of Implementation

1. Database migration (add `solution_score` column)
2. Type updates (`mastery.ts`)
3. Constants update
4. Retention/stability formula update
5. Core calculation logic update
6. Aggregation logic update
7. Persistence layer update
8. UI updates (AttemptLogger, BulkUpload)
9. Hook update (`useStudentMastery`)
10. Demo data update

