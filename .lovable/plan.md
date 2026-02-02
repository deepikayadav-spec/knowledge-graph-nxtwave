

# Fix: Calculate Mastery After Bulk Upload

## Problem

The bulk upload successfully inserts student attempts into `student_attempts`, but never calculates the resulting mastery. The `student_kp_mastery` table remains empty, causing all students to show 0% mastery and appear "at risk."

## Solution

Add a mastery calculation step after bulk upload that:
1. Groups uploaded attempts by student
2. Processes each attempt through the mastery calculation pipeline
3. Upserts computed mastery records to the database

---

## Changes

### File: `src/components/mastery/BulkUploadPanel.tsx`

After inserting attempts (around line 280), add mastery calculation:

```text
Current flow:
  1. Insert attempts to student_attempts ✓
  2. Enroll students in class ✓
  3. Show success toast ✓

New flow:
  1. Insert attempts to student_attempts ✓
  2. Enroll students in class ✓
  3. NEW: Calculate mastery for each student
  4. NEW: Upsert mastery records to student_kp_mastery
  5. Show success toast ✓
```

### Implementation Details

After successful attempt insertion:

1. **Load questions with skills and weights**
   - Fetch all questions for the graph including `skills`, `primary_skill`, and `skill_weights`

2. **Group attempts by student**
   - Organize the uploaded attempts by `student_id`

3. **For each student, calculate mastery**
   - Load existing mastery from `student_kp_mastery` (if any)
   - Process attempts in chronological order using `processAttemptsBatch`
   - This handles the weighted scoring, independence multipliers, and wrong answer penalties

4. **Upsert mastery records**
   - For each skill mastery record, upsert to database with conflict on `(graph_id, student_id, skill_id)`

### New Helper Function

Create a reusable function to calculate and persist mastery:

```typescript
// In src/lib/mastery/persistMastery.ts

async function calculateAndPersistMastery(
  graphId: string,
  studentId: string,
  attempts: StudentAttempt[],
  questionsMap: Map<string, QuestionWithWeights>
): Promise<void> {
  // 1. Load existing mastery for this student
  // 2. Process all attempts through processAttemptsBatch
  // 3. Upsert each mastery record to database
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/mastery/persistMastery.ts` | NEW - Create helper to calculate and persist mastery |
| `src/lib/mastery/index.ts` | Export new helper |
| `src/components/mastery/BulkUploadPanel.tsx` | Call mastery calculation after inserting attempts |

---

## Technical Details

### Mastery Calculation After Upload

```typescript
// After inserting attempts successfully...

// 1. Load questions with skills/weights
const { data: questionsData } = await supabase
  .from('questions')
  .select('id, graph_id, question_text, skills, primary_skill, skill_weights')
  .eq('graph_id', graphId);

const questionsMap = new Map(/* build from questionsData */);

// 2. Group attempts by student
const attemptsByStudent = new Map<string, StudentAttempt[]>();
for (const row of validation.rows) {
  const attempt: StudentAttempt = {
    graphId,
    studentId: row.studentId,
    questionId: qMap.get(row.questionText.toLowerCase().trim()),
    isCorrect: row.isCorrect,
    independenceLevel: row.independenceLevel,
    attemptedAt: row.attemptedAt,
  };
  // Group by student...
}

// 3. Calculate and persist mastery for each student
for (const [studentId, studentAttempts] of attemptsByStudent) {
  await calculateAndPersistMastery(graphId, studentId, studentAttempts, questionsMap);
}
```

### Database Upsert

The upsert uses the unique constraint on `(graph_id, student_id, skill_id)`:

```typescript
await supabase
  .from('student_kp_mastery')
  .upsert({
    graph_id: graphId,
    student_id: studentId,
    skill_id: skillId,
    earned_points: mastery.earnedPoints,
    max_points: mastery.maxPoints,
    raw_mastery: mastery.rawMastery,
    last_reviewed_at: mastery.lastReviewedAt?.toISOString(),
    stability: mastery.stability,
    retrieval_count: mastery.retrievalCount,
  }, {
    onConflict: 'graph_id,student_id,skill_id',
  });
```

---

## Expected Outcome

After this fix:

| Student | Expected Mastery | Reason |
|---------|------------------|--------|
| STU001 (Alice) | ~85-95% | 4 correct, mostly independent |
| STU002 (Bob) | ~40-50% | 1 wrong, 1 heavily assisted |
| STU003 (Carol) | ~90-100% | 4 correct, all independent |
| STU004 (David) | ~0-20% | 2 wrong answers = at risk |
| STU005 (Emma) | Lower effective | Aged retention due to old timestamp |

---

## Summary

This fix ensures that after bulk upload:
- Raw attempts are stored (already working)
- Mastery is calculated using the existing scoring logic
- Mastery is persisted to database for analytics
- Class analytics will show accurate at-risk students and weak spots

