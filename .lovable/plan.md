
# Fix: Auto-detect JSON content in any text file

## Problem
The file handler checks the file extension (`.json`) to decide whether to parse as JSON. Your files have a `.txt` extension but contain valid JSON arrays, so they get treated as plain text -- resulting in only 1 "question" (the entire file content).

## Solution
Restructure the parsing logic so that for any non-CSV, non-PDF file, we first attempt JSON parsing. If the content is a valid JSON array, use the structured parser. If not, fall back to plain text parsing.

## Change

**File: `src/components/panels/QuickQuestionInput.tsx`** (lines 283-324)

Current logic:
```
if (.csv)        -> parseCSV
else if (.json)  -> try JSON parse, fallback to text
else             -> parseQuestionsFromText
```

New logic:
```
if (.csv)        -> parseCSV
else             -> try JSON parse first, fallback to parseQuestionsFromText
```

The JSON parsing block (with `question_content`, `test_cases`, topic headers) stays identical -- it just runs for all non-CSV text files, not only `.json` files. If `JSON.parse` throws, it falls back to `parseQuestionsFromText` as before.

This is a ~3-line structural change: remove the `.json` extension check and merge the two `else` branches.
