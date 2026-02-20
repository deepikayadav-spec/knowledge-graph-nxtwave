

# Fix: Duplicate Detection Mismatch Between Stored and Imported Questions

## Problem

When you upload the same file twice, duplicates are not detected. This happens because the question text stored in the database and the question text parsed from the file import have different formats, producing different fingerprints.

**What gets stored in the database** (after first upload + generation):
```
In this question, let's practice HTML Lists and Void Elements...
```

**What the file import produces** (second upload):
```
Topic: HTML Elements

Question:
In this question, let's practice HTML Lists and Void Elements...

Test Cases:
- Page should consist of an HTML image element... (weight: 5)
```

The `extractCoreQuestion` function handles these two formats via different code paths, producing different fingerprints -- so the duplicate check never matches.

## Root Cause

1. The DB text has **no headers** -- so the function takes the fallback path and joins ALL lines
2. The imported text has `Topic:` and `Question:` headers -- so the function takes the Question-header path and only collects lines between `Question:` and `Test Cases:`
3. Additionally, the `Topic: HTML Elements` line is NOT filtered by the fallback regex because it only matches bare `Topic:` (without content after it)

## Solution

Update `extractCoreQuestion` to normalize more aggressively so both formats produce the same fingerprint:

1. **Strip `Topic: ...` lines** (with content) at the start, not just bare `Topic:` headers
2. **Strip `Test Cases:` sections** and everything after them in both paths
3. **Always strip the `Question:` header** before processing, so both paths converge

### File: `src/lib/question/extractCore.ts`

Replace the function with improved normalization:

```typescript
export function extractCoreQuestion(fullBlock: string): string {
  // Strip HTML tags
  const cleaned = fullBlock.replace(/<br\s*\/?>/gi, '\n');
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l);

  // Remove Topic: lines (with or without content after)
  // Remove Question: header lines
  // Stop at section headers like Input, Output, Test Cases
  const contentLines: string[] = [];
  let pastQuestionHeader = false;
  let foundQuestionHeader = false;

  for (const line of lines) {
    // Skip "Topic: ..." lines entirely
    if (/^Topic\s*:\s*/i.test(line)) continue;

    // Skip bare "Question" or "Question:" header
    if (/^Question\s*:?\s*$/i.test(line)) {
      foundQuestionHeader = true;
      pastQuestionHeader = true;
      continue;
    }

    // Handle "Question: actual content..." on same line
    const inlineMatch = line.match(/^Question\s*:\s*(.+)/i);
    if (inlineMatch) {
      foundQuestionHeader = true;
      pastQuestionHeader = true;
      contentLines.push(inlineMatch[1]);
      continue;
    }

    // Stop at section headers
    if (/^(Input|Output|Explanation|Test Cases|Resources)\s*:?\s*$/i.test(line)) break;

    contentLines.push(line);
  }

  if (contentLines.length > 0) {
    return contentLines.join(' ').toLowerCase().substring(0, 500);
  }

  return fullBlock.trim().toLowerCase().substring(0, 500);
}
```

Key changes:
- `Topic: HTML Elements` lines are now always stripped (regex matches `Topic:` followed by any content)
- `Question:` headers are always stripped regardless of format
- `Test Cases:` acts as a stop point in all paths (added alongside Input/Output/Explanation)
- `Resources` also acts as a stop point (many questions have a Resources section after the core content)
- Single unified code path instead of branching -- both formats converge to the same fingerprint

### No other files need to change

The callers in `useBatchGeneration.ts` and `QuickQuestionInput.tsx` already use `extractCoreQuestion` correctly -- only the normalization logic inside it needs fixing.
