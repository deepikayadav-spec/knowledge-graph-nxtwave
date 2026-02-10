

# Fix: Enforce True DAG + Correct Edge Semantics + Close Remaining Gaps

## What's Already Done (no changes needed)

- Bidirectional edge prevention (both mergeGraphs.ts and edge function)
- Transitive reduction algorithm (both files)
- Catalog naming consistency + curriculum awareness in prompt
- Recursion added as Topic 10

## What's Still Missing (5 changes)

### 1. Cognitive Prerequisite Semantics in Prompt

**File:** `supabase/functions/generate-graph/index.ts` (Phase 4 section, lines 178-195)

Replace the current prerequisite guidance with explicit RIGHT/WRONG examples:

```
PREREQUISITE means COGNITIVE DEPENDENCY, not execution order:
- Ask: "Can a student LEARN skill B without ever having been taught skill A?"
- If YES -> no edge needed
- If NO -> add edge A -> B

WRONG edges (execution order, not learning dependency):
- string_concatenation -> basic_output (you don't need concat to learn print())
- basic_output -> variable_assignment (you don't need print to learn x = 5)

RIGHT edges (true cognitive dependencies):
- variable_assignment -> basic_input (input() is useless without storing the result)
- string_indexing -> string_slicing (slicing syntax builds on indexing concepts)

FOUNDATIONAL TIER RULE: Foundational skills (variable_assignment, basic_output,
arithmetic_operations, type_recognition) are independent entry points. Do NOT
create prerequisite edges BETWEEN foundational-tier skills unless one genuinely
cannot be UNDERSTOOD without the other.
```

### 2. Long-Path Cycle Breaking (Kahn's Algorithm)

**Files:** `supabase/functions/generate-graph/index.ts` AND `src/lib/graph/mergeGraphs.ts`

Add a `breakCycles` function that runs AFTER transitive reduction. This catches cycles like A -> B -> C -> A that bidirectional checks miss.

Algorithm (Kahn's topological sort):
1. Count in-degrees for all nodes referenced in edges
2. Queue all nodes with in-degree 0
3. Process queue: for each node, decrement in-degree of neighbors
4. Any edges involving unprocessed nodes form cycles
5. Remove cycle-forming edges (prefer removing edges between same-tier nodes, e.g., foundational -> foundational)
6. Repeat until no cycles remain

### 3. Orphan Edge Cleanup

**Files:** Both `generate-graph/index.ts` and `mergeGraphs.ts`

After all edge processing, filter out any edge where `from` or `to` references a node ID that doesn't exist in the final node list. Currently, if the AI hallucinates a node ID or semantic dedup removes a node, its edges silently remain as dangling references.

```typescript
const nodeIds = new Set(nodes.map(n => n.id));
edges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
```

### 4. Level Recomputation

**Files:** Both `generate-graph/index.ts` and `mergeGraphs.ts`

After cycle breaking and edge cleanup, recompute node levels from the final edge set rather than trusting the AI-assigned levels. The AI's levels become stale after edges are removed.

```typescript
function recomputeLevels(nodes, edges) {
  // Build adjacency and compute level = 1 + max(level of prerequisites)
  // Nodes with no incoming edges get level 0
  // Topological order traversal to assign levels
}
```

### 5. Question Path Validation

**File:** `mergeGraphs.ts`

After all processing, validate that every node ID referenced in `questionPaths` actually exists in the final node list. Remove references to deleted/merged nodes that weren't caught by the ID remapping.

## Processing Pipeline (Final Order)

```text
Edge Function (per batch):
  AI Response -> Parse JSON -> Strip Bidirectional -> Transitive Reduce -> Cycle Break -> Orphan Cleanup -> Recompute Levels -> Return

mergeGraphs (across batches):
  Merge Nodes -> Merge Edges (bidirectional check) -> Semantic Dedupe -> Transitive Reduce -> Cycle Break -> Orphan Cleanup -> Recompute Levels -> Validate Paths -> Return
```

## File Change Summary

| File | Changes |
|------|---------|
| `supabase/functions/generate-graph/index.ts` | Update Phase 4 prompt with cognitive dependency examples + foundational tier rule. Add `breakCycles()`, orphan edge cleanup, and `recomputeLevels()` post-processing. |
| `src/lib/graph/mergeGraphs.ts` | Add `breakCycles()`, orphan edge cleanup, `recomputeLevels()`, and question path validation after transitive reduction. |

## Expected Result

- No cycles of any length (guaranteed by Kahn's algorithm)
- Foundational skills stay independent at level 0
- Edges represent "you must understand A to learn B", not "A runs before B in code"
- No dangling edge references to non-existent nodes
- Node levels always match the actual prerequisite structure
- Clean, minimal DAG that reads as a logical learning progression

