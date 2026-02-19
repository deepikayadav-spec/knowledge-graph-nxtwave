
# Add Test Cases Support to Knowledge Graph Generation

## Overview

Add an optional "Test Cases" section to the question input format. When present, the AI will use these input/output pairs to discover edge cases and hidden complexity during IPA analysis. No database changes needed yet -- test cases will flow through the generation pipeline and be stored later when the schema update is added.

## Changes

### 1. Update Question Input Panel (`src/components/panels/QuestionInputPanel.tsx`)

- Update the placeholder text to show the `Test Cases:` section format
- Update the help text to mention test cases
- Parse `Test Cases:` sections from each question block before sending to the edge function
- Format: `Input: value | Output: value` (one per line under `Test Cases:`)

### 2. Update `generate-graph` Edge Function (`supabase/functions/generate-graph/index.ts`)

- Add a new section to the system prompt (after the INPUT FORMAT section) explaining how to use test cases:
  - During PERCEIVE: Notice edge cases revealed by test inputs (zero, negative, empty, large values, boundary conditions)
  - During MONITOR: Identify error handling and validation skills needed based on unusual test cases
  - Instruct the AI that test cases reveal hidden complexity the question text alone may not show
- The test cases will be appended to each question's text when formatting the prompt, clearly labeled as "Test Cases:"
- Backward compatible: if no test cases are present, behavior is identical to today

### 3. Add Database Column (migration)

- Add nullable `test_cases` JSONB column to `questions` table
- Format: `[{"input": "5", "output": "120"}, ...]`
- Default NULL, so existing questions are unaffected

### 4. Update Persistence (`src/hooks/useGraphPersistence.ts`)

- When saving questions to the database, include the `test_cases` field if present

## Technical Details

### Input Format (user-facing)

```
Question:
Print factorial of N.

Input:
An integer N.

Output:
Factorial of N.

Explanation:
Use a loop to multiply 1 to N.

Test Cases:
Input: 5 | Output: 120
Input: 0 | Output: 1
Input: 1 | Output: 1
Input: -1 | Output: Invalid
```

### System Prompt Addition (edge function)

A new section will be added to the prompt:

```text
=== TEST CASES (OPTIONAL INPUT) ===

Some questions may include test cases as input/output pairs. When present:

1. During PERCEIVE: Examine test case inputs for edge cases the question
   text does not mention (zero, negative numbers, empty strings, very large
   values, special characters, boundary conditions).

2. During MONITOR: If test cases reveal error handling scenarios (invalid
   input, edge boundaries), ensure appropriate skills like input_validation,
   boundary_checking, or error_handling are surfaced.

3. Test cases that show MULTIPLE distinct scenarios suggest the question
   has hidden complexity -- make sure all required skills are captured.

4. Do NOT create separate skills for individual test cases. Use them as
   evidence to inform your IPA analysis and skill identification.
```

### Files Modified

| File | Change |
|------|--------|
| `src/components/panels/QuestionInputPanel.tsx` | Update placeholder, parser to extract test cases |
| `supabase/functions/generate-graph/index.ts` | Add test case section to system prompt |
| `src/hooks/useGraphPersistence.ts` | Include test_cases in question upsert |
| Database migration | Add `test_cases` JSONB column to `questions` |
