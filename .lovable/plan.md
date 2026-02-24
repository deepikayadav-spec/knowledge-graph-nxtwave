

# Import Student Performance Data from Custom CSV

## What We Need To Do

Parse the uploaded CSV (which has a different format than the existing bulk upload), match its 62 questions to the graph's questions, insert attempts, and calculate mastery. Unattempted questions automatically count as incorrect because the mastery formula already uses "total questions mapped to KP" as the denominator.

## CSV Format Analysis

The uploaded CSV has these relevant columns:
- `user_id` -- student identifier
- `question_content` -- full multiline markdown text (matches `question_text` in the database)
- `question_short_text` -- shorter label (backup for matching)
- `best_score_attempt_evaluation_result` -- CORRECT / PARTIALLY_CORRECT / INCORRECT
- `first_correct_attempt_submission_datetime` -- timestamp for the attempt

Binary scoring rule: CORRECT = 1, everything else (PARTIALLY_CORRECT, INCORRECT, empty) = 0

## Why Unattempted Questions Are Already Handled

The `studentTopicGrades.ts` function uses `kpTotalMapped` (count of ALL questions mapped to each KP in the graph) as the denominator, not just attempted questions. So if a KP has 10 questions but the student only attempted 3 and got 2 correct, mastery = 2/10 = 20%, not 2/3 = 67%. This is exactly the behavior requested.

## Implementation Plan

### 1. Create a one-time import script/feature in `BulkUploadPanel.tsx`

Add support for "auto-detect" CSV format. When the uploaded CSV has a `question_content` column (instead of `question_text`), use the alternative parsing logic:

- Extract `question_content` (multiline, may contain commas and newlines inside quotes)
- Match against `questions.question_text` in the database using case-insensitive prefix matching (the CSV content may include extra markdown formatting)
- Use `best_score_attempt_evaluation_result` for correctness (CORRECT = true, else false)
- Use `first_correct_attempt_submission_datetime` as `attempted_at` (fallback to current date)
- Use `user_id` as `student_id`, auto-generate a student name like "Student 1"

### 2. Update `BulkUploadPanel.tsx` parsing logic

- In `handleFile`, after reading CSV, check if header contains `question_content` 
- If yes, use a new `parseCustomCSV()` function that:
  - Extracts `user_id`, `question_content`, `best_score_attempt_evaluation_result`, and timestamp
  - Matches `question_content` to database questions by comparing the first ~100 characters (trimmed, case-insensitive) to handle minor formatting differences
  - Creates `BulkUploadRow[]` in the same format the existing upload flow expects
- The rest of the flow (insert attempts, calculate mastery, enroll student) stays unchanged

### 3. Update question matching strategy

The CSV `question_content` contains the full markdown. The database `question_text` also stores full markdown. Matching strategy:
- Normalize both: trim whitespace, collapse newlines, lowercase
- Try exact match first
- If no exact match, try matching first 80 characters as a prefix
- Report unmatched questions as warnings

### 4. No database changes needed

The existing schema handles everything:
- `student_attempts` stores the attempt records
- `student_kp_mastery` gets updated via `calculateAndPersistMastery`
- `studentTopicGrades.ts` computes the rollup using all mapped questions as denominator

### 5. After import, display results

After the 62 attempts are imported:
- The student appears in the TopicScoreTable student selector
- Selecting them shows per-topic mastery with sqrt-weighted rollup
- Topics with no attempted questions show 0% mastery
- JS Coding topic will show mastery based on 62/244 questions (unattempted = incorrect)

## Technical Details

### Files to modify:
- `src/components/mastery/BulkUploadPanel.tsx` -- add auto-detection of custom CSV format, alternative parser, and matching logic

### Files unchanged:
- `src/lib/mastery/studentTopicGrades.ts` -- already handles unattempted questions correctly
- `src/lib/mastery/calculateMastery.ts` -- binary scoring already implemented
- `src/lib/mastery/persistMastery.ts` -- upsert logic unchanged
- `src/components/panels/TopicScoreTable.tsx` -- student selector already works

