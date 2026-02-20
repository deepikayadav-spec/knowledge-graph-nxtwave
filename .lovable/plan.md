

# Turbo Generation with Auto Topic Classification for 328 Questions

## Overview

Two changes are needed to process your 328 questions in ~20-30 minutes instead of 3+ hours:

1. **Auto-classify questions into curriculum topics** -- since your file has no `Topic:` headers, we need a pre-processing step so the system can enforce pedagogical boundaries correctly
2. **Parallel batch processing (Turbo Mode)** -- fire 3 batches concurrently instead of one at a time

---

## Part 1: Auto Topic Classification Edge Function

Create a new edge function `classify-questions` that takes all 328 questions and assigns each to one of the 36 web curriculum topics using AI. This runs once before generation starts.

### New File: `supabase/functions/classify-questions/index.ts`

- Accepts `{ questions: string[], domain: string }`
- Uses the 36-topic web curriculum list as reference
- Processes questions in chunks of ~30 for classification (lightweight -- just returns topic names, not full graph analysis)
- Returns `{ topicMap: Record<number, string> }` mapping each question index to its topic name
- Uses Lovable AI (Gemini Flash) for fast, cheap classification

### Client Integration: `src/hooks/useBatchGeneration.ts`

- Before batching, if no `Topic:` headers are detected AND turbo mode is on, call `classify-questions` to get the topic map
- Inject the returned topic map into the batch generation flow (same as if the user had typed `Topic:` headers)
- This takes ~30-60 seconds for all 328 questions (one-time cost)

---

## Part 2: Turbo Parallel Generation

### File: `src/hooks/useBatchGeneration.ts`

**New constants:**
- `TURBO_BATCH_SIZE = 8` (up from 3-5)
- `TURBO_CONCURRENCY = 3` (3 batches fire simultaneously per wave)
- `TURBO_DELAY_MS = 500` (down from 2000ms)

**Updated `generate` function signature:**
```
generate(questions, resumeFromCheckpoint, graphId, domain, turbo?)
```

**Parallel wave loop** replaces the sequential `for` loop:
- Group batches into waves of 3
- Fire all 3 with `Promise.allSettled`
- Merge successful results, retry failures in next wave
- Update UI and save checkpoint after each wave

**Cap `existingNodes` context at 80 entries:**
- Send only the 80 most recent nodes as context to the AI
- Prevents payload bloat that causes 413 truncation errors
- All nodes still tracked locally for merging

**Performance estimate for 328 questions:**

| Metric | Current | Turbo |
|---|---|---|
| Batch size | 3-5 | 8 |
| Concurrency | 1 (sequential) | 3 (parallel) |
| Total batches | ~80 | ~41 |
| Effective API rounds | ~80 | ~14 waves |
| Estimated time | 3+ hours | 20-30 minutes |

---

## Part 3: UI Trigger

### File: `src/components/panels/QuickQuestionInput.tsx`

- Auto-detect when question count exceeds 30 and pass `turbo: true` to the generate function
- No manual toggle needed -- turbo activates automatically for large uploads

### File: `src/components/KnowledgeGraphApp.tsx`

- Thread the `turbo` parameter through `handleGenerate` to `useBatchGeneration.generate()`

---

## Technical Details

### Auto-Classification Prompt (edge function)
The AI receives the 36 topics and batches of ~30 question summaries (first 200 chars each to save tokens). It returns a JSON array of topic assignments. This is a simple classification task -- fast and reliable.

### Safety of Parallel Processing
- `mergeGraphs` already deduplicates nodes by ID -- parallel batches discovering the same skill are handled
- Edge deduplication and DAG enforcement happen during merge
- If any batch in a wave gets rate-limited (429), the whole wave backs off
- Checkpoint saves after each wave, so a crash loses at most one wave (~3 batches)

### Existing Nodes Cap
- Sending 200+ node summaries wastes tokens and causes truncation
- Cap at 80 most recent nodes: enough for deduplication context without payload bloat
- All nodes still tracked locally in `accumulatedNodes` for the final merge

