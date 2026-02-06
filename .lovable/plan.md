

# Fix JSON Parsing Robustness in analyze-difficulty

## Problem

The `analyze-difficulty` edge function is failing with JSON parsing errors:
```
SyntaxError: Expected ',' or '}' after property value in JSON at position 1050
```

This happens when:
1. AI response gets truncated (incomplete JSON)
2. Question text contains special characters that corrupt the output
3. AI adds explanation text or malformed JSON

## Root Cause Analysis

Comparing `analyze-difficulty` with `generate-graph`:

| Feature | generate-graph | analyze-difficulty |
|---------|---------------|-------------------|
| Truncation detection | Yes | No |
| JSON repair mechanism | Yes | No |
| Debug logging (first/last 500 chars) | Yes | No |
| Input sanitization | No | No |
| Fallback for failed questions | N/A | No |

## Solution Overview

Port the robust JSON handling from `generate-graph` to `analyze-difficulty`, plus add:
1. **Input sanitization** - Clean question text before sending to AI
2. **Fallback scoring** - Default scores for questions that can't be parsed
3. **Partial success handling** - Return what we can, log what failed

## Implementation Details

### 1. Add Truncation Detection

```typescript
function isLikelyTruncatedJson(text: string): boolean {
  const openCurly = (text.match(/\{/g) || []).length;
  const closeCurly = (text.match(/\}/g) || []).length;
  const openSquare = (text.match(/\[/g) || []).length;
  const closeSquare = (text.match(/\]/g) || []).length;
  return openCurly !== closeCurly || openSquare !== closeSquare;
}
```

### 2. Add JSON Repair Mechanism

```typescript
function attemptJsonRepair(text: string): any | null {
  // Find last valid position and close brackets
  let repaired = text.trim();
  let openCurly = 0, openSquare = 0, lastValidPos = 0;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (char === '{') openCurly++;
    else if (char === '}') {
      openCurly--;
      if (openCurly >= 0 && openSquare >= 0) lastValidPos = i + 1;
    }
    else if (char === '[') openSquare++;
    else if (char === ']') {
      openSquare--;
      if (openCurly >= 0 && openSquare >= 0) lastValidPos = i + 1;
    }
  }
  
  // Truncate and close
  if (lastValidPos > 0 && lastValidPos < repaired.length) {
    repaired = repaired.substring(0, lastValidPos);
  }
  while (openSquare > 0) { repaired += ']'; openSquare--; }
  while (openCurly > 0) { repaired += '}'; openCurly--; }
  
  repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  
  try {
    return JSON.parse(repaired);
  } catch { return null; }
}
```

### 3. Input Sanitization

Before sending question text to AI, clean special characters:

```typescript
function sanitizeQuestionText(text: string): string {
  return text
    // Remove control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Escape backslashes and quotes
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
```

### 4. Enhanced extractJsonFromResponse

```typescript
function extractJsonFromResponse(response: string): any {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in response");
  }
  
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  cleaned = cleaned
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\t+/g, " ")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // First cleanup attempt
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");

    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      // Debug logging
      console.error("[analyze-difficulty] Parse failed. First 500 chars:", 
        cleaned.substring(0, 500));
      console.error("[analyze-difficulty] Last 500 chars:", 
        cleaned.substring(cleaned.length - 500));

      // Try repair for truncated responses
      if (isLikelyTruncatedJson(cleaned)) {
        const repaired = attemptJsonRepair(cleaned);
        if (repaired) {
          console.log("[analyze-difficulty] JSON repair successful");
          return repaired;
        }
        throw new Error("AI response truncated - try smaller batch size");
      }

      throw new Error(`JSON parse failed: ${(secondError as Error).message}`);
    }
  }
}
```

### 5. Fallback Default Scores

For questions that fail to parse, provide default scores:

```typescript
function getDefaultDifficultyResult(): DifficultyResult {
  return {
    cognitiveComplexity: 2,  // Apply level
    taskStructure: 1,        // Well-defined
    algorithmicDemands: 1,   // Any solution
    scopeIntegration: 1,     // Single concept
    rawPoints: 5,
    weightageMultiplier: 1.0, // Basic default
  };
}
```

### 6. Update Hook for Partial Success

Modify `useRegenerateDifficulty` to handle partial failures gracefully:
- Track which questions succeeded vs failed
- Show count of fallback defaults used
- Allow retry of failed questions

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/analyze-difficulty/index.ts` | Add all robust parsing functions |
| `src/hooks/useRegenerateDifficulty.ts` | Add partial success handling |

## Testing Strategy

After implementation:
1. Run "Regenerate Difficulty" on Programming Foundations graph
2. Check logs for any repair attempts or fallbacks used
3. Verify all 951 questions get difficulty scores in database

## Summary

This fix brings `analyze-difficulty` up to the same robustness level as `generate-graph`:
- Truncation detection and repair
- Better error logging for debugging
- Input sanitization to prevent corruption
- Fallback defaults so the process never fully fails
- Partial success handling in the UI

