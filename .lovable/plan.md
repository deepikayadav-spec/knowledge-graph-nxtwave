

# Fix: No Premature Skill Nodes + Enforce Transitive Reduction

## Problem 1: Skills appearing before their topic is introduced

The reference skill catalog lists `loop_iteration`, `dictionary_operations`, `function_calls`, etc. unconditionally. The AI sees this catalog and creates these nodes even when the input questions (e.g., Topics 1-3) don't require them. The prompt says "map to these first," which the AI interprets as "include them."

**Fix**: Add an explicit instruction to the system prompt: "Only create nodes for skills that are ACTUALLY REQUIRED by the given questions. The catalog is for naming consistency, not for pre-populating the graph."

Additionally, add a curriculum-aware constraint: "If a question is tagged with a topic (e.g., Topic 3: Operators), do NOT create skill nodes from topics that come LATER in the curriculum sequence (e.g., no loop_iteration for a Topic 3 question)."

## Problem 2: Redundant transitive edges (Type Recognition -> Arithmetic Operations)

The prompt already instructs "If A -> B and B -> C, do NOT add direct A -> C" (line 178), but the AI doesn't reliably follow this. In your example: Type Recognition -> Variable Assignment -> Arithmetic Operations, so the direct Type Recognition -> Arithmetic Operations edge is redundant.

**Fix**: Add a programmatic transitive reduction step as post-processing -- both in the edge function (for each batch) and in `mergeGraphs.ts` (after merging batches). This algorithmically removes any edge A -> C where a path A -> ... -> C already exists through intermediate nodes.

## Changes

### File: `supabase/functions/generate-graph/index.ts`

1. **Update system prompt** (around line 41-78, the catalog section): Add this clarification after "ONLY create a new skill if NONE of the above apply":

```
IMPORTANT: The catalog is for NAMING CONSISTENCY only. Do NOT create nodes 
for skills that are not required by the given questions. If no question 
requires loop_iteration, do NOT include it in the output.

CURRICULUM AWARENESS: When questions are tagged with a topic, do NOT 
create skill nodes from topics that come LATER in the curriculum. 
For example, if all questions are from "Operators & Conditional Statements" 
(Topic 3), do NOT create loop_iteration (Topic 5) or function_calls (Topic 9).
```

2. **Add transitive reduction post-processing** (after the existing cycle-stripping code, around line 747): After filtering bidirectional edges, apply transitive reduction:

```typescript
// Transitive reduction: remove edge A->C if path A->...->C exists
function transitiveReduce(nodes, edges) {
  // Build adjacency list
  // For each edge A->C, check if there's an alternative path A->...->C
  // via BFS/DFS excluding the direct edge
  // If yes, remove the direct edge
}
```

### File: `src/lib/graph/mergeGraphs.ts`

3. **Add transitive reduction after merge**: After `deduplicateSemanticDuplicates` returns, apply the same transitive reduction algorithm to strip any redundant edges that appeared across batches.

A new utility function `transitiveReduce(edges)` will be created that:
- Builds an adjacency map from the edge list
- For each edge A -> C, temporarily removes it and checks if C is still reachable from A
- If reachable (meaning an indirect path exists), the edge is redundant and gets removed
- Returns the reduced edge list

## Technical Detail: Transitive Reduction Algorithm

```text
For each edge (A -> C):
  1. Build adjacency list from all edges
  2. Remove edge A -> C temporarily  
  3. BFS/DFS from A: can we still reach C?
  4. If YES -> edge is redundant, drop it
  5. If NO -> edge is necessary, keep it
```

This runs in O(E * (V + E)) which is fine for graphs with fewer than 1000 nodes.

## Summary

| File | Change |
|------|--------|
| `supabase/functions/generate-graph/index.ts` | Add "catalog is for naming only" + "respect curriculum order" instructions to prompt. Add transitive reduction post-processing after cycle stripping. |
| `src/lib/graph/mergeGraphs.ts` | Add transitive reduction as final step after semantic deduplication. |

## Expected Result

- Questions from Topics 1-3 will no longer generate `loop_iteration`, `function_calls`, or other later-topic nodes
- Redundant edges like Type Recognition -> Arithmetic Operations (when path exists via Variable Assignment) will be automatically removed
- The graph will be cleaner and flatter, with only necessary prerequisite edges

