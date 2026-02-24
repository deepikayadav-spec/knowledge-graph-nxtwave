

# Simplified Percentage-Based Mastery with Square-Root Weighted Rollup

## Overview

Build a streamlined mastery calculation and student data upload flow using binary scoring (correct/incorrect), with a square-root weighting scheme to prevent KPs with many questions from dominating the weighted average.

## The Square-Root Weighting Rationale

Without dampening, a KP with 25 questions would have 6x the influence of a KP with 4 questions. Using square roots:

```text
Raw weights:     KP1 = 25,   KP2 = 4
Square-root:     KP1 = 5.0,  KP2 = 2.0   (ratio drops from 6.25x to 2.5x)
```

This ensures KPs with more practice data carry more weight, but not disproportionately so.

## Mastery Formula (All Levels)

```text
KP Level:
  KP mastery = (correctly answered questions) / (total questions mapped to this KP)
  Example: KP1 has 25 questions, student got 20 right -> 80%

Subtopic Level:
  weight_i = sqrt(questionCount_i)  for each KP_i in the subtopic
  Subtopic mastery = Sum(KP_mastery_i * sqrt(questionCount_i)) / Sum(sqrt(questionCount_i))

  Example:
    KP1: mastery=80%, 25 questions -> weight = 5.0
    KP2: mastery=50%, 4 questions  -> weight = 2.0
    Subtopic mastery = (0.80*5 + 0.50*2) / (5+2) = 5.0/7.0 = 71.4%
    (vs. without sqrt: (0.80*25 + 0.50*4) / 29 = 75.9% -- KP1 dominates more)

Topic Level:
  Same approach: weighted average of subtopic masteries,
  where weight = sqrt(total questions across all KPs in that subtopic)

Grade:
  Apply thresholds to the topic percentage:
  A+ >= 90%, A >= 75%, B >= 60%, C >= 45%, D >= 30%, F < 30%
```

## Simplifications for This Iteration

- No independence multiplier (all treated as 1.0)
- No retention decay (effective mastery = raw mastery)
- No fractional weight splitting -- each KP counts questions as whole numbers
- No primary vs secondary KPs -- all skills on a question are equal
- Topic score ranges table remains for reference but grading uses percentage rollup

## Files to Create

### `src/lib/mastery/studentTopicGrades.ts`
New utility with:
- `calculateStudentTopicGrades(studentId, graphId)` -- queries attempts + question-skill-topic mappings, computes per-KP mastery, rolls up to subtopic and topic using sqrt-weighted averages, applies grade thresholds
- Returns: `{ topicId, topicName, masteryPercent, grade, gradeColor, subtopics: [{ subtopicId, subtopicName, masteryPercent, kps: [...] }] }`

## Files to Modify

### `src/lib/mastery/calculateMastery.ts`
- In `processAttempt`: hard-code independence multiplier to `1.0`, skip stability/retention updates
- Keep binary scoring and equal weight distribution as-is

### `src/lib/mastery/persistMastery.ts`
- In `calculateAndPersistMastery`: set `stability = 14.0`, skip retention fields
- `earned_points` = count of correctly answered questions for this KP
- `max_points` = count of total questions mapped to this KP
- `raw_mastery` = earned / max

### `src/lib/mastery/aggregateMastery.ts`
- Change weighted average to use `sqrt(maxPoints)` instead of raw `maxPoints` in:
  - `calculateSubtopicMastery` -- weight each KP by `sqrt(questionCount)`
  - `calculateTopicMastery` -- weight each subtopic by `sqrt(totalQuestions)`
  - `calculateAllGroupMastery` ungrouped section -- same sqrt weighting
- Use `rawMastery` directly (no `effectiveMastery` since no retention decay)

### `src/lib/mastery/gradeScale.ts`
- Add `getGradeForPercent(pct: number): GradeDefinition` -- accepts a 0-1 percentage directly

### `src/components/mastery/BulkUploadPanel.tsx`
- Simplify: hard-code `independence_score: 1.0` for all rows
- After import, trigger simplified mastery calculation
- Show summary with per-topic grades after upload

### `src/components/panels/TopicScoreTable.tsx`
- Add a student selector dropdown
- When a student is selected, show their per-topic mastery percentages and grade badges
- Keep the expandable grade boundaries for reference

## No Database Changes Required

Existing schema supports everything:
- `student_attempts` stores `is_correct`
- `student_kp_mastery` stores `earned_points`, `max_points`, `raw_mastery`
- `questions.skills` maps questions to KPs
- `skills.subtopic_id` and `skill_subtopics.topic_id` provide the hierarchy
- `topic_score_ranges` remains for reference

## Data Flow

```text
CSV Upload --> Parse rows --> Match questions
  --> Insert student_attempts (is_correct, independence=1.0)
  --> For each KP: earned = correct Qs, max = total Qs, mastery = earned/max
  --> Upsert student_kp_mastery
  --> Sqrt-weighted rollup: KP -> Subtopic -> Topic
  --> Apply grade thresholds to topic %
  --> Display in TopicScoreTable with student selector
```

