

# Handle Structured JSON Question Files with Test Cases

## The Problem

Your JSON files use this structure:
```json
{
  "topic": "HTML",
  "subtopic": "Introduction to HTML",
  "question_content": "In this assignment...",
  "test_cases": [
    { "display_text": "Page should consist of an HTML main heading element", "weightage": 5 }
  ]
}
```

The current JSON parser (line 289 of `QuickQuestionInput.tsx`) only looks for `q.question` or `q.text` fields, so it falls back to dumping raw JSON -- losing the structured information and making it unusable for graph generation.

## The Fix

Update the JSON file handler in `QuickQuestionInput.tsx` to:

1. Recognize `question_content` as the question text field
2. Append `test_cases` to the question text so the IPA/LTA workflow can analyze them (it already handles test case content in the shared prompt)
3. Prepend `Topic: subtopic` as a header so the existing `parseTopicHeaders()` in `useBatchGeneration.ts` correctly groups questions by topic

### What the output looks like per question

```
Topic: Introduction to HTML

In this assignment, let's practice the Basic HTML Elements...

Test Cases:
- Page should consist of an HTML main heading element (weight: 5)
- Page should consist of an HTML paragraph element (weight: 5)
- Page should consist of an HTML button element (weight: 5)
```

This format feeds naturally into the existing pipeline -- `parseTopicHeaders()` extracts the topic, the IPA analysis sees the test cases as part of the question content, and the generate-graph function handles everything correctly.

## Technical Changes

**File: `src/components/panels/QuickQuestionInput.tsx`** (lines 285-293)

Replace the JSON parsing block to handle the new format:

```typescript
} else if (file.name.endsWith('.json')) {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      questions = parsed.map(q => {
        if (typeof q === 'string') return q;

        // Support question_content field (NxtWave format)
        const content = q.question_content || q.question || q.text || '';
        if (!content) return JSON.stringify(q);

        let result = '';

        // Add topic/subtopic header for automatic grouping
        if (q.subtopic) {
          result += `Topic: ${q.subtopic}\n\n`;
        } else if (q.topic) {
          result += `Topic: ${q.topic}\n\n`;
        }

        result += content;

        // Append test cases so IPA/LTA can analyze them
        if (q.test_cases && Array.isArray(q.test_cases) && q.test_cases.length > 0) {
          result += '\n\nTest Cases:';
          for (const tc of q.test_cases) {
            const weight = tc.weightage ? ` (weight: ${tc.weightage})` : '';
            result += `\n- ${tc.display_text || tc.description || tc.text}${weight}`;
          }
        }

        return result.trim();
      }).filter(q => q.length > 0);
    }
  } catch {
    questions = parseQuestionsFromText(text);
  }
}
```

## What stays the same

- No edge function changes needed -- test cases are embedded in the question text, which the IPA/LTA already analyzes
- No database changes
- No changes to `useBatchGeneration.ts` -- `parseTopicHeaders()` already handles `Topic:` headers
- PDF upload, CSV upload, and text paste all work as before

