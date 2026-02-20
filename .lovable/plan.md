
# Fix: Question Count Overcounting After JSON Import

## Problem

When a JSON file with 3 questions is loaded, the textarea shows "18 question(s)" because:

1. The JSON parser correctly extracts 3 questions and joins them with `\n\n` into the textarea
2. Each question contains multiple internal `\n\n` gaps (between Topic header, question content, and Test Cases section)
3. The question count (line 353) re-parses the textarea using `parseQuestionsFromText()`, which splits on every double-newline -- fragmenting each question into ~6 pieces

## Solution

When questions come from JSON import, insert a `Question:` header before each one. This way `parseQuestionsFromText()` uses the structured-header splitting path instead of the double-newline path, and counts exactly 3 questions.

## Change

**File: `src/components/panels/QuickQuestionInput.tsx`**

### 1. Add "Question:" prefix in the JSON mapper (line 296)

After building the topic header, prepend `Question:` before the content:

```typescript
let result = '';

// Add topic/subtopic header for automatic grouping
if (q.subtopic) {
  result += `Topic: ${q.subtopic}\n\n`;
} else if (q.topic) {
  result += `Topic: ${q.topic}\n\n`;
}

result += 'Question:\n';  // <-- ADD THIS LINE
result += content;
```

This single line ensures that when the 3 questions are joined and put in the textarea, `parseQuestionsFromText()` detects the `Question:` headers and splits correctly into exactly 3 questions.

### What this looks like in the textarea

```
Topic: Introduction to HTML

Question:
In this assignment, let's practice the Basic HTML Elements...

Test Cases:
- Page should consist of an HTML main heading element (weight: 5)
- Page should consist of an HTML paragraph element (weight: 5)

Topic: Introduction to HTML

Question:
In this assignment, let's practice the Basic HTML Elements...
(second question)

Topic: Introduction to HTML

Question:
In this assignment, let's practice the Basic HTML Elements...
(third question)
```

The parser sees 3 `Question:` headers and splits into 3 questions -- matching the actual file content.

## What stays the same

- `parseQuestionsFromText()` logic unchanged
- Edge function unchanged
- Plain text file handling unchanged (free-form split still works for non-JSON files)
- No database changes
