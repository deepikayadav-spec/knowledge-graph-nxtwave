

# Switch All Edge Functions to Direct Gemini API (Paid Tier)

## Overview

All 6 edge functions currently route through the Lovable AI gateway (which is out of credits). We'll switch them to call Google's Gemini API directly using your paid-tier `GEMINI_API_KEY`. This is the same change attempted before, but your paid tier eliminates the rate-limit issues.

## Pre-requisite

If your current `GEMINI_API_KEY` secret needs updating with the paid-tier key, we'll prompt you to enter it first.

## Changes (identical pattern across all 6 functions)

Each function gets 3 small edits:

1. **API URL**: `https://ai.gateway.lovable.dev/v1/chat/completions` changes to `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
2. **Secret name**: `LOVABLE_API_KEY` changes to `GEMINI_API_KEY`
3. **Model names**: Strip `google/` prefix (e.g. `google/gemini-2.5-flash` becomes `gemini-2.5-flash`)

No other logic changes needed -- the Gemini OpenAI-compatible endpoint accepts the same request/response format.

## Affected Functions

| Function | Model |
|----------|-------|
| generate-graph | gemini-2.5-flash |
| analyze-difficulty | gemini-2.5-flash |
| regenerate-weights | gemini-2.5-flash |
| auto-group-skills | gemini-2.5-flash |
| classify-questions | gemini-2.5-flash-lite |
| extract-questions | gemini-2.5-flash |

## Technical Details

- The `GEMINI_API_KEY` secret already exists in the project. If it needs to be updated, you'll be prompted to enter the new value.
- All functions will be redeployed automatically after the code changes.
- Error handling (429/402 responses) remains in place since Gemini returns the same status codes.

