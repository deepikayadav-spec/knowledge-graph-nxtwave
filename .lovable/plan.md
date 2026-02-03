

# Fix Duplicate Question Detection

## Problem Analysis

The duplicate detection is failing because of a **format mismatch** between:

1. **User Input**: Full multi-line blocks containing `Question:`, `Input:`, `Output:`, and `Explanation:` sections
2. **Database Storage**: Only the simplified question text (first line after "Question:")

### Current Flow (Broken)

```text
User pastes:
  "Question
   Write a program...
   Input
   A single line of text...
   Output
   ..."

parseQuestionsFromText() returns:
  ["Question\nWrite a program...\nInput\nA single line...\nOutput\n..."]

checkDuplicateQuestions() compares:
  User: "question\nwrite a program...\ninput\na single line...\noutput\n..."
  DB:   "write a program that reads a single line of input..."
  
  Result: NO MATCH (despite being the same question)
```

### Solution

Extract and normalize the core question text from multi-line blocks before comparison:

1. **Add extraction function**: Parse out only the main question line from structured blocks
2. **Update duplicate checking**: Use normalized question text for comparisons
3. **Update UI preview**: Show comparison using extracted question text

---

## Technical Implementation

### 1. Add Question Text Extraction Function

Create a new helper function in `QuickQuestionInput.tsx`:

```typescript
/**
 * Extract the core question text from a structured block.
 * Handles formats like:
 * "Question\nWrite a program...\nInput\n...\nOutput\n..."
 * Returns just "Write a program..." for comparison
 */
function extractCoreQuestion(fullBlock: string): string {
  const lines = fullBlock.split('\n').map(l => l.trim()).filter(l => l);
  
  // Look for content after "Question:" or "Question"
  let questionStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^Question\s*:?\s*$/i.test(lines[i])) {
      questionStartIdx = i + 1;
      break;
    }
    // Handle "Question: Write a program..." on same line
    const match = lines[i].match(/^Question\s*:\s*(.+)/i);
    if (match) {
      return match[1].trim().toLowerCase();
    }
  }
  
  // If we found "Question" header, get the next non-header line
  if (questionStartIdx >= 0 && questionStartIdx < lines.length) {
    // Find the question text (before Input/Output/Explanation)
    for (let i = questionStartIdx; i < lines.length; i++) {
      const line = lines[i];
      // Stop at section headers
      if (/^(Input|Output|Explanation)\s*:?\s*$/i.test(line)) break;
      if (line.length > 0) return line.toLowerCase();
    }
  }
  
  // Fallback: return first meaningful line
  return lines.find(l => 
    !/^(Question|Input|Output|Explanation)\s*:?\s*$/i.test(l)
  )?.toLowerCase() || fullBlock.trim().toLowerCase();
}
```

### 2. Update Duplicate Check in QuickQuestionInput.tsx

Modify the duplicate checking logic:

```typescript
// Before (broken):
if (existingTexts.has(question.trim().toLowerCase())) {
  duplicateCount++;
}

// After (fixed):
const coreQuestion = extractCoreQuestion(question);
if (existingTexts.has(coreQuestion)) {
  duplicateCount++;
}
```

### 3. Update Duplicate Check in useBatchGeneration.ts

Apply the same extraction logic:

```typescript
// Add the extraction function
function extractCoreQuestion(fullBlock: string): string {
  // Same implementation as above
}

// Update the comparison
const checkDuplicateQuestions = useCallback(async (
  questions: string[],
  graphId?: string
): Promise<{ uniqueQuestions: string[]; duplicates: string[] }> => {
  // ...existing code...
  
  // Build set of normalized existing questions
  const existingTexts = new Set(
    (existingQuestions || []).map(q => q.question_text.trim().toLowerCase())
  );

  for (const question of questions) {
    // Extract and normalize the core question
    const coreQuestion = extractCoreQuestion(question);
    if (existingTexts.has(coreQuestion)) {
      duplicates.push(question);
    } else {
      uniqueQuestions.push(question);
    }
  }
  
  return { uniqueQuestions, duplicates };
}, []);
```

### 4. Create Shared Utility

Move the extraction function to a shared location:

**New File: `src/lib/question/extractCore.ts`**

```typescript
/**
 * Extract the core question text from a structured block.
 * Handles multi-line formatted questions with sections.
 */
export function extractCoreQuestion(fullBlock: string): string {
  const lines = fullBlock.split('\n').map(l => l.trim()).filter(l => l);
  
  // Look for content after "Question:" or "Question"
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
  
  return lines.find(l => 
    !/^(Question|Input|Output|Explanation)\s*:?\s*$/i.test(l)
  )?.toLowerCase() || fullBlock.trim().toLowerCase();
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/question/extractCore.ts` | Create new file with shared extraction function |
| `src/components/panels/QuickQuestionInput.tsx` | Import and use `extractCoreQuestion` in duplicate check |
| `src/hooks/useBatchGeneration.ts` | Import and use `extractCoreQuestion` in duplicate filtering |

---

## Expected Behavior After Fix

| User Action | Result |
|-------------|--------|
| Paste same questions first time | All show as "new" |
| Paste same questions second time | All show as "duplicate" |
| Paste mixed new + existing | Shows correct "X new, Y duplicate" |
| Generate with duplicates | Toast shows skipped questions, only new ones processed |

---

## Summary

The fix ensures that when comparing user input against stored questions, we extract just the core question text (e.g., "Write a program that reads a single line...") from the full structured block before comparison. This allows the duplicate detection to work correctly regardless of whether the user pastes:
- Full structured format with Input/Output/Explanation
- Just the question text alone

