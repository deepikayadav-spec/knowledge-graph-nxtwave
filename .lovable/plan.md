

# Fix Truncated AI Response for Large Question Sets

## Root Cause

The error occurs because processing **65 questions** generates a JSON response that exceeds Gemini's output token limit. The response gets truncated mid-JSON, and no amount of parsing fixes can recover incomplete data.

Evidence from logs:
- Error: `Expected ',' or '}' after property value in JSON at position 29752`
- Last 500 chars show response ends mid-node: `"appearsInQuestions": ["Book Rating Aggregator"]      }` (missing outer closing brackets)

## Solution

Add `maxOutputTokens` to the Gemini generation config to request a larger response size. The Gemini 2.0 Flash model supports up to **8192 output tokens** by default but can be increased.

## Code Change

**File:** `supabase/functions/generate-graph/index.ts`

Update the `generationConfig` in the API call (around line 260-262):

```typescript
generationConfig: {
  responseMimeType: "application/json",
  maxOutputTokens: 65536,  // Request larger output buffer
},
```

## Why This Works

| Setting | Default | New Value |
|---------|---------|-----------|
| `maxOutputTokens` | 8192 | 65536 |

Gemini 2.0 Flash supports up to **1 million tokens** in context, so requesting 65k output tokens is well within limits for complex multi-question graphs.

## What Stays Unchanged

- The master prompt (all 4 IPA steps)
- Node granularity guidelines
- JSON extraction function
- All other generation logic

## Alternative Backup (if still failing)

If responses still truncate, we could add batching logic to process questions in smaller groups. But increasing `maxOutputTokens` should handle 65 questions without issue.

