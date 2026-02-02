

# Structured Question Input Format

## Overview

Update the question input system to accept structured coding problems with clear sections (Problem, Input, Output, Constraints, Examples) instead of free-form text. This provides richer context for the AI to generate more accurate knowledge graphs.

## Proposed Format

Each question will use a marker-based format:

```text
[QUESTION]
Problem:
Write a function to check if a key exists in a nested dictionary.

Input:
A dictionary that may contain nested dictionaries, and a key to search for.

Output:
Return True if the key exists at any level, False otherwise.

Constraints:
- Dictionary depth can be up to 10 levels
- Keys are strings only

Examples:
Input: {"a": {"b": 1}}, "b"
Output: True

[QUESTION]
Problem:
Count word frequencies in a sentence.
...
```

## Changes Required

### 1. Update QuickQuestionInput Component

**File**: `src/components/panels/QuickQuestionInput.tsx`

**Changes**:
- Update placeholder text to show the new structured format
- Change parsing logic from `split(/\n\s*\n/)` to split on `[QUESTION]` markers
- Update helper text and question count display

### 2. Update QuestionInputPanel Component

**File**: `src/components/panels/QuestionInputPanel.tsx`

**Changes**:
- Update placeholder text to show structured format example
- Change parsing logic to use `[QUESTION]` marker splitting
- Update description/help text

### 3. Update Edge Function System Prompt

**File**: `supabase/functions/generate-graph/index.ts`

**Changes**:
- Update the system prompt to expect structured question format
- Add parsing guidance for Problem/Input/Output/Constraints/Examples sections
- Update the example in the prompt to use structured format

### 4. Alternative: JSON Input Option

If you prefer JSON input, we could also support this format:

```json
[
  {
    "problem": "Check if key exists in nested dictionary",
    "input": "Dictionary with nested structure, key to find",
    "output": "Boolean indicating if key was found",
    "constraints": ["Max depth 10", "String keys only"],
    "examples": [
      {"input": "{\"a\": {\"b\": 1}}, \"b\"", "output": "True"}
    ]
  }
]
```

This would require adding a JSON/Text format toggle in the UI.

---

## Implementation Details

### Parsing Logic Update

```typescript
// Current (blank line splitting)
const questions = questionsText
  .split(/\n\s*\n/)
  .map(q => q.trim())
  .filter(q => q.length > 0);

// New (marker splitting)
const questions = questionsText
  .split(/\[QUESTION\]/i)
  .map(q => q.trim())
  .filter(q => q.length > 0);
```

### Updated Placeholder Example

```text
[QUESTION]
Problem:
Write a function to check if a key exists in a nested dictionary.

Input:
A dictionary (may contain nested dicts) and a target key string.

Output:
True if key exists at any nesting level, False otherwise.

Constraints:
- Max nesting depth: 10 levels
- Keys are always strings

Examples:
{"a": {"b": 1}}, "b" → True
{"x": 1}, "y" → False

[QUESTION]
Problem:
Count word frequencies in a given text.
...
```

### System Prompt Update

Add section to explain the structured format:

```text
=== INPUT FORMAT ===

Questions are provided in structured format with these sections:
- Problem: The task description
- Input: Expected input format/types
- Output: Expected output format/types  
- Constraints: Limits and restrictions
- Examples: Sample input/output pairs

Use ALL sections when performing IPA analysis - constraints inform edge cases,
examples help identify patterns.
```

---

## Benefits

1. **Richer Context**: Constraints and examples help the AI identify edge case handling skills
2. **Better Skill Extraction**: Input/Output sections clarify data type handling requirements
3. **Curriculum Alignment**: Format matches typical coding assessment question formats
4. **Consistent Structure**: Easier to batch process and validate questions

---

## Summary of File Changes

| File | Type of Change |
|------|----------------|
| `src/components/panels/QuickQuestionInput.tsx` | Update placeholder, parsing logic, help text |
| `src/components/panels/QuestionInputPanel.tsx` | Update placeholder, parsing logic, description |
| `supabase/functions/generate-graph/index.ts` | Update system prompt with format documentation |

