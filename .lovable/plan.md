

# Fix Regeneration: Deploy Missing Function and Improve Reliability

## Problem Summary

Two issues are preventing skill weights and difficulty values from being populated:

1. The "Regenerate Weights" backend function is NOT deployed (returns a "not found" error). This is why all `skill_weights` are empty.
2. The "Regenerate Difficulty" function works correctly when called directly, but the frontend process that runs it (processing 951 questions in 64 batches, then updating them one-by-one) is unreliable -- it either errors out or gets interrupted before completing all database updates.

## Current Database State

| Metric | Count |
|--------|-------|
| Total questions | 951 |
| Questions with skill_weights | 269 (from a previous partial run) |
| Questions with difficulty scores | 0 |

## Fixes

### 1. Redeploy Both Backend Functions

The `regenerate-weights` function exists in code but was never deployed. Both functions will be redeployed to ensure they are live:
- `regenerate-weights` -- currently returning "not found"
- `analyze-difficulty` -- redeployed for consistency

### 2. Add Batch Database Updates

Instead of updating questions one at a time (951 individual calls), update them in parallel batches of 10. This reduces the update phase from ~5 minutes to ~30 seconds and makes it far less likely to be interrupted.

**Before (sequential):**
```text
Update question 1 -> wait -> Update question 2 -> wait -> ... -> Update question 951
Total: ~5 minutes
```

**After (parallel batches of 10):**
```text
Update questions 1-10 simultaneously -> Update questions 11-20 simultaneously -> ...
Total: ~30 seconds
```

### 3. Add Verbose Console Logging

Both hooks will log:
- Number of questions loaded
- Each batch sent and received
- Number of results returned per batch
- Each database update success/failure
- Final summary of what was updated

This makes it easy to diagnose any remaining issues by checking the browser console.

### 4. Attach Missing Validation Trigger

The database migration created a validation function but the trigger was never attached. A new migration will attach it so that invalid difficulty scores are caught at the database level.

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useRegenerateWeights.ts` | Add batch DB updates, verbose logging, batch-level error handling |
| `src/hooks/useRegenerateDifficulty.ts` | Add batch DB updates, verbose logging |
| Database migration | Attach the validation trigger if missing |

Both edge functions will also be redeployed.

## After Implementation

1. Load the Programming Foundations graph
2. Click "Weights" to regenerate skill weights for all 951 questions
3. Click "Difficulty" to analyze difficulty for all 951 questions
4. Verify in the database that values are populated
