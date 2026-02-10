

# Fix: Add Mandatory Edge Injection to Client-Side Merge

## Problem
The mandatory edge injection only exists in the edge function, which sees zero nodes in incremental mode. The client-side `mergeGraphs.ts` has the full node set but never injects mandatory edges -- so string nodes stay at Level 0.

## Solution (2 small changes)

### 1. `src/lib/graph/mergeGraphs.ts` -- Add mandatory edge injection

Add the `MANDATORY_EDGES` list and `injectMandatoryEdges()` function, then call it after semantic dedup (line 367) and before transitive reduction (line 369).

```typescript
const MANDATORY_EDGES: Array<{from: string; to: string; reason: string}> = [
  { from: 'variable_assignment', to: 'basic_input', reason: 'input() requires storing result' },
  { from: 'variable_assignment', to: 'type_conversion', reason: 'converts values in variables' },
  { from: 'variable_assignment', to: 'string_concatenation', reason: 'concatenates values in variables' },
  { from: 'variable_assignment', to: 'string_indexing', reason: 'indexes strings in variables' },
  { from: 'variable_assignment', to: 'string_repetition', reason: 'repeats strings in variables' },
  { from: 'variable_assignment', to: 'sequence_length_retrieval', reason: 'len() on variables' },
  { from: 'type_recognition', to: 'type_conversion', reason: 'recognize before converting' },
  { from: 'arithmetic_operations', to: 'comparison_operators', reason: 'comparisons use computed values' },
  { from: 'comparison_operators', to: 'conditional_branching', reason: 'conditions use comparisons' },
  { from: 'conditional_branching', to: 'nested_conditions', reason: 'nesting requires single conditions' },
  { from: 'variable_assignment', to: 'loop_iteration', reason: 'loops operate on variables' },
  { from: 'loop_iteration', to: 'accumulator_pattern', reason: 'accumulating requires looping' },
  { from: 'loop_iteration', to: 'search_pattern', reason: 'searching requires iterating' },
  { from: 'string_indexing', to: 'string_slicing', reason: 'slicing builds on indexing' },
  { from: 'conditional_branching', to: 'filter_pattern', reason: 'filtering requires if/else' },
  { from: 'basic_output', to: 'formatted_output', reason: 'formatting builds on basic output' },
];

function injectMandatoryEdges(nodes: GraphNode[], edges: GraphEdge[]): GraphEdge[] {
  const nodeIds = new Set(nodes.map(n => n.id));
  const edgeSet = new Set(edges.map(e => `${e.from}:${e.to}`));
  const result = [...edges];

  for (const me of MANDATORY_EDGES) {
    if (nodeIds.has(me.from) && nodeIds.has(me.to)) {
      const key = `${me.from}:${me.to}`;
      if (!edgeSet.has(key)) {
        result.push({ from: me.from, to: me.to, reason: me.reason, relationshipType: 'requires' });
        edgeSet.add(key);
        console.log(`[mergeGraphs] Injected mandatory edge: ${me.from} -> ${me.to}`);
      }
    }
  }
  return result;
}
```

Insert call at line 368 (between semantic dedup and transitive reduction):
```typescript
// Inject mandatory prerequisite edges
const withMandatory = injectMandatoryEdges(dedupResult.nodes, dedupResult.edges);

// Apply transitive reduction
const reducedEdges = transitiveReduce(withMandatory);
```

### 2. `supabase/functions/generate-graph/index.ts` -- Fix incremental mode

At line 1013-1015, combine existing nodes with new nodes so injection works in incremental mode too:

```typescript
const allNodes = [...(graphData.globalNodes || [])];
if (existingNodes) {
  for (const en of existingNodes) {
    if (!allNodes.some(n => n.id === en.id)) allNodes.push(en);
  }
}
graphData.edges = injectMandatoryEdges(allNodes, graphData.edges);
```

## Expected Result

String nodes move to Level 1 (depend on `variable_assignment`), `string_slicing` moves to Level 2 (depends on `string_indexing`). Works for both fresh generation and incremental additions.

