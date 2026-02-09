

# Curriculum-Aware Graph Generation

## Overview

Enhance the graph generation pipeline with three changes:

1. **Curriculum sequence context** -- Hardcode the 13-topic Programming Foundations curriculum into the edge function's system prompt so the AI understands the learning progression.
2. **Topic header parsing** -- Support `Topic: Loops` headers in question input so each question carries its topic label to the AI.
3. **Scope constraint** -- Add an explicit "bruteforce only, no advanced DS&A patterns" rule to the system prompt.

## Curriculum Sequence (Hardcoded)

From your screenshots:

1. Introduction to Python
2. I/O Basics
3. Operators & Conditional Statements
4. Nested Conditions
5. Loops
6. Loop Control Statements
7. Comparing Strings & Naming Variables
8. Lists
9. Functions
10. Tuples & Sets
11. Dictionaries
12. Introduction to Object Oriented Programming
13. Miscellaneous Topics

## How Topic Headers Work

You will format your question input like this:

```
Topic: Loops

Question:
Print numbers from 1 to N.
Input: An integer N
Output: Numbers 1 to N on separate lines
Explanation: Use a for loop with range

Question:
Print even numbers from 1 to N.
...

Topic: Lists

Question:
Find the maximum element in a list.
...
```

The parser will extract the topic label and attach it to each question sent to the AI.

## What Changes

| File | What |
|------|------|
| `supabase/functions/generate-graph/index.ts` | Add curriculum sequence and scope constraint to system prompt. Accept `topicMap` (question index to topic name) in request body. Format questions with their topic labels in the user prompt. |
| `src/hooks/useBatchGeneration.ts` | Parse `Topic:` headers from question text before batching. Build a `topicMap` mapping each question's batch-local index to its topic name. Pass `topicMap` alongside each batch to the edge function. |
| `src/components/panels/QuickQuestionInput.tsx` | Update placeholder text to show `Topic:` header format. Pass raw text (including topic headers) through to the generation hook. |
| `src/components/panels/QuestionInputPanel.tsx` | Same placeholder update as QuickQuestionInput. |

## Technical Details

### Parsing Logic (useBatchGeneration)

Before splitting into batches, parse topic headers:

```typescript
function parseTopicHeaders(questions: string[]): { 
  cleanQuestions: string[]; 
  topicMap: Record<number, string>;  // index -> topic name
} {
  let currentTopic = "General";
  const cleanQuestions: string[] = [];
  const topicMap: Record<number, string> = {};

  for (const q of questions) {
    const topicMatch = q.match(/^Topic\s*:\s*(.+)/im);
    if (topicMatch) {
      currentTopic = topicMatch[1].trim();
      // Remove the Topic: line from the question text
      const cleaned = q.replace(/^Topic\s*:.+\n?/im, '').trim();
      if (cleaned) {
        topicMap[cleanQuestions.length] = currentTopic;
        cleanQuestions.push(cleaned);
      }
    } else {
      topicMap[cleanQuestions.length] = currentTopic;
      cleanQuestions.push(q);
    }
  }
  return { cleanQuestions, topicMap };
}
```

When creating batches, the topic map indices are re-mapped to batch-local indices (0, 1, 2...) and sent to the edge function.

### Edge Function Prompt Changes

**System prompt additions** (appended before the output format section):

```
=== PROGRAMMING FOUNDATIONS SCOPE CONSTRAINT ===

This is a Programming Foundations course. Students solve problems using 
bruteforce methods ONLY. Do NOT create skills for advanced algorithmic 
patterns: Sliding Window, Two Pointers, Greedy Algorithm, Dynamic 
Programming, Kadane's Algorithm, Divide and Conquer, Binary Search 
optimization, Backtracking, Graph Algorithms, or Trie structures.

If a problem could be solved with an advanced pattern, map it to the 
fundamental bruteforce skills (e.g., nested_iteration, accumulator_pattern, 
search_pattern, filter_pattern).

=== CURRICULUM SEQUENCE ===

Topics are taught in this order. Use this to inform prerequisite edges -- 
skills from earlier topics should generally be prerequisites for skills 
in later topics:

1. Introduction to Python
2. I/O Basics
3. Operators & Conditional Statements
4. Nested Conditions
5. Loops
6. Loop Control Statements
7. Comparing Strings & Naming Variables
8. Lists
9. Functions
10. Tuples & Sets
11. Dictionaries
12. Introduction to Object Oriented Programming
13. Miscellaneous Topics
```

**User prompt enhancement** -- when `topicMap` is provided, questions are formatted with their topic:

```
Questions to analyze:

--- Topic: Loops (Position 5 in curriculum) ---
1. Print numbers from 1 to N.
   Input: An integer N
   Output: Numbers 1 to N
   Explanation: Use a for loop

--- Topic: Lists (Position 8 in curriculum) ---
2. Find the maximum element in a list.
   ...
```

### Backward Compatibility

- If no `Topic:` headers are present in input, all questions default to topic "General"
- If no `topicMap` is sent to the edge function, behavior is identical to current
- The curriculum sequence is always included in the system prompt (since the only active use case is Programming Foundations)

### UI Changes

- Landing page placeholder updated to show one `Topic:` header example
- Collapsible "Add More Questions" placeholder also shows `Topic:` format
- No new input fields needed -- topic info goes directly in the question text area

