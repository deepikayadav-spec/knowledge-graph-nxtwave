
# Incremental Knowledge Graph System

## Overview
Convert the current "batch generation" approach to an **incremental** system where users continuously add questions and the graph evolves accordingly—reusing existing nodes when possible and creating new ones only when needed.

## Current vs. Proposed Architecture

```text
CURRENT FLOW:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Questions  │ ──▶ │  Generate   │ ──▶ │  Replace    │
│  (batch)    │     │  Full Graph │     │  Graph      │
└─────────────┘     └─────────────┘     └─────────────┘

PROPOSED FLOW:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Existing   │ ──┬▶│  Generate   │ ──▶ │  Merge Into │
│  Graph      │   │ │  Delta Only │     │  Existing   │
├─────────────┤   │ └─────────────┘     └─────────────┘
│  New        │ ──┘
│  Questions  │
└─────────────┘
```

---

## Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Context passing** | Send existing node IDs + names to AI | Enables reuse without sending full graph (token efficient) |
| **Node matching** | AI decides reuse vs. create | Semantic matching is better done by LLM than string comparison |
| **Graph persistence** | In-memory (React state) | Simple MVP; can add backend storage later |
| **UI paradigm** | "Add questions" always visible | Encourages incremental building |

---

## Implementation Plan

### Phase 1: Modify Edge Function

**File:** `supabase/functions/generate-graph/index.ts`

**Changes:**
1. Accept optional `existingNodes` parameter containing `{id, name}[]`
2. Update system prompt to instruct AI to reuse existing nodes when semantically equivalent
3. Return only new/modified nodes and edges

**Updated prompt section:**
```text
=== INCREMENTAL MODE ===
You are given existing nodes from the knowledge graph.
REUSE existing nodes when the cognitive operation is semantically equivalent.
Only create NEW nodes for genuinely new cognitive capabilities.

Existing nodes (reuse these IDs when applicable):
{existingNodes list}
```

**Request body:**
```typescript
{
  questions: string[];
  existingNodes?: Array<{ id: string; name: string }>;
}
```

---

### Phase 2: Update Client Logic

**File:** `src/components/KnowledgeGraphApp.tsx`

**Changes:**
1. Keep graph state persistent (don't clear on new generation)
2. Pass existing node summaries to edge function
3. Merge returned delta into existing graph
4. Update UI to show "Add More Questions" always

**Key logic:**
```typescript
const handleAddQuestions = async (newQuestions: string[]) => {
  const existingNodes = graph?.globalNodes.map(n => ({
    id: n.id,
    name: n.name
  })) || [];
  
  // Call API with context
  const { data } = await supabase.functions.invoke('generate-graph', {
    body: { 
      questions: newQuestions,
      existingNodes 
    }
  });
  
  // Merge into existing graph
  const updatedGraph = mergeGraphs([graph, data].filter(Boolean));
  setGraph(updatedGraph);
};
```

---

### Phase 3: Enhance Merge Logic

**File:** `src/lib/graph/mergeGraphs.ts`

**Enhancements:**
1. Handle node updates (AI might return updated versions of existing nodes)
2. Merge `appearsInQuestions` arrays when same node referenced
3. Prevent duplicate edges with same from/to

---

### Phase 4: UI Updates

**File:** `src/components/KnowledgeGraphApp.tsx`

**Changes:**
1. Always show question input (not just on landing)
2. Add "Clear Graph" button for starting fresh
3. Show cumulative stats (total questions processed)

**File:** `src/components/panels/QuickQuestionInput.tsx`

**Changes:**
1. Update wording to "Add More Questions"
2. Add visual indicator showing incremental mode

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-graph/index.ts` | Accept existing nodes, update prompt for incremental mode |
| `src/components/KnowledgeGraphApp.tsx` | Persistent state, pass context to API, show input always |
| `src/lib/graph/mergeGraphs.ts` | Handle node updates, improve deduplication |
| `src/components/panels/QuickQuestionInput.tsx` | Update UI wording for incremental paradigm |

---

## Technical Details

### System Prompt Addition (Edge Function)

```text
=== INCREMENTAL ANALYSIS MODE ===

You are extending an existing knowledge graph. Follow these rules:

1. REUSE EXISTING NODES when the cognitive operation matches:
   - If an existing node covers the same atomic skill, use its ID
   - Don't create duplicates like "check_key_exists_2" if "check_key_exists" exists

2. CREATE NEW NODES only when:
   - No existing node covers this specific cognitive operation
   - The operation is genuinely new to the graph

3. EDGES:
   - Create edges from existing nodes to new nodes when prerequisites apply
   - Create edges between new nodes as needed
   - Don't duplicate existing edges

4. QUESTION PATHS:
   - Map new questions to both existing and new nodes
   - Existing nodes remain valid prerequisites

Existing nodes in the graph:
{NODES_LIST}

Analyze ONLY the new questions and return:
- New nodes (if any)
- New edges (connecting to both existing and new nodes)
- Question paths for the new questions only
```

### Merge Strategy

```typescript
// In mergeGraphs.ts
function mergeIncrementally(existing: KnowledgeGraph, delta: KnowledgeGraph): KnowledgeGraph {
  // 1. Update existing nodes if delta has same ID
  // 2. Add genuinely new nodes
  // 3. Merge appearsInQuestions arrays
  // 4. Add new edges (skip duplicates)
  // 5. Add new question paths
}
```

---

## User Experience Flow

1. **First Use:** User enters questions → Full graph generated
2. **Add More:** User enters more questions → AI analyzes with context → Delta merged
3. **Graph Grows:** Each addition builds on existing graph
4. **Clear Option:** User can reset and start fresh if needed

---

## Edge Cases Handled

| Case | Handling |
|------|----------|
| Very large existing graph | Send only ID + name (not full node data) |
| AI creates duplicate anyway | Merge logic deduplicates by ID |
| Contradictory edges | Later edges take precedence |
| Node renamed by AI | Keep original (ID is source of truth) |

---

## Testing Checklist

After implementation:
1. Generate initial graph with 3 questions
2. Add 2 more questions that share concepts → verify node reuse
3. Add 2 questions with completely new concepts → verify new nodes created
4. Verify question paths reference both old and new nodes
5. Clear graph and start fresh → verify clean slate
