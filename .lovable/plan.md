

# Increase Batch Generation Throughput for Paid-Tier Gemini API

Since you have a paid-tier API key, we can safely increase concurrency and reduce delays for much faster graph generation.

## Changes in `src/hooks/useBatchGeneration.ts`

| Constant | Current (free-tier) | New (paid-tier) | Effect |
|----------|-------------------|-----------------|--------|
| TURBO_CONCURRENCY | 1 | 4 | 4 parallel API calls |
| TURBO_DELAY_MS | 4000 | 300 | 300ms gap between batches |
| DELAY_BETWEEN_BATCHES_MS | 2000 | 800 | Faster sequential mode too |

## Expected Impact

For 326 questions (~66 batches), estimated time drops from ~20 minutes to ~2-3 minutes.

## Technical Details

Only one file changes: `src/hooks/useBatchGeneration.ts` (lines 11, 15-16). The retry logic with exponential backoff (30s on 429) stays in place as a safety net.

