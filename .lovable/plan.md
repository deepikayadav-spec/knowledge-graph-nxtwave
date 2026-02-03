

# Fix: Question Count Not Updating After Adding Questions

## Problem Identified

After analyzing the code flow and network requests, I found two related issues:

### Issue 1: React Query Cache Not Invalidated
When questions are successfully generated and merged, the `savedGraphs` list (which shows `total_questions` in the graph manager) is not refreshed. The autosave eventually updates the database, but the UI displays stale data until the page is manually refreshed.

### Issue 2: Stats Not Refreshing from Database
The header shows `{stats?.totalQuestions} questions` which calculates from the in-memory `graph.questionPaths`. While this updates correctly after generation, if the user:
1. Generates questions
2. The generation succeeds
3. Autosave triggers (after 30 seconds)
4. The saved graphs list doesn't refresh

The `savedGraphs` metadata (showing in GraphManagerPanel) will be stale.

## Root Cause

Looking at `useBatchGeneration.ts`:
- After successful generation, `onGraphUpdate(partialGraph)` is called (line 379)
- This updates the in-memory `graph` state
- The `stats` memo recalculates from `graph.questionPaths`
- **BUT** there is no call to `fetchGraphs()` to refresh the saved graphs list

## Solution

### Step 1: Add callback to refresh saved graphs after generation completes

Modify `useBatchGeneration` to accept an optional `onGenerationComplete` callback that `KnowledgeGraphApp` can use to trigger `fetchGraphs()`.

**File: `src/hooks/useBatchGeneration.ts`**

```typescript
export function useBatchGeneration(
  existingGraph: KnowledgeGraph | null,
  onGraphUpdate: (graph: KnowledgeGraph) => void,
  onGenerationComplete?: () => void  // NEW: callback after all batches complete
) {
  // ... existing code ...
  
  // After line 418 (toast success):
  onGenerationComplete?.();  // Trigger refresh of saved graphs
}
```

### Step 2: Pass `fetchGraphs` as the completion callback

**File: `src/components/KnowledgeGraphApp.tsx`**

```typescript
const {
  generate,
  abort,
  resume,
  progress,
  hasCheckpoint,
  clearCheckpoint,
} = useBatchGeneration(graph, handleGraphUpdate, fetchGraphs);  // Add fetchGraphs as 3rd argument
```

This ensures that after generation completes, the saved graphs list is refreshed from the database, showing the updated `total_questions` count.

### Step 3: Trigger save after generation (optional enhancement)

Instead of waiting 30 seconds for autosave, trigger an immediate save after generation completes:

```typescript
// In useBatchGeneration, after successful completion
onGraphUpdate(partialGraph);
onGenerationComplete?.();  // This refreshes the saved graphs list
```

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useBatchGeneration.ts` | Add `onGenerationComplete` callback parameter and call it after successful generation |
| `src/components/KnowledgeGraphApp.tsx` | Pass `fetchGraphs` as the completion callback |

## Expected Behavior After Fix

| User Action | Before Fix | After Fix |
|-------------|------------|-----------|
| Add questions and generate | Header shows updated count but saved graphs list is stale | Both update immediately |
| View graph manager dropdown | Shows old question count until page refresh | Shows accurate count after generation |

## Summary

The fix adds a callback mechanism to refresh the saved graphs metadata from the database after generation completes. This ensures the question count displayed in the UI stays synchronized with the actual database state.

