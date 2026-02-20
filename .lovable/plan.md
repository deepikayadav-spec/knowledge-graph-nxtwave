

# Fix: Prevent Autosave from Deleting Edges and Questions During Batch Generation

## Problem

The autosave (30-second timer) uses a destructive "delete all, then re-insert" pattern for edges and questions. When batch generation is running and fails (e.g., 429 rate limit), the autosave can fire and wipe the database:

1. Autosave deletes all edges and questions from DB
2. Re-insertion depends on the in-memory graph state
3. If the in-memory graph is in a transitional state (generation in progress or failed), edges/questions are lost permanently

This is what happened to your "LKG IO New" graph -- the autosave ran mid-generation, wiped 146 questions and all edges, and had nothing to re-insert.

## Solution: Disable Autosave During Generation

Add a simple guard that pauses autosave while batch generation is active.

### Changes

**1. `src/components/KnowledgeGraphApp.tsx`**
- Pass `progress.isProcessing` to the autosave hook's `enabled` option so autosave is disabled while generation is running

```
enabled: !!currentGraphId && !progress.isProcessing
```

**2. `src/hooks/useAutosave.ts`**
- Add a snapshot guard: skip saving if the graph has 0 edges AND 0 questions but the graph metadata shows it previously had data. This prevents the destructive "save empty state" scenario even outside of generation.

**3. `src/hooks/useGraphPersistence.ts` (saveGraph function)**
- Add a safety check: refuse to delete edges/questions from DB if the in-memory graph has fewer items than the DB. This is a last-resort guard against accidental data loss.
- Specifically: before deleting, check the DB count. If DB has 100+ edges but the in-memory graph has 0, skip the destructive save and log a warning.

### Data Recovery

Unfortunately, the deleted edges and questions for "LKG IO New" cannot be recovered from the database -- the DELETE operations already executed. You will need to re-generate the graph from the original questions.

## Technical Details

The key change is in `KnowledgeGraphApp.tsx` line ~133-135:

```typescript
// Before (autosave runs even during generation)
enabled: !!currentGraphId

// After (autosave paused during generation)  
enabled: !!currentGraphId && !progress.isProcessing
```

And a safety guard in `useGraphPersistence.ts` saveGraph (around line 96):

```typescript
// Before deleting edges/questions, verify we're not about to lose data
if (graph.edges.length === 0 && graph.globalNodes.length > 0) {
  const { count } = await supabase
    .from('skill_edges')
    .select('*', { count: 'exact', head: true })
    .eq('graph_id', existingId);
  if (count && count > 0) {
    console.warn('[saveGraph] Refusing to delete edges: DB has data but in-memory is empty');
    // Skip edge deletion -- preserve DB state
  }
}
```

This two-layer approach (disable during generation + safety guard) ensures data can never be accidentally wiped again.

