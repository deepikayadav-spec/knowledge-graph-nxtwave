

# Fix: Duplicate Detection Using Full Question Text

## Problem

The duplicate detection system (`extractCoreQuestion`) reduces each question to just its **first non-header line** for comparison. This causes two issues:

1. **False positives (over-filtering)**: Multiple genuinely different questions that share the same opening sentence (e.g., "In this assignment, let's practice the Basic HTML Elements...") are treated as duplicates because only the first line is compared -- even though they have different images, instructions, and test cases.

2. **False negatives (under-filtering)**: Questions that are truly the same but have slightly different first lines slip through.

This affects both the real-time duplicate counter in the textarea and the pre-generation duplicate check.

## Root Cause

In `src/lib/question/extractCore.ts`, the function returns only the first meaningful line of text (line 33: `if (line.length > 0) return line.toLowerCase()`). For structured questions without `Question:` headers (like those stored in the database after generation), it falls back to the first non-empty line (line 39-41).

## Solution

Change `extractCoreQuestion` to return **more of the question content** -- specifically, concatenate multiple content lines (up to a reasonable limit) before section headers like Input/Output/Explanation. This creates a more unique fingerprint for each question.

### File: `src/lib/question/extractCore.ts`

**Current logic** (returns first content line only):
```typescript
for (let i = questionStartIdx; i < lines.length; i++) {
  const line = lines[i];
  if (/^(Input|Output|Explanation|Test Cases)\s*:?\s*$/i.test(line)) break;
  if (line.length > 0) return line.toLowerCase(); // Returns immediately
}
```

**New logic** (collects all content lines before section headers):
```typescript
const contentLines: string[] = [];
for (let i = questionStartIdx; i < lines.length; i++) {
  const line = lines[i];
  if (/^(Input|Output|Explanation|Test Cases)\s*:?\s*$/i.test(line)) break;
  if (line.length > 0) contentLines.push(line);
}
if (contentLines.length > 0) {
  return contentLines.join(' ').toLowerCase().substring(0, 500);
}
```

Apply the same change to the **fallback path** (for questions without `Question:` headers):

```typescript
// Collect all non-header lines up to a limit
const contentLines = lines.filter(l =>
  !/^(Question|Input|Output|Explanation|Test Cases|Topic)\s*:?\s*$/i.test(l)
);
return contentLines.join(' ').toLowerCase().substring(0, 500)
  || fullBlock.trim().toLowerCase();
```

### What this fixes

- Three "Basic HTML Elements" practice questions will now include their unique image URLs and instructions in the comparison string, making them distinct
- Questions numbered "1", "2", "3" etc. will still be correctly identified by their short text
- The 500-character cap prevents excessive memory usage for very long questions

### Files changed

| File | Change |
|---|---|
| `src/lib/question/extractCore.ts` | Use multi-line content (up to 500 chars) instead of first line only |

### What stays the same

- The duplicate check logic in `useBatchGeneration.ts` and `QuickQuestionInput.tsx` remains unchanged -- they already call `extractCoreQuestion` correctly
- Database schema unchanged
- Edge functions unchanged

