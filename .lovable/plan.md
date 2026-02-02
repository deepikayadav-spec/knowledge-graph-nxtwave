
# Fix Batch Generation: Smaller Batches, Simpler Output, Live Progress

## Issues Identified

1. **Static Loading Screen**: The progress UI exists but the graph is only shown after ALL batches complete. Users see no visual progress.
2. **Truncation Errors (413)**: 50-question batches with full IPA traces exceed AI output limits.
3. **Missing Data Errors**: Nodes returned without `le` or `knowledgePoint` fields cause rendering crashes.
4. **Badge Ref Warning**: The `Badge` component needs `forwardRef` to fix the console warning.

## Solution Overview

Based on your preferences:
- Batch size: **15 questions** (good balance)
- IPA output: **No IPA traces** (smaller responses, faster)
- Live feedback: **Show partial graph while generating** (visual progress)

---

## File Changes

### 1. Reduce Batch Size and Show Live Graph
**File**: `src/hooks/useBatchGeneration.ts`

Changes:
- Change `BATCH_SIZE` from 50 to **15**
- After each batch completes, immediately call `onGraphUpdate()` with the merged partial graph so users see it growing in real-time
- Add defensive data normalization to ensure every node has required fields (`knowledgePoint`, `cme`, `le`)

### 2. Remove IPA from AI Output
**File**: `supabase/functions/generate-graph/index.ts`

Changes:
- Update the system prompt to instruct the AI to **skip** the `ipaByQuestion` field entirely
- Reduce `max_tokens` calculation since we no longer need space for IPA traces
- This significantly reduces response size, preventing truncation

### 3. Add Default Values for Missing Node Data
**File**: `src/lib/graph/mergeGraphs.ts`

Changes:
- Add a normalization function that ensures every `GraphNode` has:
  - `knowledgePoint` with safe defaults
  - `cme` with `measured: false` defaults
  - `le` with `estimated: true` and `estimatedMinutes: 20`
- Apply this normalization during merge to prevent crashes

### 4. Fix Badge forwardRef Warning
**File**: `src/components/ui/badge.tsx`

Changes:
- Wrap the `Badge` component with `React.forwardRef` to properly handle refs passed by parent components

### 5. Update KnowledgeGraphApp for Live Updates
**File**: `src/components/KnowledgeGraphApp.tsx`

Changes:
- Ensure the graph view renders as soon as `graph` state has any nodes (not just when generation completes)
- The `handleGraphUpdate` callback already sets graph state; just need to ensure it's called incrementally

---

## Technical Details

### Batch Size Calculation

| Questions | Batch Size | API Calls | Est. Time |
|-----------|------------|-----------|-----------|
| 800 | 15 | 54 | ~14-27 min |
| 400 | 15 | 27 | ~7-14 min |
| 100 | 15 | 7 | ~2-4 min |

### Default Node Schema

```text
{
  knowledgePoint: {
    atomicityCheck: "Auto-generated skill",
    assessmentExample: "",
    targetAssessmentLevel: 3,
    appearsInQuestions: []
  },
  cme: {
    measured: false,
    highestConceptLevel: 0,
    levelLabels: [...],
    independence: "Unknown",
    retention: "Unknown",
    evidenceByLevel: {}
  },
  le: {
    estimated: true,
    estimatedMinutes: 20
  }
}
```

### Prompt Change (Edge Function)

```text
Before:
"Include 'ipaByQuestion' showing your cognitive analysis"

After:
"SKIP the 'ipaByQuestion' field entirely - output ONLY globalNodes, edges, questionPaths, courses"
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useBatchGeneration.ts` | Batch size 15, live graph updates, data normalization |
| `supabase/functions/generate-graph/index.ts` | Remove IPA from output, reduce max_tokens |
| `src/lib/graph/mergeGraphs.ts` | Add normalizeNode() with safe defaults |
| `src/components/ui/badge.tsx` | Add forwardRef wrapper |
| `src/components/KnowledgeGraphApp.tsx` | Minor: ensure graph displays during generation |

---

## Expected Outcome

After these changes:
1. Users will see the graph appear after the **first batch** (15 questions) completes
2. Graph grows visually as each batch finishes
3. Progress bar shows accurate batch count and time remaining
4. No more truncation errors (smaller AI responses)
5. No more crashes from missing node fields
6. Console warning about Badge refs is fixed
