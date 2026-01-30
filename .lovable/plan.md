

# Fix: Redeploy Edge Function and Clear State

## Problem Diagnosis

The error is **NOT an API key issue** - it's a truncation issue. The logs show:
- "Generating graph for 65 questions" (but you said 13)
- "AI response appears truncated"

This means either:
1. The edge function with `maxOutputTokens: 65536` hasn't been deployed
2. Your browser is sending cached data (65 questions from previous attempt)

## Solution

### Step 1: Force Redeploy Edge Function

I'll deploy the edge function to ensure the latest code (with increased token limit) is live.

### Step 2: Add Better Error Logging

Add logging to show the actual finish reason from Gemini to diagnose if it's hitting model limits:

```typescript
// After getting response, log the finish reason
const finishReason = data.candidates?.[0]?.finishReason;
console.log(`Gemini finish reason: ${finishReason}`);
if (finishReason === 'MAX_TOKENS') {
  console.warn('Response was truncated due to max tokens limit');
}
```

### Step 3: Reduce Batch Size as Fallback

If truncation persists, reduce `BATCH_SIZE` from 15 to 10 to ensure each batch produces smaller responses:

**File:** `src/components/panels/QuestionInputPanel.tsx` (line 17)
```typescript
const BATCH_SIZE = 10; // Reduced from 15 for safety
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/generate-graph/index.ts` | Add finish reason logging for better diagnostics |
| `src/components/panels/QuestionInputPanel.tsx` | Reduce BATCH_SIZE from 15 to 10 |

## Testing

After deployment:
1. Hard refresh your browser (Ctrl+Shift+R)
2. Try with exactly 13 questions
3. If it still fails, try with 5 questions to isolate the issue

