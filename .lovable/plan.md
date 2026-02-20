
# Diagnosis: Turbo Mode IS Working, But Needs Optimization

## What the Logs Show

Parallel processing IS running -- 3 batches fire concurrently (confirmed by console log `Mode: TURBO, batch size: 8, concurrency: 3` and 3 simultaneous edge function boots). However, two problems are eating the speed gains:

1. **Batch size 8 causes token truncation**: One of the 3 parallel batches hit `finish_reason: length`, requiring JSON repair. This means the AI ran out of output tokens trying to process 8 questions at once, producing incomplete results that need recovery.

2. **Failed batches get retried sequentially**: After a wave completes, any failed/truncated batches are retried one at a time, turning a parallel wave into a sequential bottleneck.

## Proposed Fixes

### 1. Reduce turbo batch size from 8 to 5

File: `src/hooks/useBatchGeneration.ts`

- Change `TURBO_BATCH_SIZE` from 8 to 5
- This prevents token truncation (the AI can fully process 5 questions without hitting output limits)
- More batches, but each succeeds on first try -- no retries needed
- Total batches: ~66 instead of ~41, but at concurrency 3 that is ~22 waves (only 8 more than before)

### 2. Increase concurrency from 3 to 4

File: `src/hooks/useBatchGeneration.ts`

- Change `TURBO_CONCURRENCY` from 3 to 4
- With smaller batch sizes (5 instead of 8), the API is less likely to rate-limit
- 66 batches / 4 = ~17 waves -- roughly same as before but without truncation failures
- If rate limiting does occur, the existing backoff logic handles it

### 3. Skip failed batch retries in turbo mode (log and continue)

File: `src/hooks/useBatchGeneration.ts`

- Instead of retrying failed batches immediately after each wave (sequential retry loop at lines 564-590), push them to a retry queue
- Process all retry batches in a single final wave at the end
- This prevents one failed batch from blocking the next wave

### 4. Add timing logs for wave completion

File: `src/hooks/useBatchGeneration.ts`

- Add `console.log` with wall-clock time for each wave so you can verify actual speedup
- Format: `[Turbo] Wave N completed in Xs (Y batches succeeded, Z failed)`

## Expected Performance After Fix

| Metric | Current Turbo | Optimized Turbo |
|---|---|---|
| Batch size | 8 | 5 |
| Concurrency | 3 | 4 |
| Truncation rate | ~33% of batches | ~0% |
| Total batches | 41 | 66 |
| Effective waves | 14 + retries | 17 |
| Est. time per wave | 2.5 min + retry overhead | 1.5-2 min (smaller batches) |
| Est. total time | 35-50 min (with retries) | 25-35 min (no retries) |

## Technical Details

### Why Smaller Batches Are Faster Overall

The `generate-graph` edge function requests `max_tokens: 18000` for 8 questions. With complex multi-line coding questions, the AI often runs out of output space, producing truncated JSON that needs:
- JSON repair logic (string matching, bracket closing)
- Partial response recovery
- Sometimes a full sequential retry

5 questions per batch stay well within the token budget, so every batch succeeds on the first attempt. The elimination of retries more than compensates for the extra waves.

### Files Changed

1. `src/hooks/useBatchGeneration.ts` -- constants, retry strategy, timing logs
