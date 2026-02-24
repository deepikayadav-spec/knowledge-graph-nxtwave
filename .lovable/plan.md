

# Fix Student Data Import, Remove Min/Max Table, Fix 100% Mastery Bug

## Problems Identified

1. **Question matching is too strict** -- The CSV has full markdown question content (e.g., "Write a program that reads a number..."), but some DB questions have numbered prefixes ("2. Write a program...") or different formatting. The current 80-char prefix match fails because of these differences. Only 14 out of 62 CSV rows matched.

2. **Min/Max table is obsolete** -- The default view in `TopicScoreTable` still shows "Max" and "Qs" columns from the old `topic_score_ranges` approach. Since we're using percentage-based grading now, this should be replaced with a topic summary that just lists topics and their question counts (no grade boundaries).

3. **100% mastery bug** -- `calculateMastery.ts` increments `maxPoints` only when a question is attempted (line 64: `mastery.maxPoints += 1`). So if a student attempts 14 questions and gets all 14 correct, every KP shows `earned=max=100%`. The denominator should be ALL questions mapped to each KP in the graph, not just attempted ones.

4. **Student not added to class** -- When using the custom CSV format, the student name is auto-generated as "Student {first6chars}" instead of letting the user specify a name. Also, if no class is selected, the student isn't enrolled anywhere and won't appear in the `TopicScoreTable` student selector properly.

## Changes

### 1. Fix question matching (`BulkUploadPanel.tsx`)

Make matching much more lenient:
- Strip leading numbers/bullets from both texts (e.g., "2. Write a program..." becomes "Write a program...")
- Strip all markdown formatting (images, HTML tags, divs, style attributes)
- Use a **contains-based** approach: extract the first meaningful sentence (first 60 chars after cleanup) and check if the DB question contains it, or vice versa
- Add a similarity fallback: try matching by the `question_short_text` column from the CSV against a keyword extracted from the DB question text

### 2. Add student name input to BulkUploadPanel

- Add a text input field for "Student Name" that appears before/during file upload
- When using custom CSV format, use this name instead of the auto-generated one
- If no class exists, auto-create enrollment or at minimum register the student in `class_students` so they show up in the selector

### 3. Fix mastery calculation (`calculateMastery.ts` + `persistMastery.ts`)

After processing attempts, recalculate `maxPoints` for each KP based on ALL questions in the graph that map to that KP (not just attempted ones):
- In `persistMastery.ts`, after `processAttemptsBatch`, iterate through ALL questions in `questionsMap` and for each KP, set `maxPoints = total questions mapped to KP in graph`
- `earnedPoints` remains as the count of correctly answered questions
- This ensures unattempted questions count as 0 (incorrect) in the denominator

### 4. Replace the default TopicScoreTable view

- Remove the "Max" and "Qs" columns and grade boundary expansion from the default (no-student) view
- Replace with a simple topic list showing topic name and total question count
- When a student is selected, show mastery % and grade (already works once the calculation bug is fixed)
- Remove the `topicScoreRanges` prop dependency -- the table can load topics directly from the database or receive them as a simpler structure

### 5. Clean up TopicScoreRange references

- Remove `topicScoreRanges` state and related logic from `KnowledgeGraphApp.tsx`
- The `TopicScoreTable` will fetch topics and question counts directly
- Keep the `topic_score_ranges` DB table for now (no migration needed) but stop using it in the UI

## Files to Modify

- **`src/components/mastery/BulkUploadPanel.tsx`** -- Lenient matching, student name input, fix maxPoints after import
- **`src/lib/mastery/calculateMastery.ts`** -- No change needed (the per-attempt logic is fine)
- **`src/lib/mastery/persistMastery.ts`** -- After processing attempts, recalculate maxPoints using all graph questions
- **`src/components/panels/TopicScoreTable.tsx`** -- Remove min/max default view, show simple topic list; remove `topicScoreRanges` prop
- **`src/components/KnowledgeGraphApp.tsx`** -- Remove `topicScoreRanges` state, simplify `TopicScoreTable` usage
- **`src/components/mastery/MasterySidebar.tsx`** -- Remove topicScoreRanges references if present
- **`src/components/mastery/HierarchicalMasteryView.tsx`** -- Remove topicScoreRanges prop if present

