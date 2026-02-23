

# Switch All Edge Functions from Gemini to DeepSeek v3.2 via OpenRouter

## Overview
Replace the Gemini API with OpenRouter across all 6 edge functions, using the `deepseek/deepseek-v3.2` model. The `OPENROUTER_API_KEY` secret is already configured.

## Changes

All 6 edge functions will be updated with the same pattern:

1. **API endpoint**: `generativelanguage.googleapis.com/v1beta/openai/chat/completions` changes to `openrouter.ai/api/v1/chat/completions`
2. **API key**: `GEMINI_API_KEY` changes to `OPENROUTER_API_KEY`
3. **Model**: All `gemini-2.5-flash` / `gemini-2.5-flash-lite` references change to `deepseek/deepseek-v3.2`

### Files Modified

| File | Current Model | Fetch Calls to Update |
|------|--------------|----------------------|
| `supabase/functions/generate-graph/index.ts` | gemini-2.5-flash | 2 (main call + JSON retry call) |
| `supabase/functions/analyze-difficulty/index.ts` | gemini-2.5-flash | 1 |
| `supabase/functions/regenerate-weights/index.ts` | gemini-2.5-flash | 1 |
| `supabase/functions/extract-questions/index.ts` | gemini-2.5-flash | 1 |
| `supabase/functions/classify-questions/index.ts` | gemini-2.5-flash-lite | 1 |
| `supabase/functions/auto-group-skills/index.ts` | gemini-2.5-flash | 1 |

### What stays the same
- All prompts, retry logic, JSON parsing, error handling remain unchanged
- The OpenRouter API is OpenAI-compatible, so the request/response format is identical
- Equal skill weights logic is untouched
- No autosave changes

### Technical Detail
Each function's fetch call changes from:
```
URL: https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
Auth: Bearer $GEMINI_API_KEY
Model: gemini-2.5-flash
```
to:
```
URL: https://openrouter.ai/api/v1/chat/completions
Auth: Bearer $OPENROUTER_API_KEY
Model: deepseek/deepseek-v3.2
```

All 6 edge functions will be redeployed after the changes.

