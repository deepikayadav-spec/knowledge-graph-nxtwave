
# Fix: Off-by-one Question Count (4 Instead of 3)

## Root Cause

When the textarea contains questions formatted as:

```
Topic: Introduction to HTML

Question:
...first question...

Topic: Introduction to HTML

Question:
...second question...
```

The `parseQuestionsFromText()` function splits on `Question:` headers using a lookahead regex. The text **before** the first `Question:` header (the initial `Topic:` line) becomes its own fragment. Since it's non-empty, it passes the filter -- producing 4 results instead of 3.

## Fix

In `parseQuestionsFromText()`, after splitting on `Question:` headers, filter out any fragments that don't actually contain a `Question:` header. These are just orphaned topic lines that belong to the next question.

**File: `src/components/panels/QuickQuestionInput.tsx`** (lines 26-31)

Change the split-and-filter logic from:

```typescript
if (hasQuestionHeaders) {
  return text
    .split(/(?=^Question\s*:?\s*$)/im)
    .map(q => q.trim())
    .filter(q => q.length > 0);
}
```

To:

```typescript
if (hasQuestionHeaders) {
  const parts = text.split(/(?=^Question\s*:?\s*$)/im);
  return parts
    .map((q, i) => {
      const trimmed = q.trim();
      // If this fragment doesn't contain a "Question:" header,
      // it's a leading topic line -- prepend it to the next fragment
      if (i < parts.length - 1 && !/^Question\s*:?\s*$/im.test(trimmed)) {
        parts[i + 1] = trimmed + '\n\n' + parts[i + 1];
        return '';
      }
      return trimmed;
    })
    .filter(q => q.length > 0);
}
```

This ensures:
- The leading `Topic:` line is merged into the first question (preserving topic metadata)
- Exactly 3 fragments are returned for 3 questions
- No data is lost -- topic headers stay attached to their questions
