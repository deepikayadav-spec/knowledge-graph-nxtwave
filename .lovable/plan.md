

# Fix: Prevent Bidirectional Edges (Cycles) in Graph

## Problem

The merge logic in `mergeGraphs.ts` only prevents:
- Self-loops (`from !== to`)
- Exact duplicate edges (same `from:to` key)

But it does **not** prevent **bidirectional edges** -- if the AI generates both A->B and B->A, they have different keys (`A:B` vs `B:A`) and both pass through. This creates a cycle, violating the DAG constraint and causing the "loop edges" you see in the graph.

## Solution

Add a bidirectional edge check in two places:

1. **`mergeGraphs.ts`** -- During both the initial edge merge and the semantic dedup remapping, check if the reverse edge already exists before adding.
2. **`generate-graph/index.ts`** (edge function) -- Add a post-processing step to strip any cycles from the AI response before returning.

## Changes

### File: `src/lib/graph/mergeGraphs.ts`

**In `deduplicateSemanticDuplicates` function (edge remapping section, ~line 121-131):**

Add a reverse-edge check:

```typescript
for (const edge of edges) {
  const from = idMapping.get(edge.from) || edge.from;
  const to = idMapping.get(edge.to) || edge.to;
  const key = `${from}:${to}`;
  const reverseKey = `${to}:${from}`;  // NEW

  // Avoid self-loops, duplicates, AND bidirectional cycles
  if (!edgeSet.has(key) && !edgeSet.has(reverseKey) && from !== to) {
    edgeSet.add(key);
    remappedEdges.push({ ...edge, from, to });
  }
}
```

**In main `mergeGraphs` function (initial edge merge, ~line 175-181):**

Same reverse-key check:

```typescript
for (const edge of graph.edges) {
  const key = `${edge.from}:${edge.to}`;
  const reverseKey = `${edge.to}:${edge.from}`;  // NEW
  if (!edgeSet.has(key) && !edgeSet.has(reverseKey)) {
    edgeSet.add(key);
    edges.push(edge);
  }
}
```

### File: `supabase/functions/generate-graph/index.ts`

Add a post-processing step after parsing the AI response to strip any bidirectional edges. The first edge encountered wins; its reverse is dropped.

### Also: Add "Recursion" as Topic 10

Update the `CURRICULUM_TOPICS` array and system prompt to include Recursion after Functions, making 14 topics total.

## Summary of Changes

| File | Change |
|------|--------|
| `src/lib/graph/mergeGraphs.ts` | Add reverse-edge (`B:A`) check in two edge dedup loops |
| `supabase/functions/generate-graph/index.ts` | Add post-processing cycle removal + add "Recursion" as topic 10 |

## Why This Fixes It

When the AI generates edges like `loop_iteration -> accumulator_pattern` and `accumulator_pattern -> loop_iteration` across different batches, the merge currently keeps both. With the reverse-key check, the first one wins and the second is silently dropped, preserving the DAG structure.
