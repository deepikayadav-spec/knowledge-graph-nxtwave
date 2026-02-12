

# Update Mastery Calculation System (with Coding Rubric)

## Overview

Replace the current mastery equations with the new formulas from the uploaded documents, and add a structured coding solution scoring rubric as an input method in the Attempt Logger. This touches ~11 files across constants, calculation logic, retention/stability, UI inputs, and persistence.

## What Changes (Summary)

| Area | Current | New |
|------|---------|-----|
| Solution Score | Binary (correct/wrong) | Percentage (0-100%) via rubric or slider |
| Wrong Answer Penalty | 20% deduction | Removed (score of 0% just contributes 0) |
| Independence Levels | 3 levels (1.0, 0.7, 0.4) | 4 levels -- adds Solution-Driven (0.2) |
| Contribution Formula | `weight x correctMultiplier - penalty` | `weight x weightageMultiplier x solutionScore x ISQ` |
| Initial Stability | 1 day | 14 days |
| Stability Growth | `S x (1 + 0.1 x ln(n+1))` | `S x (1.2 x S^-0.25 x e^(1.5 x R) + 0.1)` |
| Aggregation | earnedPoints / maxPoints (raw ratio) | effectiveMastery weighted by maxPoints |
| Attempt Logger UI | Correct/Wrong toggle | Rubric scorer (4 dimensions) with auto-calculated score |

---

## Coding Solution Scoring Rubric

The Attempt Logger will include a structured rubric with 4 scoring dimensions (total: 10 marks). The Solution Score is computed as `total marks / 10`.

| Dimension | Max Marks | Levels |
|-----------|-----------|--------|
| Programming Abilities | 3 | Excellent (3), Good (2), Basic (1), Poor (0) |
| Analytical Skills | 4 | Excellent (4), Good (3), Basic (2), Attempted (1), Incorrect (0) |
| Optimization Skills | 1 | Efficient (1), Acceptable (0.5), Inefficient (0) |
| Applications Design | 2 | Well-Structured (2), Partially Structured (1), Unstructured (0) |

Teachers select a level for each dimension, and the Solution Score updates automatically. For example: Good (2) + Basic (2) + Acceptable (0.5) + Partially (1) = 5.5/10 = 55%.

---

## Detailed Changes by File

### 1. Database Migration

The `solution_score` column already exists on `student_attempts` (numeric, default 1.0). No schema migration needed.

---

### 2. `src/types/mastery.ts`

- Add `'solution_driven'` to the `IndependenceLevel` type
- Add `solutionScore: number` (0-1) to `StudentAttempt`
- Add `solutionScore` to `BulkUploadRow`

---

### 3. `src/lib/mastery/constants.ts`

- Add `solution_driven: 0.2` to `INDEPENDENCE_MULTIPLIERS`
- Remove `WRONG_ANSWER_PENALTY` constant
- Change `INITIAL_STABILITY` from `1.0` to `14.0`
- Remove `STABILITY_GROWTH_FACTOR`
- Add new stability curve parameters:
  ```
  STABILITY_A = 1.2
  STABILITY_B = 0.25
  STABILITY_C = 1.5
  STABILITY_D = 0.1
  ```
- Add rubric definition constant:
  ```
  CODING_RUBRIC_DIMENSIONS = [
    { name: 'Programming Abilities', maxMarks: 3,
      levels: [{label:'Excellent', marks:3}, {label:'Good', marks:2}, {label:'Basic', marks:1}, {label:'Poor', marks:0}] },
    { name: 'Analytical Skills', maxMarks: 4,
      levels: [{label:'Excellent', marks:4}, {label:'Good', marks:3}, {label:'Basic', marks:2}, {label:'Attempted', marks:1}, {label:'Incorrect', marks:0}] },
    { name: 'Optimization Skills', maxMarks: 1,
      levels: [{label:'Efficient', marks:1}, {label:'Acceptable', marks:0.5}, {label:'Inefficient', marks:0}] },
    { name: 'Applications Design', maxMarks: 2,
      levels: [{label:'Well-Structured', marks:2}, {label:'Partially Structured', marks:1}, {label:'Unstructured', marks:0}] },
  ]
  CODING_RUBRIC_TOTAL = 10
  ```

---

### 4. `src/lib/mastery/retentionDecay.ts`

Replace `updateStability` function with the new multiplicative formula:

```
S_new = S_old x (1.2 x S_old^(-0.25) x e^(1.5 x R) + 0.1)
```

Where R = current retention at the moment of review (computed from days since last review and current stability). The function signature changes from `(currentStability, retrievalCount)` to `(currentStability, lastReviewedAt)`.

Update import to use the new stability constants instead of `STABILITY_GROWTH_FACTOR`.

---

