

# Fix: AI Fabricating Question IDs (The Real Root Cause)

## The Problem

Both regeneration functions have been failing silently due to the same bug: **the AI model is inventing new UUIDs** instead of echoing back the real question IDs.

Evidence:
- Console logs show "DB update OK" for IDs like `72dbf2be-5f92-464c-bf47-d429fe1a8210`
- **None of these IDs exist in the database** (confirmed: 0 matches out of 14 tested)
- Supabase's `.update().eq('id', nonExistentId)` returns no error -- it silently updates 0 rows
- The hook interprets "no error" as success, so it reports "951 succeeded, 0 failed"

This explains why:
- Weights: Only 269/951 questions have values (from original graph generation, not regeneration)
- Difficulty: 0/1044 questions have values (every regeneration attempt was writing to phantom IDs)

## The Fix

Stop trusting the AI to return correct UUIDs. Instead, use **numeric indices** as keys, then map them back to real IDs.

### 1. Update `regenerate-weights` edge function

Change the prompt from:
```text
1. ID: 3bc578dc-f3ac-45ea-8556-f15d2f410a75
   Question: Given N, print two number triangles.
   Skills: [input_parsing, nested_iteration]
```

To:
```text
1. Question: Given N, print two number triangles.
   Skills: [input_parsing, nested_iteration]
```

And ask the AI to return results with numeric keys (`"1"`, `"2"`, etc.). After parsing, remap numeric keys back to real UUIDs using the input array order.

### 2. Update `analyze-difficulty` edge function

Apply the same numeric index pattern. Remove UUID exposure from the prompt entirely.

### 3. Add ID validation in both hooks

After receiving results from the edge function, verify that returned IDs actually exist in the question set. Log warnings for any mismatches so issues are immediately visible.

### 4. Add row-count verification in DB updates

Change the update pattern from:
```typescript
// Current: silent failure on 0-row updates
supabase.from('questions').update({...}).eq('id', questionId)
  .then(({ error }) => {
    if (error) return false;  // Only catches DB errors, not "0 rows matched"
    return true;
  })
```

To:
```typescript
// Fixed: verify the row was actually updated
supabase.from('questions').update({...}).eq('id', questionId).select('id')
  .then(({ data, error }) => {
    if (error) return false;
    if (!data || data.length === 0) {
      console.error(`ID ${questionId} not found in DB`);
      return false;
    }
    return true;
  })
```

## Files to Change

| File | Changes |
|------|---------|
| `supabase/functions/regenerate-weights/index.ts` | Use numeric indices in prompt, remap results back to real UUIDs |
| `supabase/functions/analyze-difficulty/index.ts` | Use numeric indices in prompt, remap results back to real UUIDs |
| `src/hooks/useRegenerateWeights.ts` | Add ID validation, use `.select('id')` to verify updates |
| `src/hooks/useRegenerateDifficulty.ts` | Add ID validation, use `.select('id')` to verify updates |

Both edge functions will be redeployed after changes.

## Why This Will Work

- Numeric indices ("1", "2", "3") are trivial for the AI to echo back correctly -- unlike 36-character UUIDs
- The edge function handles the mapping, so the hook receives data with correct real IDs
- The `.select('id')` check catches any remaining mismatches at the DB level
- This is the same approach used by production AI pipelines that need deterministic key mapping

## After Implementation

1. Run "Regenerate Weights" -- all 951 questions should get `skill_weights` populated
2. Run "Regenerate Difficulty" -- all 951 questions should get difficulty scores
3. Both operations should complete in under 5 minutes with the existing parallel batch updates

