

# Fix: Force AI to Actually Follow Edge Connectivity Rules

## Problem

Despite explicit CORRECT edge examples and a MINIMUM CONNECTIVITY rule in the prompt, the AI generates only 2 edges for 11 nodes (density 0.18 vs target 1.5-2.5). String operation nodes have zero prerequisites when they clearly should depend on `variable_assignment`. The AI treats the edge examples as optional suggestions.

## Root Cause

The AI performs edge generation in a single pass and never validates its own output. There's no self-check mechanism forcing it to revisit under-connected nodes.

## Changes

### File: `supabase/functions/generate-graph/index.ts`

**1. Make the CORRECT edges mandatory, not suggestive (Phase 4 prerequisite section)**

Change the language from "USE THESE as reference" to a mandatory rule:

```
MANDATORY PREREQUISITE EDGES -- You MUST include these edges whenever 
both the source and target nodes exist in your output:
- variable_assignment -> basic_input
- variable_assignment -> type_conversion
- variable_assignment -> string_concatenation
- variable_assignment -> string_indexing
- variable_assignment -> string_repetition
- variable_assignment -> sequence_length_retrieval
- type_recognition -> type_conversion
- arithmetic_operations -> comparison_operators
- comparison_operators -> conditional_branching
- conditional_branching -> nested_conditions
- variable_assignment -> loop_iteration
- loop_iteration -> accumulator_pattern
- loop_iteration -> search_pattern
- string_indexing -> string_slicing
- conditional_branching -> filter_pattern
- basic_output -> formatted_output (if formatted_output exists)

If both nodes in a pair above appear in your output, the edge MUST 
be present. Omitting it is an error.
```

**2. Add a self-validation step to the output format instructions**

After the JSON output format section, add a SELF-CHECK instruction that forces the AI to verify connectivity before finalizing:

```
SELF-CHECK BEFORE RETURNING (mandatory):
1. Count your edges and nodes. Compute edges/nodes ratio.
   If ratio < 1.5, you are UNDER-CONNECTED. Go back and add 
   missing edges from the MANDATORY list above.
2. List every node with zero incoming edges. Each one MUST be 
   one of these foundational skills: variable_assignment, basic_output, 
   arithmetic_operations, type_recognition.
   If any non-foundational node has zero incoming edges, add the 
   appropriate prerequisite edge.
3. Verify every MANDATORY edge pair: if both nodes exist, the 
   edge must exist.
```

**3. Add post-processing enforcement in the edge function code**

After parsing the AI response, programmatically inject any missing mandatory edges. This acts as a safety net in case the AI still misses some:

```typescript
const MANDATORY_EDGES: Array<{from: string; to: string; reason: string}> = [
  { from: 'variable_assignment', to: 'basic_input', reason: 'input() requires storing the result in a variable' },
  { from: 'variable_assignment', to: 'type_conversion', reason: 'type conversion operates on values stored in variables' },
  { from: 'variable_assignment', to: 'string_concatenation', reason: 'concatenation operates on values in variables' },
  { from: 'variable_assignment', to: 'string_indexing', reason: 'indexing requires a string stored in a variable' },
  { from: 'variable_assignment', to: 'string_repetition', reason: 'repetition operates on strings in variables' },
  { from: 'variable_assignment', to: 'sequence_length_retrieval', reason: 'len() operates on values stored in variables' },
  { from: 'type_recognition', to: 'type_conversion', reason: 'must recognize types before converting between them' },
  { from: 'arithmetic_operations', to: 'comparison_operators', reason: 'comparisons often involve computed values' },
  { from: 'comparison_operators', to: 'conditional_branching', reason: 'conditions use comparison operators' },
  { from: 'conditional_branching', to: 'nested_conditions', reason: 'nesting requires understanding single conditions' },
  { from: 'variable_assignment', to: 'loop_iteration', reason: 'loops operate on variables' },
  { from: 'loop_iteration', to: 'accumulator_pattern', reason: 'accumulating requires looping' },
  { from: 'loop_iteration', to: 'search_pattern', reason: 'searching requires iterating' },
  { from: 'string_indexing', to: 'string_slicing', reason: 'slicing builds on indexing concepts' },
  { from: 'conditional_branching', to: 'filter_pattern', reason: 'filtering requires if/else logic' },
];

function injectMandatoryEdges(nodes, edges) {
  const nodeIds = new Set(nodes.map(n => n.id));
  const edgeSet = new Set(edges.map(e => `${e.from}->${e.to}`));
  
  for (const me of MANDATORY_EDGES) {
    if (nodeIds.has(me.from) && nodeIds.has(me.to)) {
      const key = `${me.from}->${me.to}`;
      if (!edgeSet.has(key)) {
        edges.push({ from: me.from, to: me.to, reason: me.reason, relationshipType: 'requires' });
        edgeSet.add(key);
      }
    }
  }
  return edges;
}
```

This function runs right after JSON parsing, before transitive reduction / cycle breaking / level recomputation.

### Processing Pipeline Update

```
AI Response -> Parse JSON -> INJECT MANDATORY EDGES (new) -> Strip Bidirectional -> Transitive Reduce -> Cycle Break -> Orphan Cleanup -> Recompute Levels -> Return
```

## Expected Result

For the current 11-node graph, injecting mandatory edges would add:
- variable_assignment -> string_concatenation
- variable_assignment -> string_indexing
- variable_assignment -> string_repetition
- variable_assignment -> sequence_length_retrieval
- string_indexing -> string_slicing

Combined with existing 2 edges, that's 7 edges (density ~0.64). The AI self-check should also produce additional edges beyond the mandatory list, pushing toward the 1.5 target.

String nodes would move to level 1 (depending on variable_assignment), and string_slicing to level 2 (depending on string_indexing at level 1). The graph would show a proper learning progression instead of a flat level-0 cluster.

## File Summary

| File | Change |
|------|--------|
| `supabase/functions/generate-graph/index.ts` | Change "reference" edges to MANDATORY. Add self-validation step to prompt. Add `injectMandatoryEdges()` post-processing function. Update pipeline order. |

