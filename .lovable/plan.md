

# Find Missing Questions via Server-Side Comparison

## Problem
The duplicate detection in the UI still shows 138 duplicates instead of the expected ~224. We cannot manually compare 328 file questions against 224 DB questions. We need a programmatic solution.

## Approach
Build a temporary edge function that performs the exact same fingerprinting comparison server-side and returns the list of questions from the file that are NOT already in the database.

## Steps

### Step 1: Create edge function `find-missing-questions`

This function will:
1. Accept the file content (POST body) and graph_id
2. Parse questions using the `<<<QUESTION_START>>>` / `<<<QUESTION_CONTENT>>>` delimiter format (same logic as the UI parser)
3. Fetch all existing question texts from the DB for the given graph
4. Run the `extractCoreQuestion` fingerprint logic on BOTH sides
5. Compare fingerprint sets
6. Return:
   - Count of file questions matching DB (true duplicates)
   - Count of file questions NOT in DB (missing/new)
   - The actual content of the missing questions (so they can be uploaded separately)
   - Diagnostic info: for each non-matching question, show the fingerprint so we can debug WHY it didn't match

### Step 2: Call the edge function with the file content

Use the curl tool to POST the file content and get back the precise list of missing questions.

### Step 3: Provide the missing questions

Once we have the exact list, we can either:
- Give you a file with just the missing questions to upload
- Or directly insert them into the DB and queue them for generation

## Technical Details

The edge function will contain:
- The exact same `extractCoreQuestion` logic from `src/lib/question/extractCore.ts` (including all recent normalization fixes: strip numbering, strip markdown headers, skip code fences, collapse whitespace)
- The exact same `<<<QUESTION_START>>>` parser from `QuickQuestionInput.tsx`
- A Supabase client to fetch existing DB questions

This ensures the comparison is identical to what the UI does, and we can see exactly which questions fail to match and why.
