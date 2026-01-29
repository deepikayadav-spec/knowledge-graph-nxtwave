
# Switch to Your Own Gemini API Key

## Overview
This plan modifies the knowledge graph generation to use your personal Google Gemini API key instead of the Lovable AI Gateway.

---

## What You'll Need

Before I implement this, you'll need a **Gemini API key** from Google AI Studio:
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create or copy your API key
3. You'll be prompted to enter it when I make the changes

---

## Changes

### 1. Add Your Gemini API Secret
I'll prompt you to securely store your `GEMINI_API_KEY` as a backend secret.

### 2. Update Edge Function
Modify `supabase/functions/generate-graph/index.ts` to:

| Current (Lovable Gateway) | New (Direct Gemini API) |
|---------------------------|-------------------------|
| `https://ai.gateway.lovable.dev/v1/chat/completions` | `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent` |
| Uses `LOVABLE_API_KEY` | Uses `GEMINI_API_KEY` |
| OpenAI-compatible format | Google's native API format |

**Key code changes:**
- Switch API endpoint to Google's Generative Language API
- Change request format from OpenAI chat completions to Gemini's `generateContent` structure
- Parse the response using Gemini's response format (`candidates[0].content.parts[0].text`)
- Update error handling for Google's API error codes

### 3. Model Selection
I'll use `gemini-1.5-flash` by default (fast and cost-effective), but the code will be structured so you can easily switch to `gemini-1.5-pro` or `gemini-2.0-flash` if needed.

---

## Technical Details

**New request format:**
```javascript
{
  contents: [
    { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
  ],
  generationConfig: {
    responseMimeType: "application/json"
  }
}
```

**New response parsing:**
```javascript
const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
```

---

## Files Modified
- `supabase/functions/generate-graph/index.ts` - Switch to Gemini API

## No Changes Needed
- Frontend code stays the same (it just calls the edge function)
- Data model and graph rendering unchanged
