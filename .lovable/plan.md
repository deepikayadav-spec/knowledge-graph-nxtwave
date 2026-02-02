
# Switch from OpenRouter to Lovable AI

## Problem Identified
Your new OpenRouter API key has only 666 tokens available, but the current code requests 65,536 tokens (`max_tokens: 65536`). The error message confirms this:
> "You requested up to 65536 tokens, but can only afford 666"

This is a billing issue with your OpenRouter account, not a code bug.

## Proposed Solution
Switch from OpenRouter to **Lovable AI Gateway** which:
- Has free included usage (no API key needed from you)
- Uses the pre-configured `LOVABLE_API_KEY` secret (already in your project)
- Supports capable models like `google/gemini-2.5-pro` for complex reasoning

## Technical Changes

### 1. Update Edge Function (`supabase/functions/generate-graph/index.ts`)

Replace OpenRouter API call with Lovable AI Gateway:

```text
Changes:
- Replace API endpoint: openrouter.ai → ai.gateway.lovable.dev
- Replace API key: OPENROUTER_API_KEY → LOVABLE_API_KEY
- Update model: openai/o1 → google/gemini-2.5-pro (best for reasoning tasks)
- Remove OpenRouter-specific headers (HTTP-Referer, X-Title)
- Adjust max_tokens to a reasonable value (16384 - sufficient for graph output)
```

### 2. Key Code Modifications

**Before:**
```typescript
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const model = "openai/o1";
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  headers: {
    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://lovable.dev",
    "X-Title": "Knowledge Graph Generator",
  },
  body: JSON.stringify({
    model,
    max_tokens: 65536,
    ...
  }),
});
```

**After:**
```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const model = "google/gemini-2.5-pro";
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: {
    "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    max_tokens: 16384,
    ...
  }),
});
```

### 3. Error Handling Updates

Update error messages to reference Lovable AI instead of OpenRouter:
- 402 error: "Rate limits exceeded or credits depleted"
- 429 error: "Too many requests, please wait"

## Benefits

| Aspect | OpenRouter | Lovable AI |
|--------|------------|------------|
| Cost | Pay per token | Free included usage |
| API Key | Must manage yourself | Auto-provisioned |
| Model | openai/o1 (expensive) | google/gemini-2.5-pro (included) |
| Reliability | Depends on your credits | Built-in to Lovable |

## Files to Modify

1. `supabase/functions/generate-graph/index.ts` - Switch API endpoint and credentials

## Deployment

After approval, the edge function will be automatically redeployed with the changes.
