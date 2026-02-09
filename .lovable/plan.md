

# Fix Skill Weights Not Updating

## What's Happening

The difficulty regeneration worked perfectly (all 951 questions updated), but skill weights are only populated for 269 out of 951 questions.

The root cause: the "Regenerate Weights" backend function was only deployed moments ago in the previous conversation. Any prior attempts to regenerate weights would have silently failed because the function didn't exist yet. The 269 questions that do have weights likely got them during the original graph generation, not from regeneration.

I verified the function works correctly by calling it directly -- it returns proper data in the expected format. The hook code also looks correct. The remaining issue is that weights regeneration needs to be run again now that the function is actually deployed.

## What I Will Fix

To make sure this works reliably and we can diagnose any issues:

### 1. Add a version marker to the regenerate-weights function

Add a `_version` field to the response so we can confirm the latest deployed code is being used.

### 2. Improve error visibility in the hook

- Add a first-line log (`[useRegenerateWeights] Starting regeneration for graph: ...`) so we can confirm the function was actually triggered
- Log the raw response from each batch before processing it, to catch any format mismatches
- Log each successful DB update with the question ID
- If all batches fail, include the specific error message in the toast (not just "Check logs")

### 3. Redeploy the function

Redeploy `regenerate-weights` to ensure the latest version with the version marker is live.

### 4. Re-run instructions

After implementation, you will need to:
1. Open the Programming Foundations graph
2. Click "Weights" and confirm regeneration
3. Watch the progress bar -- it should process ~48 batches of 20 questions each
4. When complete, all 951 questions should have `skill_weights` populated

## Files to Change

| File | Changes |
|------|---------|
| `supabase/functions/regenerate-weights/index.ts` | Add `_version` field to response |
| `src/hooks/useRegenerateWeights.ts` | Add verbose logging for start, raw responses, and individual DB updates |

## Technical Details

The regenerate-weights edge function response format is confirmed correct:
```text
{
  "question-id": {
    "primarySkills": ["skill_a"],
    "skillWeights": {"skill_a": 0.6, "skill_b": 0.4}
  }
}
```

The hook correctly maps this to database columns:
- `primarySkills` -> `primary_skills` (text array)
- `skillWeights` -> `skill_weights` (jsonb)

No schema changes are needed. The fix is primarily about ensuring the function is deployed and adding debugging visibility.