### 5. `src/lib/mastery/calculateMastery.ts`

Rewrite `processAttempt` per-skill loop:

Current:
```
if correct:  earned += scaledWeight x independenceMultiplier
if wrong:    earned -= scaledWeight x WRONG_ANSWER_PENALTY
```

New:
```
contribution = scaledWeight x solutionScore x independenceMultiplier
earned += contribution
max += scaledWeight
```

- No branching on correct/wrong -- solutionScore handles it (0% = no contribution)
- Stability update: only when solutionScore > 0, compute current retention from `mastery.lastReviewedAt` and pass to new `updateStability`
- Remove import of `WRONG_ANSWER_PENALTY`
- Update `calculatePointsForAnswer` helper similarly

---

### 6. `src/lib/mastery/aggregateMastery.ts`

Update `calculateSubtopicMastery` to use effectiveMastery weighted by maxPoints instead of raw earnedPoints/maxPoints ratio:

Current: `mastery = totalEarnedPoints / totalMaxPoints`

New: `mastery = Sum(KP.effectiveMastery x KP.maxPoints) / Sum(KP.maxPoints)`

Same change for `calculateTopicMastery` and ungrouped mastery in `calculateAllGroupMastery`.

---

### 7. `src/components/mastery/AttemptLoggerPanel.tsx`

Major UI update:

- Remove the binary Correct/Wrong `Switch` toggle
- Add a **Coding Solution Rubric** section with 4 dimensions, each showing radio buttons for the available levels
- Show a live-computed "Solution Score" (e.g., "7.5 / 10 = 75%") that updates as teachers select levels
- Default all dimensions to their lowest level (score = 0%)
- Add `solution_driven` as a 4th radio option under Independence Level: "Solution-Driven (20% credit)"
- On submit: compute `solutionScore = totalMarks / 10`, insert into `student_attempts` with `solution_score` field, set `is_correct = solutionScore >= 0.5` for backward compatibility

---

### 8. `src/components/mastery/BulkUploadPanel.tsx`

- Add `solution_score` as an optional column in `EXPECTED_COLUMNS` display text
- Add `solution_driven` / `solution` to `INDEPENDENCE_LEVEL_MAP`
- Parse `solution_score` column as a number (0-100 in CSV, converted to 0-1 internally)
- Default to 100 if column is missing (backward compatibility)
- Include `solution_score` in the attempt insert and pass to mastery calculation
- Update the "Expected columns" help text to mention the optional `solution_score` column

---

### 9. `src/hooks/useStudentMastery.ts`

- Update `recordAttempt` signature: replace `isCorrect: boolean` with `solutionScore: number`
- Create `StudentAttempt` with `solutionScore` field
- Update the `student_attempts` insert to include `solution_score: solutionScore` and derive `is_correct: solutionScore >= 0.5`
- Pass `solutionScore` through to `processAttempt`

---

### 10. `src/lib/mastery/persistMastery.ts`

- Update `calculateAndPersistMastery` to read `solution_score` from attempt records when building `StudentAttempt` objects
- Ensure the questions map builder fetches all difficulty dimension fields (already does via `buildQuestionsMap`)

---

### 11. `src/lib/mastery/demoData.ts`

- Update `generateDemoMastery` to use new initial stability (14 days) instead of `1 + rand * 3`
- Generate stability values in a realistic range (14-60 days)

---

## What Stays Unchanged

- Primary/secondary KP weight split (60/40)
- Weight calculation logic in `calculateWeights.ts`
- Database schema for `student_kp_mastery` (same columns)
- Weightage multiplier rubric (1.0x-3.0x from 4 question difficulty dimensions)
- Graph visualization, node rendering, retention status colors
- Retention thresholds (Current >= 80%, Aging >= 50%, Expired < 50%)

## Technical Notes

- The `is_correct` column in `student_attempts` is kept for backward compatibility. New logic derives it as `solutionScore >= 0.5` but it is not used in mastery calculation anymore.
- The rubric constants are defined in `constants.ts` so they can be reused across the Attempt Logger UI and potentially future bulk upload validation.
- The `retrievalCount` field in `student_kp_mastery` is still incremented (for tracking) but no longer drives stability growth -- retention at review time does.

## Order of Implementation

1. Type updates (`mastery.ts`) -- add solutionScore, solution_driven
2. Constants update -- new stability params, rubric definition, remove penalty
3. Retention/stability formula update (`retentionDecay.ts`)
4. Core calculation logic update (`calculateMastery.ts`)
5. Aggregation logic update (`aggregateMastery.ts`)
6. Persistence layer update (`persistMastery.ts`)
7. UI updates (AttemptLogger with rubric, BulkUpload with solution_score)
8. Hook update (`useStudentMastery.ts`)
9. Demo data update (`demoData.ts`)

