

# Fix Duplicate Detection: Normalize Question Fingerprints

## Root Cause

The duplicate detection fails because questions are stored in the database with **different prefixes** than how the file provides them:

| DB stored format | File format | Match? |
|-----------------|-------------|--------|
| `1. Write a program that reads two numbers...` | `Write a program that reads two numbers...` | No -- leading "1. " |
| `## Square Star Pattern` | `Square Star Pattern\n\nWrite a program that prints...` | No -- "## " prefix + DB is title-only |
| `3. ## Multiplication Table Generator` | Full question content without numbering | No |

- **104 questions** in the DB start with numbering like `1. `, `2. `, `3. `, etc.
- **32 questions** start with markdown headers like `## `, `# `
- **5 questions** are stubs with text "1", "2", "3", "4", "5"

The `extractCoreQuestion` function does NOT strip these prefixes, so fingerprints differ between DB records and re-uploaded file content.

## Fix

### File: `src/lib/question/extractCore.ts`

Add two normalization steps at the start of the function, before fingerprinting:

1. **Strip leading numbering**: Remove patterns like `1. `, `2. `, `3. ` from the start of content lines
2. **Strip markdown headers**: Remove `# `, `## `, `### `, etc. from lines

Updated logic (added after line 12, inside the loop):

```text
For each line:
  - Strip leading "N. " numbering (e.g., "1. Write..." -> "Write...")
  - Strip leading markdown "#" headers (e.g., "## Title" -> "Title")
  - Then apply existing Topic/Question header stripping
```

This ensures the same core text produces the same fingerprint regardless of whether the source added numbering or markdown formatting.

### Additionally: Clean up 5 stub questions

Delete the 5 stub records (text = "1", "2", "3", "4", "5") from the database since they have no real content and their full-text versions already exist.

## Expected Result

After this fix, re-uploading the file should correctly detect ~259 duplicates and queue only the ~67 genuinely missing questions for generation.

