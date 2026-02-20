
# Fix: Support `<<<QUESTION_START>>>` / `<<<QUESTION_END>>>` Delimiters

## Problem

The uploaded file uses structured delimiters (`<<<QUESTION_START>>>`, `<<<QUESTION_END>>>`, `<<<QUESTION_CONTENT>>>`, `<<<TEST_CASES>>>`) but the parser doesn't recognize them, so it falls back to double-newline splitting and produces thousands of fragments instead of 328 questions.

## Solution

Add a detection block at the top of `parseQuestionsFromText()` in `src/components/panels/QuickQuestionInput.tsx`.

### File: `src/components/panels/QuickQuestionInput.tsx`

**Update `parseQuestionsFromText` (line 22):** Add a check before the existing logic:

```typescript
function parseQuestionsFromText(text: string): string[] {
  // Detect <<<QUESTION_START>>> / <<<QUESTION_END>>> delimited format
  if (text.includes('<<<QUESTION_START>>>')) {
    const blocks = text.split('<<<QUESTION_START>>>');
    return blocks
      .map(block => {
        // Extract only the content portion (between QUESTION_CONTENT and TEST_CASES or QUESTION_END)
        const contentMatch = block.match(/<<<QUESTION_CONTENT>>>([\s\S]*?)(?=<<<TEST_CASES>>>|<<<QUESTION_END>>>)/);
        if (!contentMatch) return '';
        let content = contentMatch[1].trim();
        // Strip QUESTION_ID line
        content = content.replace(/^QUESTION_ID:\s*.+\n*/i, '').trim();
        return content;
      })
      .filter(q => q.length > 10);
  }

  // Detect ===== delimiter format
  if (/^={5,}/m.test(text)) {
    return text
      .split(/^={5,}\s*$/m)
      .map(block => {
        let cleaned = block.trim();
        cleaned = cleaned.replace(/^QUESTION ID:\s*.+\n*/i, '');
        cleaned = cleaned.replace(/^QUESTION CONTENT:\s*\n*/i, '');
        return cleaned.trim();
      })
      .filter(q => q.length > 10);
  }

  // ... existing Question: header and double-newline logic unchanged
}
```

This is the only change needed -- once the parser returns the correct 328-element array, the rest of the pipeline (parsedQuestions state, turbo mode trigger, submission) all work correctly.
