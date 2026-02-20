

# Switch All Edge Functions from Lovable AI Gateway to Direct Gemini API

## What's changing

All 6 edge functions currently call `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY`. We'll switch them to call `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` with your existing `GEMINI_API_KEY` instead.

The Gemini API supports OpenAI-compatible endpoints, so the request/response format stays the same -- only the URL and auth header change.

## Affected Functions

| Function | Models Used |
|----------|------------|
| generate-graph | gemini-2.5-flash |
| analyze-difficulty | gemini-2.5-flash |
| regenerate-weights | gemini-2.5-flash |
| auto-group-skills | gemini-2.5-flash |
| classify-questions | gemini-2.5-flash-lite |
| extract-questions | gemini-2.5-flash |

## Changes per function (identical pattern)

In each file, two things change:

1. **API URL**: `https://ai.gateway.lovable.dev/v1/chat/completions` becomes `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

2. **Auth key**: `LOVABLE_API_KEY` becomes `GEMINI_API_KEY`

3. **Model names**: Strip the `google/` prefix (e.g. `google/gemini-2.5-flash` becomes `gemini-2.5-flash`, `google/gemini-2.5-flash-lite` becomes `gemini-2.5-flash-lite`)

No other logic changes. Error handling for 402/429 remains as-is since Gemini also returns these codes.

## Technical Details

- The Gemini OpenAI-compatible endpoint accepts the same `messages`, `temperature`, `max_tokens` payload format
- Your `GEMINI_API_KEY` secret is already configured in the backend
- All 6 function files will be updated and redeployed automatically
