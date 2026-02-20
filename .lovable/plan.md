
# Fix Duplicate Detection: Strip Code Fences and Clean Stubs

## Root Cause

Two issues are preventing full duplicate detection:

### Issue 1: Code fences in file but not in DB (affects ~86 questions)
The uploaded file wraps examples in markdown code fences:
```text
#### Sample Input:
` ` `
TechGadgets
Smartphone Laptop Tablet
` ` `
```

But the database stores the same content **without** code fences:
```text
#### Sample Input:

TechGadgets
Smartphone Laptop Tablet
```

The `extractCoreQuestion` function includes these `` ` ` ` `` lines as content, shifting the 500-character fingerprint window and causing mismatches.

### Issue 2: 35 stub questions (title-only records)
Questions like `## High Score Selector`, `## Square Star Pattern`, `1. Write a program...` exist as short stubs alongside their full-text duplicates. The stub fingerprint ("high score selector") differs from the full question fingerprint ("high score selector you are building a game...").

## Fix

### Step 1: Update `src/lib/question/extractCore.ts`

Add normalization rules inside the loop:

1. **Skip code fence lines**: Lines that are just `` ` ` ` `` or `` ` ` `language `` should be skipped entirely (they carry no semantic content)
2. **Collapse multiple whitespace**: Replace runs of 2+ spaces with a single space in the final fingerprint to handle minor spacing differences between file and DB

### Step 2: Delete 35 stub questions from DB

Delete the 35 questions with `length(question_text) < 100` from the LKG IO New graph. These are title-only stubs that already have full-text versions in the DB (or will be re-imported from the file).

## Expected Result

After these changes, re-uploading the file should detect ~224 duplicates (259 real DB questions minus the 35 deleted stubs) and queue only the ~104 genuinely missing questions.
