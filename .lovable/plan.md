
# Fix Duplicate Detection - Core Issue

## Problem Summary

The duplicate detection is fundamentally broken due to a **format mismatch** between:

1. **User Input**: Multi-line structured blocks with headers
2. **Database Storage**: Single-line full text (sometimes with HTML `<br/>` tags)

The current `extractCoreQuestion` function only extracts the first meaningful line from user input, but the database comparison uses the **full stored text**. These will never match.

## Example of the Mismatch

| Source | Value |
|--------|-------|
| User pastes | `Question\nWrite a function with the name get_discount...\n- If the bill amount is less than 500...` |
| `extractCoreQuestion()` returns | `"write a function with the name get_discount that takes the bill amount as an argument."` |
| Database stores | `"Write a function with the name get_discount...<br/> - If the bill amount is less than 500..."` (full text) |
| Comparison | **NO MATCH** - first line vs full text |

## Root Cause

```typescript
// Current code in useBatchGeneration.ts and QuickQuestionInput.tsx:
const existingTexts = new Set(
  (existingQuestions || []).map(q => q.question_text.trim().toLowerCase()) // <-- Full text!
);

for (const question of questions) {
  const coreQuestion = extractCoreQuestion(question); // <-- First line only!
  if (existingTexts.has(coreQuestion)) { // <-- Never matches
    duplicateCount++;
  }
}
```

## Solution

Apply `extractCoreQuestion` to **BOTH** the user input AND the database stored questions:

```typescript
// Create a set of normalized existing question texts for fast lookup
const existingTexts = new Set(
  (existingQuestions || []).map(q => extractCoreQuestion(q.question_text)) // Apply same extraction
);

for (const question of questions) {
  const coreQuestion = extractCoreQuestion(question);
  if (existingTexts.has(coreQuestion)) {
    duplicateCount++;
  }
}
```

This ensures both sides are compared using the same normalization logic.

---

## Technical Implementation

### Changes Required

#### 1. Update `src/hooks/useBatchGeneration.ts`

Lines 195-197: Apply `extractCoreQuestion` to database records

```typescript
// Before:
const existingTexts = new Set(
  (existingQuestions || []).map(q => q.question_text.trim().toLowerCase())
);

// After:
const existingTexts = new Set(
  (existingQuestions || []).map(q => extractCoreQuestion(q.question_text))
);
```

#### 2. Update `src/components/panels/QuickQuestionInput.tsx`

Lines 98-100: Apply `extractCoreQuestion` to database records

```typescript
// Before:
const existingTexts = new Set(
  (existingQuestions || []).map(q => q.question_text.trim().toLowerCase())
);

// After:
const existingTexts = new Set(
  (existingQuestions || []).map(q => extractCoreQuestion(q.question_text))
);
```

#### 3. Update `src/lib/question/extractCore.ts`

Improve the extraction to handle edge cases:
- Strip HTML `<br/>` tags before processing
- Handle questions stored as single lines without "Question" header

```typescript
export function extractCoreQuestion(fullBlock: string): string {
  // Strip HTML tags first
  const cleaned = fullBlock.replace(/<br\s*\/?>/gi, '\n');
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l);
  
  // If no "Question" header found, the question might be stored as plain text
  // In that case, just return the first line lowercased
  let questionStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^Question\s*:?\s*$/i.test(lines[i])) {
      questionStartIdx = i + 1;
      break;
    }
    const match = lines[i].match(/^Question\s*:\s*(.+)/i);
    if (match) {
      return match[1].trim().toLowerCase();
    }
  }
  
  if (questionStartIdx >= 0 && questionStartIdx < lines.length) {
    for (let i = questionStartIdx; i < lines.length; i++) {
      const line = lines[i];
      if (/^(Input|Output|Explanation)\s*:?\s*$/i.test(line)) break;
      if (line.length > 0) return line.toLowerCase();
    }
  }
  
  // Fallback for plain text questions (no headers)
  // Return first non-empty line that isn't a header
  return lines.find(l => 
    !/^(Question|Input|Output|Explanation)\s*:?\s*$/i.test(l)
  )?.toLowerCase() || fullBlock.trim().toLowerCase();
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/question/extractCore.ts` | Add HTML stripping before processing |
| `src/hooks/useBatchGeneration.ts` | Apply `extractCoreQuestion` to database records |
| `src/components/panels/QuickQuestionInput.tsx` | Apply `extractCoreQuestion` to database records |

---

## Expected Behavior After Fix

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| User pastes 70 structured questions | "16 new, 54 duplicates" (wrong) | "4 new, 66 duplicates" (correct) |
| Database with HTML `<br/>` tags | Never matches | Correctly strips and matches |
| Plain text questions in DB | Never matches | Correctly extracts and matches |

---

## Why Only 4 Questions Added?

Looking at the database, I see that many of the 70 questions you provided already exist in slightly different formats:
- Some have `<br/>` HTML tags in the database
- Some are stored as plain text without "Question" header
- The current extraction only works one-way (user input → first line) but not for database records

After this fix, the duplicate detection will correctly identify ~66 duplicates and ~4 truly new questions.
