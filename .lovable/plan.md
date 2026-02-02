
# Switch to OpenRouter API

## Overview

Replace the direct Gemini API integration with OpenRouter, allowing you to use various AI models (Gemini, Claude, GPT-4, etc.) through a single API key.

## Changes Required

### 1. Add OpenRouter API Key Secret

Before making code changes, you'll need to provide your OpenRouter API key. I'll prompt you to add this secret.

### 2. Update Edge Function

**File**: `supabase/functions/generate-graph/index.ts`

#### Current Implementation (Gemini Direct)
```typescript
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 65536,
        temperature: 0.2,
      },
    }),
  }
);

// Extract from Gemini format
const data = await response.json();
const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
```

#### New Implementation (OpenRouter)
```typescript
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://lovable.dev",
    "X-Title": "Knowledge Graph Generator",
  },
  body: JSON.stringify({
    model: "google/gemini-2.0-flash-001",  // Can easily switch models
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    max_tokens: 65536,
    temperature: 0.2,
    response_format: { type: "json_object" },
  }),
});

// Extract from OpenAI-compatible format
const data = await response.json();
const text = data.choices?.[0]?.message?.content;
```

### Key Differences

| Aspect | Gemini Direct | OpenRouter |
|--------|---------------|------------|
| API Format | Google-specific | OpenAI-compatible |
| Auth | API key in URL | Bearer token header |
| Messages | `contents[].parts[].text` | `messages[].content` |
| Response | `candidates[0].content.parts[0].text` | `choices[0].message.content` |
| JSON mode | `responseMimeType: "application/json"` | `response_format: { type: "json_object" }` |

### 3. Update Error Handling

OpenRouter uses standard HTTP status codes:
- 429: Rate limit exceeded
- 402: Insufficient credits
- 401: Invalid API key
- 400: Bad request

### 4. Model Selection

With OpenRouter, you can easily switch models by changing the `model` parameter:
- `google/gemini-2.0-flash-001` (current equivalent)
- `google/gemini-2.5-pro-preview-03-25` (more capable)
- `anthropic/claude-3.5-sonnet` (alternative)
- `openai/gpt-4-turbo` (alternative)

---

## Implementation Steps

1. **Add OPENROUTER_API_KEY secret** - I'll prompt you to enter this
2. **Update the fetch call** - Change endpoint and headers
3. **Update request body** - Convert to OpenAI chat format
4. **Update response parsing** - Extract from `choices[0].message.content`
5. **Update error handling** - Handle OpenRouter-specific errors
6. **Optionally remove GEMINI_API_KEY** - No longer needed after migration

---

## Benefits

- **Model flexibility**: Switch between Gemini, Claude, GPT-4, etc. with one line change
- **Unified billing**: Single dashboard for all AI usage
- **Fallback options**: If one model is down, easily switch to another
- **OpenAI-compatible format**: Cleaner, more standard API structure
