

# Fix: Rebalance Edge Generation -- Too Conservative to Properly Connected

## Problem

The prompt currently says "Do NOT create prerequisite edges BETWEEN foundational-tier skills" which the AI interprets as "avoid edges between anything at level 0." Combined with Topics 1-2 questions (which are mostly foundational), this results in nearly zero edges and a flat graph.

Additionally, `loop_iteration` and `accumulator_pattern` appear for simple repetition problems (e.g., "print Hello three times") because the AI maps repetition to loops instead of brute-force repeated statements.

## Changes

### File: `supabase/functions/generate-graph/index.ts`

**1. Rewrite the Phase 4 prerequisite guidance (lines 178-202)**

Replace the overly restrictive Foundational Tier Rule with a balanced version that:
- Keeps the cognitive dependency test (not execution order)
- Provides a comprehensive list of CORRECT edges the AI should create
- Narrows the foundational independence rule to only truly independent concepts
- Adds a "MINIMUM CONNECTIVITY" instruction so the AI doesn't under-connect

New text:

```
PREREQUISITE means COGNITIVE DEPENDENCY, not execution order:
- Ask: "Can a student LEARN skill B without ever having been taught skill A?"
- If YES -> no edge needed  
- If NO -> add edge A -> B

CORRECT prerequisite edges (USE THESE as reference):
- variable_assignment -> basic_input (input() requires storing the result)
- variable_assignment -> type_conversion (you convert values stored in variables)
- variable_assignment -> string_concatenation (you concatenate values in variables)
- type_recognition -> type_conversion (must recognize types before converting)
- arithmetic_operations -> comparison_operators (comparisons often involve computed values)
- comparison_operators -> conditional_branching (conditions use comparisons)
- conditional_branching -> nested_conditions (nesting requires understanding single conditions)
- variable_assignment -> loop_iteration (loops operate on variables)
- loop_iteration -> accumulator_pattern (accumulating requires looping)
- loop_iteration -> search_pattern (searching requires iterating)
- string_indexing -> string_slicing (slicing builds on indexing concepts)
- conditional_branching -> filter_pattern (filtering requires if/else)

WRONG edges (execution order, not learning dependency):
- string_concatenation -> basic_output (you don't need concat to learn print())
- basic_output -> variable_assignment (you don't need print to learn x = 5)
- arithmetic_operations -> basic_output (you don't need math to learn print())

INDEPENDENCE RULE: These specific foundational skills are independent 
entry points and should NOT require each other as prerequisites:
  variable_assignment, basic_output, arithmetic_operations, type_recognition
However, skills that BUILD on these foundations (like basic_input, 
type_conversion, string_concatenation) SHOULD have appropriate prerequisite 
edges pointing back to the foundational skills they depend on.

MINIMUM CONNECTIVITY: Every non-foundational node MUST have at least 
one incoming prerequisite edge. If a skill has no prerequisites, it 
should be at level 0 (foundational). Aim for 1.5-2.5 edges per node.
```

**2. Strengthen the brute-force constraint (lines 357-367)**

Add explicit guidance about simple repetition not requiring loops:

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

REPETITION WITHOUT LOOPS: If a problem asks to repeat an action a small 
fixed number of times (e.g., "print Hello 3 times"), and the question 
belongs to a topic BEFORE "Loops" (Topic 5) in the curriculum, map it 
to basic_output (repeated print statements), NOT to loop_iteration. 
Only use loop_iteration when the question is FROM Topic 5 or later, 
OR when the repetition count is variable/large.
```

**3. Adjust the target metrics (line 322)**

Change the edge density validation from a pass/fail check to guidance:

```
5. Edge Density: Aim for 1.5-2.5 edges per node. Every non-foundational 
   node should have at least one incoming edge.
```

### File: `src/lib/graph/mergeGraphs.ts`

No changes needed -- the merge pipeline (transitive reduction, cycle breaking, orphan cleanup, level recomputation) is already correct. The issue is purely in what the AI generates, not how we post-process it.

## Summary

| File | Change |
|------|--------|
| `supabase/functions/generate-graph/index.ts` | Rewrite Phase 4 edge guidance with explicit correct-edge examples and minimum connectivity rule. Strengthen brute-force constraint to prevent loop_iteration in pre-loop topics. |

## Expected Result

- Topics 1-2 questions produce a connected graph: `variable_assignment -> basic_input -> type_conversion`, `type_recognition -> type_conversion`, etc.
- Foundational skills (variable_assignment, basic_output, arithmetic_operations, type_recognition) remain at level 0 with no edges between them
- Skills that build on foundations (basic_input, string_concatenation, type_conversion) get proper incoming edges
- No `loop_iteration` or `accumulator_pattern` for pre-Topic-5 simple repetition questions
- Edge density reaches the 1.5-2.5 target instead of near-zero

