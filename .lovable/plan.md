

# Fix: Orphan Cleanup Destroys Injected Edges + Missing Mandatory Edge

## What's Wrong (Confirmed)

Two bugs are causing nodes to appear without prerequisites:

1. **Orphan cleanup wipes all injected edges** -- Line 1062 of the edge function builds its node ID set from `graphData.globalNodes` only. In incremental mode, the AI returns 0 new nodes, so this set is empty. Every injected mandatory edge gets deleted because both endpoints are "missing."

2. **`loop_iteration -> nested_iteration` is missing** from MANDATORY_EDGES in both files, so `nested_iteration` never gets connected.

## What Will Be Fixed

### File 1: `supabase/functions/generate-graph/index.ts`

**Change A** -- Add missing mandatory edge to the MANDATORY_EDGES array:
```
{ from: 'loop_iteration', to: 'nested_iteration', reason: 'nested loops require understanding single loops' }
```

**Change B** -- Fix orphan cleanup (line 1061-1062) to include existing nodes:
```typescript
// BEFORE (broken):
const nodeIds = new Set(graphData.globalNodes.map((n) => n.id));

// AFTER (fixed):
const nodeIds = new Set(graphData.globalNodes.map((n) => n.id));
if (existingNodes) {
  for (const en of existingNodes) nodeIds.add(en.id);
}
```

### File 2: `src/lib/graph/mergeGraphs.ts`

**Change A** -- Add missing mandatory edge to the MANDATORY_EDGES array:
```
{ from: 'loop_iteration', to: 'nested_iteration', reason: 'nested loops require understanding single loops' }
```

## Why This Will Work (No More Regeneration Needed)

The current pipeline is:
```text
Inject 14 edges -> Orphan cleanup sees 0 nodes -> Deletes all 14 edges -> 0 edges remain
```

After the fix:
```text
Inject 15 edges -> Orphan cleanup sees ALL nodes (new + existing) -> Keeps all 15 edges -> Levels computed correctly
```

Additionally, the client-side `mergeGraphs.ts` acts as a second safety net: even if the edge function somehow misses an edge, the client will inject it when merging the full graph.

## Will I Need to Regenerate?

After these fixes, you will need to regenerate the "New PF" graph **one last time**. But this time:
- All mandatory edges will survive the pipeline (no more orphan cleanup bug)
- `nested_iteration` will be at Level 2+ (below `loop_iteration`)
- No nodes will be isolated if they have a mandatory prerequisite defined
- Both server and client enforce the same rules as a double safety net

