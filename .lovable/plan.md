

# Fix 429 Rate Limits and CORS for Free-Tier Gemini API

## Problem
You're hitting 429 rate limits because the free-tier Gemini API allows only ~15 requests/minute. With TURBO_CONCURRENCY=4 and TURBO_DELAY_MS=300, your app fires requests far too fast. CORS headers are also missing `Access-Control-Allow-Methods`.

## Changes

### 1. Update GEMINI_API_KEY Secret
Set the secret to `AIzaSyBRf8z9LVjPO4CtNpIYGsPmc-JFNf9o2W4` (it's already listed as configured, but we'll verify/update it).

### 2. Fix CORS Headers in All 7 Edge Functions
Add `Access-Control-Allow-Methods: POST, OPTIONS` and return `new Response('ok', { status: 200, headers: corsHeaders })` for OPTIONS.

Files:
- `supabase/functions/generate-graph/index.ts`
- `supabase/functions/analyze-difficulty/index.ts`
- `supabase/functions/regenerate-weights/index.ts`
- `supabase/functions/auto-group-skills/index.ts`
- `supabase/functions/extract-questions/index.ts`
- `supabase/functions/classify-questions/index.ts`
- `supabase/functions/find-missing-questions/index.ts`

Updated CORS block:
```text
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

### 3. Throttle Batch Generation for Free Tier
In `src/hooks/useBatchGeneration.ts`:

| Constant | Old | New | Why |
|----------|-----|-----|-----|
| TURBO_CONCURRENCY | 4 | 1 | Free tier: ~15 req/min, sequential is safest |
| TURBO_DELAY_MS | 300 | 4000 | 4s gap between batches = ~15 req/min |

### 4. Improve Retry Logic in `callBatchGenerate`
- Max 3 retries per batch (already exists)
- On 429: exponential backoff starting at 30s (already 30s, keep it)
- After 3 failed retries: skip that batch, log warning, continue to next
- The existing code already throws after maxRetries; we'll add a try/catch in the caller to gracefully skip failed batches in sequential mode too

### 5. Add Estimated Time Display
The progress indicator already shows estimated time remaining. With concurrency=1 and delay=4s, it will be more accurate. For 326 questions:
- 326 / 5 = 66 batches
- ~15-20s per batch (4s delay + ~11-16s API call)
- Estimated: ~16-22 minutes total

### 6. API Endpoint Verification
All edge functions already use the correct endpoint:
- URL: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
- Auth: `Bearer ${GEMINI_API_KEY}`
- Model: `gemini-2.5-flash` (no `google/` prefix) -- correct for direct Gemini calls

No changes needed here.

## Files Modified
1. `src/hooks/useBatchGeneration.ts` -- concurrency and delay constants
2. 7 edge function `index.ts` files -- CORS headers

## Expected Timeline for 326 Questions
~16-22 minutes with free-tier key at 1 concurrent batch and 4s delay.

