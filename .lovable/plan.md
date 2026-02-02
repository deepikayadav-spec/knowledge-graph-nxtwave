
# Add User-Controlled Batch Processing (50 Questions per Batch)

## Overview

Enhance the knowledge graph generation to support processing 800+ questions in user-controlled batches of 50, with real-time progress tracking, file upload, and resumable sessions.

## Current System

| Aspect | Current State |
|--------|---------------|
| Batch size | 5 questions (hardcoded) |
| Progress UI | None |
| File upload | Not supported |
| Resume | Not supported |
| Max questions | Unlimited (but slow with batch=5) |

For 800 questions at batch size 5 = **160 API calls** (~40-80 minutes)
For 800 questions at batch size 50 = **16 API calls** (~4-8 minutes)

## Implementation Plan

### 1. Make Batch Size Configurable

Update `KnowledgeGraphApp.tsx` to use a larger batch size:

```text
Current: const BATCH_SIZE = 5;
New: const BATCH_SIZE = 50;
```

This reduces API calls by 10x while staying within AI model context limits.

### 2. Add Progress Tracking State

Add new state variables to track batch processing:
- `currentBatch` / `totalBatches` - Batch progress
- `skillsDiscovered` - Running count of skills found
- `batchStartTime` - For time estimation
- `partialGraph` - Checkpoint for resume

### 3. Add Progress UI During Generation

Display real-time progress in both landing and graph modes:
- Progress bar with percentage
- "Processing batch X of Y"
- Skills discovered count
- Estimated time remaining

### 4. Add File Upload for Bulk Questions

Add a file upload button to `QuickQuestionInput.tsx`:
- Accepts `.txt` and `.csv` files
- Parses structured format (Question/Input/Output/Explanation)
- Validates format before processing
- Shows question count preview

### 5. Add Rate Limit Handling

Insert delays between batches to prevent 429 errors:
- 2-second delay between successful batches
- Exponential backoff on rate limit (30s, 60s, 120s)
- Auto-retry up to 3 times per batch

### 6. Add Resumable Sessions (Optional Enhancement)

Save progress to localStorage after each batch:
- Resume button if generation was interrupted
- Partial results preserved on page refresh

## File Changes

| File | Changes |
|------|---------|
| `src/components/KnowledgeGraphApp.tsx` | Increase batch size, add progress state, delays, resume logic |
| `src/components/panels/QuickQuestionInput.tsx` | Add file upload, progress display |

## Technical Details

### Updated handleGenerate Logic

```text
for each batch of 50 questions:
  1. Update progress UI
  2. Call generate-graph API
  3. On 429 error: wait with exponential backoff, retry
  4. Merge results into accumulated graph
  5. Save checkpoint to localStorage
  6. Wait 2 seconds before next batch
  7. Update skills discovered count
```

### File Upload Format

```text
Supported formats:
1. Plain text with "Question:" delimiters (current format)
2. One question per line (simple mode)
3. CSV with columns: Question, Input, Output, Explanation
```

### Progress UI Component

```text
+--------------------------------------------------+
| Processing batch 3 of 16                          |
| [====================                    ] 18.75% |
| 47 skills discovered · ~12 minutes remaining      |
+--------------------------------------------------+
```

## Performance Expectations

| Questions | Batch Size | API Calls | Est. Time |
|-----------|------------|-----------|-----------|
| 800 | 5 (old) | 160 | 40-80 min |
| 800 | 50 (new) | 16 | 4-8 min |
| 800 | 25 (conservative) | 32 | 8-16 min |

## Risk Mitigation

1. **Rate limits**: 2-second delays + exponential backoff
2. **Token limits**: 50 questions fits within 16K token response
3. **Data loss**: LocalStorage checkpoints every batch
4. **Large files**: Validate file size before parsing (max 1MB)

## Cost

All processing uses Lovable AI (`google/gemini-2.5-pro`) which has **free included usage**. No additional API keys or payment required for typical usage volumes.
