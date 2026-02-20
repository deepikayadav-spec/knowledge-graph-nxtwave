

# Add "Find Missing Questions" Button to the UI

## What This Does
Adds a button in the question upload panel that lets you select a file, automatically calls the already-deployed backend function to compare it against the database, and shows you exactly which questions are missing -- with the option to upload only those.

## How It Works
1. You click "Find Missing Questions" in the question panel
2. A file picker opens -- you select your `questions_with_strong_delimiters-3.txt`
3. The app sends the file content to the `find-missing-questions` backend function
4. The function compares all 328 file questions against the 224 DB questions using fingerprinting
5. Results are shown: how many matched, how many are missing
6. A "Upload Missing Only" button appears to upload just the missing questions

## Changes

### Step 1: Add a "Find Missing" button to `QuickQuestionInput.tsx`
- Add a new button next to the existing upload controls
- On click, open a file picker dialog
- Read the selected file content
- Call the `find-missing-questions` edge function with the file content and current `graph_id`
- Display results in a summary panel showing:
  - Total file questions
  - Total DB questions  
  - Matched (duplicates) count
  - Missing (new) count
- Show a "Upload Missing Only" button that pre-fills the question input with only the missing questions in the `<<<QUESTION_START>>>` format

### Step 2: Wire up the edge function call
- Use `supabase.functions.invoke('find-missing-questions', { body: { file_content, graph_id } })`
- Show a loading spinner during the comparison
- Handle errors gracefully with toast notifications

### Step 3: Auto-upload missing questions
- When user clicks "Upload Missing Only", the missing questions (returned by the edge function) are formatted and fed into the existing upload pipeline
- This bypasses the broken client-side duplicate detection entirely

## Technical Details

### File: `src/components/panels/QuickQuestionInput.tsx`
- Add state for `missingQuestions`, `comparisonResults`, `isComparing`
- Add `handleFindMissing()` function that:
  1. Opens file picker
  2. Reads file text
  3. Calls edge function
  4. Stores results in state
- Add UI section showing comparison results when available
- Add "Upload Missing Only" button that calls existing upload logic with only the missing questions

### No new files needed
The edge function `find-missing-questions` already exists and is deployed. We just need the UI to call it.
