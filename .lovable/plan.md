

# Map All 51 KPs + Independence Score Calculation + Topic Min/Max + Mastery Equation

## Overview

This plan covers four interconnected changes:

1. **Re-map all 51 KPs** to subtopics/topics by triggering auto-group (already works, just needs to be run)
2. **Update the independence score calculation** to match the PDF rules (solution_viewed, ai_tutor_count, total_submissions based)
3. **Create topic_score_ranges table** and calculate min/max per topic
4. **Update mastery calculation** to use binary scoring (1 if correct, 0 if not) with the new independence score

---

## Part 1: Re-map KPs via Auto-Group

The `auto-group-skills` edge function already handles this correctly -- it clears all existing mappings and re-creates them deterministically using `WEB_SKILL_SUBTOPIC_MAP`. All 48 unmapped KPs + 3 AI KPs will be assigned.

**Action**: Trigger the auto-group function for graph `df547747-1481-44ba-a936-83793fe349e7`. The existing code already persists everything to the database (skill_topics, skill_subtopics, and skills.subtopic_id). No code changes needed.

---

## Part 2: Update Independence Score Calculation

The uploaded PDF defines a new granular independence score system based on three inputs:

1. **solution_viewed** (boolean): Did the student view the full solution before correct submission?
2. **ai_tutor_count** (integer): How many times did the student use the AI tutor?
3. **total_submissions** (integer): How many submissions before the correct one?

The scoring rules:

```text
If solution_viewed = true (Solution-Driven):
  total_submissions 0-1  -> 0.1
  total_submissions 2-4  -> 0.2
  total_submissions 5+   -> 0.3

If solution_viewed = false AND ai_tutor_count = 0 (Independent):
  -> 1.0

If solution_viewed = false AND ai_tutor_count 1-2 (Lightly Scaffolded):
  total_submissions 0-1  -> 0.6
  total_submissions 2-4  -> 0.7
  total_submissions 5+   -> 0.8

If solution_viewed = false AND ai_tutor_count >= 3 (Heavily Scaffolded):
  total_submissions 0-1  -> 0.3
  total_submissions 2-4  -> 0.4
  total_submissions 5+   -> 0.5
```

### Database Changes
Add 3 new columns to `student_attempts`:
- `solution_viewed` (boolean, default false)
- `ai_tutor_count` (integer, default 0)
- `total_submissions` (integer, default 1)
- `independence_score` (numeric, computed and stored)

### Code Changes
- **`src/lib/mastery/constants.ts`**: Add the new `calculateIndependenceScore(solutionViewed, aiTutorCount, totalSubmissions)` function
- **`src/components/mastery/AttemptLoggerPanel.tsx`**: Replace the old 4-radio-button independence level selector with 3 input fields: solution_viewed toggle, ai_tutor_count number input, total_submissions number input. The independence score is auto-calculated and displayed live.
- **`src/components/mastery/BulkUploadPanel.tsx`**: Update CSV parsing to accept new columns (solution_viewed, ai_tutor_count, total_submissions) and compute independence_score
- **`src/lib/mastery/calculateMastery.ts`**: Use `independence_score` from the attempt instead of looking up `INDEPENDENCE_MULTIPLIERS[attempt.independenceLevel]`

---

## Part 3: Mastery Calculation (from PDF)

The mastery formula from the uploaded PDF:

```text
KP Mastery = SUM(|Qi| x Independence_Score_for_Qi)
```

Where:
- `|Qi|` = binary score (1 if all test cases pass, 0 otherwise) -- this is the `is_correct` field
- `Independence_Score_for_Qi` = the computed independence score from Part 2

This replaces the current rubric-based `solution_score` approach. The system will use:
- `is_correct` as the binary score (1 or 0)
- `independence_score` as the multiplier

**Retention** stays the same (Ebbinghaus: R = e^(-t/S) with S = 14 days initial stability). Effective Mastery = Raw Mastery x Retention.

### Code Changes
- **`src/lib/mastery/calculateMastery.ts`**: Update `processAttempt` to use `is_correct * independence_score` instead of `solution_score * INDEPENDENCE_MULTIPLIERS[level]`

---

## Part 4: Topic Score Ranges (Min/Max)

Create a `topic_score_ranges` table and compute min/max per topic.

### Definition
- **Min**: Always 0 (student attempts nothing correctly)
- **Max**: For each topic, count unique questions mapped to skills in that topic. Since scoring is binary (1 per correct question) and max independence = 1.0, **max = count of unique questions in the topic**

### Database Migration
```text
topic_score_ranges
  id              uuid PK
  graph_id        uuid NOT NULL
  topic_id        uuid NOT NULL
  topic_name      text NOT NULL
  min_score       numeric DEFAULT 0
  max_score       numeric DEFAULT 0
  unique_questions integer DEFAULT 0
  updated_at      timestamptz DEFAULT now()
  UNIQUE(graph_id, topic_id)
```

### Code Changes
- **New file `src/lib/mastery/topicScoreRanges.ts`**: Function to calculate and upsert topic score ranges
  - For each topic: find subtopics -> find skills -> find questions containing those skills -> count unique questions
  - `max_score = unique_question_count` (binary scoring, full independence)
  - Upsert into `topic_score_ranges`

- **`src/types/grouping.ts`**: Add `TopicScoreRange` type

- **`src/components/mastery/HierarchicalMasteryView.tsx`**: Display per topic:
  - Score: current earned points
  - Max: from topic_score_ranges
  - Mastery %: Score / Max

- **`src/hooks/useSkillGrouping.ts`**: After auto-group completes, automatically trigger score range calculation

- **`src/components/mastery/MasterySidebar.tsx`**: Add "Recalculate Ranges" button in the Groups tab

---

## Summary of All File Changes

### New files:
- `src/lib/mastery/topicScoreRanges.ts`

### Modified files:
- `src/lib/mastery/constants.ts` (add `calculateIndependenceScore` function)
- `src/lib/mastery/calculateMastery.ts` (use binary scoring + independence_score)
- `src/types/mastery.ts` (add new fields to StudentAttempt)
- `src/types/grouping.ts` (add TopicScoreRange type)
- `src/components/mastery/AttemptLoggerPanel.tsx` (new independence inputs)
- `src/components/mastery/BulkUploadPanel.tsx` (new CSV columns)
- `src/components/mastery/HierarchicalMasteryView.tsx` (show min/max/score)
- `src/components/mastery/MasterySidebar.tsx` (recalculate button, pass score ranges)
- `src/hooks/useSkillGrouping.ts` (trigger score calc after auto-group)

### Database changes:
- Migration: Add columns to `student_attempts` (solution_viewed, ai_tutor_count, total_submissions, independence_score)
- Migration: Create `topic_score_ranges` table
- Data: Trigger auto-group to map all 51 KPs

