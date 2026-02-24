

# Topic Grade System - 6 Grades (A+ through F), Percentage-Based

## Pedagogical Design

Grade boundaries based on percentage of max score per topic, aligned with mastery-based learning thresholds:

| Grade | % Range | Meaning |
|-------|---------|---------|
| A+ | 90-100% | Exceptional mastery, near-complete coverage |
| A | 75-89% | Strong mastery, comfortable with most concepts |
| B | 60-74% | Proficient, solid understanding with some gaps |
| C | 45-59% | Developing, foundational understanding present |
| D | 30-44% | Below expectations, significant gaps |
| F | 0-29% | Insufficient, needs major intervention |

These thresholds are inspired by criterion-referenced grading (not norm-referenced), meaning they measure absolute mastery against the curriculum rather than ranking students against each other.

**Example with current data:**
- JS (max 157): A+ = 142+, A = 118-141, B = 95-117, C = 71-94, D = 48-70, F = 0-47
- HTML (max 110): A+ = 99+, A = 83-98, B = 66-82, C = 50-65, D = 33-49, F = 0-32

## Implementation

### 1. Add grade constants
Create `src/lib/mastery/gradeScale.ts` with:
- Grade definitions (label, color, min percentage)
- A function `getGradeForScore(score, maxScore)` that returns the grade
- A function `getGradeBoundaries(maxScore)` that returns all cutoff scores for a topic

### 2. Update TopicScoreRange type
Add a `grades` computed field to `TopicScoreRange` in `src/types/grouping.ts` (computed client-side, not stored in DB since they derive from max_score).

### 3. Update TopicScoreTable UI
Modify `src/components/panels/TopicScoreTable.tsx` to:
- Add a "Grade" column header
- For each topic row, show the grade boundaries as a compact breakdown (e.g., "A+: 142 | A: 118 | B: 95 | ...")
- Or alternatively, expand each topic into a sub-table showing grade cutoffs
- Use color-coded badges for each grade level

### 4. No database changes needed
Grades are purely computed from `max_score` using fixed percentage thresholds -- no new tables or columns required.

## Technical Details

**Grade scale definition:**
```typescript
const GRADE_SCALE = [
  { grade: 'A+', minPct: 0.90, color: '#22c55e' },
  { grade: 'A',  minPct: 0.75, color: '#4ade80' },
  { grade: 'B',  minPct: 0.60, color: '#3b82f6' },
  { grade: 'C',  minPct: 0.45, color: '#eab308' },
  { grade: 'D',  minPct: 0.30, color: '#f97316' },
  { grade: 'F',  minPct: 0.00, color: '#ef4444' },
];
```

**Files to create:**
- `src/lib/mastery/gradeScale.ts` -- grade definitions and helper functions

**Files to modify:**
- `src/components/panels/TopicScoreTable.tsx` -- add grade boundaries display per topic

