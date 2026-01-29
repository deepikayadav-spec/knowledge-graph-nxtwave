
# Fix JSON Parsing Error in Edge Function

## Problem Analysis

The edge function is failing with "Failed to parse AI response as JSON" because:

1. **Large response size**: Processing 65 questions generates massive JSON output
2. **Response truncation**: The AI response is getting cut off mid-JSON (visible in logs ending with `....[truncated]`)
3. **Weak JSON extraction**: Current parsing (lines 253-260) only handles markdown stripping, not:
   - Truncated responses
   - Trailing commas
   - Control characters
   - Malformed JSON boundaries

## Solution

Implement a robust JSON extraction function that:
1. Removes markdown code blocks
2. Finds proper JSON boundaries (`{` to `}`)
3. Handles common JSON formatting issues (trailing commas, control characters)
4. Provides better error logging for debugging

## Code Changes

### File: `supabase/functions/generate-graph/index.ts`

Replace the current JSON parsing logic (lines 251-260) with a robust extraction function:

```typescript
// Add this function before the serve() call
function extractJsonFromResponse(response: string): any {
  // Step 1: Remove markdown code blocks
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Step 2: Find JSON boundaries
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    // Check for JSON array as fallback
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");

    if (arrayStart === -1 || arrayEnd === -1) {
      throw new Error("No JSON object or array found in response");
    }
    cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
  } else {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  // Step 3: Attempt parse with error handling
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Step 4: Try to fix common issues
    cleaned = cleaned
      .replace(/,\s*}/g, "}") // Remove trailing commas in objects
      .replace(/,\s*]/g, "]") // Remove trailing commas in arrays
      .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters

    // Attempt to parse again after fixing
    try {
      return JSON.parse(cleaned);
    } catch (finalError) {
      console.error("Failed to parse JSON even after fixes. First 500 chars:", cleaned.substring(0, 500));
      console.error("Last 500 chars:", cleaned.substring(cleaned.length - 500));
      throw new Error(`Failed to parse AI response as JSON: ${finalError.message}`);
    }
  }
}
```

Then update the parsing section (lines 251-260) to use this function:

```typescript
// Parse the JSON from the response
let graphData;
try {
  graphData = extractJsonFromResponse(content);
} catch (parseError) {
  console.error("JSON extraction error:", parseError);
  throw parseError;
}
```

## What This Fixes

| Issue | Before | After |
|-------|--------|-------|
| Markdown code blocks | Basic regex strip | Multi-pattern removal |
| Truncated JSON | Parse fails | Finds valid `{...}` boundaries |
| Trailing commas | Parse fails | Removes them before parsing |
| Control characters | Parse fails | Strips them out |
| Error logging | Logs full content (huge) | Logs first/last 500 chars |

## No Changes To

- The master prompt (systemPrompt) - completely preserved
- The 4-step IPA methodology
- Node granularity guidelines
- Output format specification
- Quality checks

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/generate-graph/index.ts` | Add `extractJsonFromResponse()` helper and update parsing logic |
