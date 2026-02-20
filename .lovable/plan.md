

# Fix CORS, Update API Key, Add Retry Limits, and Increase Throughput

## 1. Update GEMINI_API_KEY secret

Set the new API key `AIzaSyBRf8z9LVjPO4CtNpIYGsPmc-JFNf9o2W4` as the `GEMINI_API_KEY` secret so all 6 edge functions use it.

## 2. Fix CORS headers on all 6 edge functions

The current CORS headers are missing newer Supabase client headers, which causes preflight failures. Update from:

```
"authorization, x-client-info, apikey, content-type"
```

to:

```
"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

Affected files:
- `supabase/functions/generate-graph/index.ts`
- `supabase/functions/analyze-difficulty/index.ts`
- `supabase/functions/regenerate-weights/index.ts`
- `supabase/functions/auto-group-skills/index.ts`
- `supabase/functions/extract-questions/index.ts`
- `supabase/functions/classify-questions/index.ts`

## 3. Add retry cap to batch generation

The `callBatchGenerate` function already has `maxRetries = 3`, which is correct. However, the turbo retry wave at the end (line 580-615) fires ALL failed batches again with no limit. Add a cap: if more than 50% of batches failed, abort and show an error instead of hammering the API.

Also increase concurrency back to **4** and reduce delay to **300ms** since the new API key should have higher limits.

### Changes in `src/hooks/useBatchGeneration.ts`:
- `TURBO_CONCURRENCY`: 2 -> 4
- `TURBO_DELAY_MS`: 500 -> 300
- Final retry wave: cap at max 10 retries, skip if > 50% of batches failed

## 4. forwardRef warnings

These are cosmetic React console warnings with zero functional impact. They will be deferred to a separate cleanup pass to keep this change focused on the critical fixes.

## Summary

| Change | File(s) | Impact |
|--------|---------|--------|
| New API key | Secret: GEMINI_API_KEY | Unlocks higher rate limits |
| CORS fix | All 6 edge functions | Fixes browser preflight blocking |
| Concurrency boost | useBatchGeneration.ts | 4 concurrent + 300ms delay |
| Retry cap | useBatchGeneration.ts | Prevents infinite retry flooding |

