

# Fix Duplicate Detection: Strip All HTML Before Fingerprinting

## Problem

The `extractCoreQuestion` function only strips `<br>` tags, but many questions in the database contain rich HTML: `<div>`, `<b>`, `<hr>`, `<img>`, `<MultiLineQuickTip>`, inline `style` attributes, etc. When the same question is re-imported from a file, the HTML formatting may differ slightly (or be absent), producing a different fingerprint and causing the duplicate check to miss the match.

This explains why only 157 of 224 questions are detected -- the ~67 unmatched ones likely contain HTML that causes fingerprint divergence.

## Solution

Make `extractCoreQuestion` aggressively strip ALL HTML tags and entities before fingerprinting. This ensures the same textual content produces an identical fingerprint regardless of HTML wrapping.

## Files to Change

### 1. `src/lib/question/extractCore.ts`

Add aggressive HTML normalization at the top of the function, before any line-by-line processing:

- Strip ALL HTML tags (not just `<br>`): `/<[^>]+>/gi` -- removes `<div>`, `<b>`, `<img ...>`, `<hr/>`, `<MultiLineQuickTip>`, etc.
- Decode common HTML entities: `&amp;` to `&`, `&lt;` to `<`, `&gt;` to `>`, `&nbsp;` to space, `&#...;` numeric entities
- Normalize all whitespace (collapse runs of spaces/newlines)

### 2. `supabase/functions/find-missing-questions/index.ts`

Apply the same HTML stripping logic to keep the edge function's copy of `extractCoreQuestion` in sync.

## Technical Detail

Current code (line 8):
```typescript
const cleaned = fullBlock.replace(/<br\s*\/?>/gi, '\n');
```

Updated approach:
```typescript
// Strip ALL HTML tags, not just <br>
let cleaned = fullBlock.replace(/<br\s*\/?>/gi, '\n');
cleaned = cleaned.replace(/<[^>]+>/gi, ' ');
// Decode common HTML entities
cleaned = cleaned.replace(/&nbsp;/gi, ' ');
cleaned = cleaned.replace(/&amp;/gi, '&');
cleaned = cleaned.replace(/&lt;/gi, '<');
cleaned = cleaned.replace(/&gt;/gi, '>');
cleaned = cleaned.replace(/&quot;/gi, '"');
cleaned = cleaned.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
```

This is a minimal, targeted change. No database changes, no new files. It fixes the root cause by ensuring HTML-rich DB content and plain-text file content produce the same fingerprint.

