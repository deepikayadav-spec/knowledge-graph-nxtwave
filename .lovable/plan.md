
# Fix Incremental Feature to Prevent Node Duplication

## Root Causes

1. **Stale context across batches**: Each batch receives the same initial `existingNodes`, ignoring new nodes from previous batches
2. **Weak semantic matching**: Only ID+name sent to AI, insufficient for accurate matching
3. **No duplicate detection**: `mergeGraphs` only dedupes by exact ID, not semantic similarity
4. **No enforcement in prompt**: Incremental instructions are suggestions, not requirements

---

## Solution Overview

```text
CURRENT FLOW (causes duplicates):
Batch 1 → existingNodes (initial)     → creates "dictionary_ops"
Batch 2 → existingNodes (same initial) → creates "dict_operations" ← DUPLICATE!
Batch 3 → existingNodes (same initial) → creates "dictionary_usage" ← DUPLICATE!
        ↓
mergeGraphs → 3 different IDs → 3 nodes (wrong!)

FIXED FLOW (prevents duplicates):
Batch 1 → existingNodes (initial)           → creates "dictionary_ops"
        → accumulate new nodes
Batch 2 → existingNodes (initial + batch1)  → reuses "dictionary_ops"
        → accumulate new nodes  
Batch 3 → existingNodes (initial + batch2)  → reuses "dictionary_ops"
        ↓
mergeGraphs → 1 ID → 1 node (correct!)
```

---

## Implementation Plan

### Part 1: Accumulate Context Across Batches

**File**: `src/components/KnowledgeGraphApp.tsx`

Update the batch processing loop to accumulate new nodes after each batch:

```typescript
const handleGenerate = useCallback(async (questions: string[]) => {
  setIsGenerating(true);
  
  // Start with existing graph nodes
  let accumulatedNodes: {id: string; name: string; tier?: string; description?: string}[] = 
    graph?.globalNodes.map(n => ({
      id: n.id,
      name: n.name,
      tier: n.tier,
      description: n.description
    })) || [];
  
  try {
    const queue: string[][] = [];
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      queue.push(questions.slice(i, i + BATCH_SIZE));
    }

    const deltaGraphs: KnowledgeGraph[] = [];

    while (queue.length) {
      const batch = queue.shift()!;

      const { data, error } = await supabase.functions.invoke('generate-graph', {
        body: { 
          questions: batch,
          // Send ACCUMULATED nodes including previous batches
          existingNodes: accumulatedNodes.length > 0 ? accumulatedNodes : undefined
        },
      });

      // ... error handling ...

      const deltaGraph = normalizeGraphPayload(data);
      deltaGraphs.push(deltaGraph);
      
      // ACCUMULATE new nodes for next batch
      for (const node of deltaGraph.globalNodes) {
        if (!accumulatedNodes.some(n => n.id === node.id)) {
          accumulatedNodes.push({
            id: node.id,
            name: node.name,
            tier: node.tier,
            description: node.description
          });
        }
      }
    }
    // ... rest of merge logic
  }
}, [graph]);
```

### Part 2: Send Richer Node Context to AI

**File**: `supabase/functions/generate-graph/index.ts`

Update the incremental prompt to include more context:

```typescript
const incrementalPromptAddition = `

=== INCREMENTAL MODE (STRICT REUSE) ===

You are EXTENDING an existing skill graph. CRITICAL RULES:

1. SEMANTIC MATCHING (not just name matching):
   - If an existing skill covers the SAME cognitive capability, use its EXACT ID
   - Match by MEANING, not just keywords
   - Example: "dict_operations" and "dictionary manipulation" = SAME skill → use existing ID
   
2. MATCHING CRITERIA:
   A skill matches if ANY of these are true:
   - Tests the same underlying cognitive ability
   - Would have identical prerequisite edges
   - A question requiring skill A would also require skill B (and vice versa)
   
3. NEVER CREATE DUPLICATES:
   Before creating ANY new skill, ask:
   "Is there an existing skill that tests this SAME capability?"
   If YES → MUST use existing ID
   If NO → create new skill
   
4. OUTPUT REQUIREMENTS:
   - Return ONLY genuinely new skills (not in existing list)
   - Include edges connecting new skills to existing skills
   - For question paths, use existing skill IDs when they match

Existing skills (MUST reuse these IDs when capability matches):
`;

// Build richer node context
if (isIncremental) {
  const nodeList = existingNodes!
    .map(n => `- ${n.id}: "${n.name}"${n.tier ? ` [${n.tier}]` : ''}${n.description ? ` - ${n.description.substring(0, 50)}...` : ''}`)
    .join('\n');
  fullSystemPrompt += incrementalPromptAddition + nodeList;
}
```

### Part 3: Add Semantic Deduplication in mergeGraphs

**File**: `src/lib/graph/mergeGraphs.ts`

Add a post-merge semantic deduplication pass:

```typescript
import type { GraphEdge, GraphNode, KnowledgeGraph, QuestionPath } from "@/types/graph";

// Semantic similarity heuristic - checks if two skills are likely duplicates
function areSemanticallyEquivalent(a: GraphNode, b: GraphNode): boolean {
  // Normalize names for comparison
  const normalize = (s: string) => s.toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const nameA = normalize(a.name);
  const nameB = normalize(b.name);
  
  // Exact match after normalization
  if (nameA === nameB) return true;
  
  // Check if one contains the other (e.g., "dictionary operations" vs "dict operations")
  const wordsA = new Set(nameA.split(' '));
  const wordsB = new Set(nameB.split(' '));
  
  // If 80%+ word overlap and same tier, likely duplicate
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const overlapRatio = intersection.length / Math.max(wordsA.size, wordsB.size);
  
  if (overlapRatio >= 0.6 && a.tier === b.tier) return true;
  
  return false;
}

// Deduplicate semantically similar nodes
function deduplicateSemanticDuplicates(
  nodes: GraphNode[], 
  edges: GraphEdge[], 
  questionPaths: Record<string, QuestionPath | string[]>
): { nodes: GraphNode[]; edges: GraphEdge[]; questionPaths: Record<string, QuestionPath | string[]> } {
  const idMapping = new Map<string, string>(); // old ID → canonical ID
  const canonicalNodes: GraphNode[] = [];
  
  for (const node of nodes) {
    // Check if this node is a semantic duplicate of an existing canonical node
    const existingCanonical = canonicalNodes.find(c => areSemanticallyEquivalent(c, node));
    
    if (existingCanonical) {
      // Map this node's ID to the canonical ID
      idMapping.set(node.id, existingCanonical.id);
      
      // Merge appearsInQuestions
      const existingQuestions = existingCanonical.knowledgePoint?.appearsInQuestions || [];
      const newQuestions = node.knowledgePoint?.appearsInQuestions || [];
      existingCanonical.knowledgePoint = { 
        ...existingCanonical.knowledgePoint, 
        appearsInQuestions: [...new Set([...existingQuestions, ...newQuestions])]
      };
    } else {
      canonicalNodes.push(node);
      idMapping.set(node.id, node.id);
    }
  }
  
  // Remap edge IDs
  const remappedEdges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  
  for (const edge of edges) {
    const from = idMapping.get(edge.from) || edge.from;
    const to = idMapping.get(edge.to) || edge.to;
    const key = `${from}:${to}`;
    
    if (!edgeSet.has(key) && from !== to) { // Avoid self-loops
      edgeSet.add(key);
      remappedEdges.push({ ...edge, from, to });
    }
  }
  
  // Remap question paths
  const remappedPaths: Record<string, QuestionPath | string[]> = {};
  for (const [question, path] of Object.entries(questionPaths)) {
    if (Array.isArray(path)) {
      remappedPaths[question] = path.map(id => idMapping.get(id) || id);
    } else {
      remappedPaths[question] = {
        ...path,
        requiredNodes: path.requiredNodes?.map(id => idMapping.get(id) || id),
        executionOrder: path.executionOrder?.map(id => idMapping.get(id) || id),
        primarySkill: path.primarySkill ? (idMapping.get(path.primarySkill) || path.primarySkill) : undefined
      };
    }
  }
  
  return { nodes: canonicalNodes, edges: remappedEdges, questionPaths: remappedPaths };
}

export function mergeGraphs(graphs: KnowledgeGraph[]): KnowledgeGraph {
  // ... existing merge logic ...
  
  // After initial merge, apply semantic deduplication
  const dedupResult = deduplicateSemanticDuplicates(
    Array.from(nodeMap.values()),
    edges,
    questionPaths
  );
  
  return {
    globalNodes: dedupResult.nodes,
    edges: dedupResult.edges,
    courses,
    questionPaths: dedupResult.questionPaths,
    ipaByQuestion: Object.keys(ipaByQuestion).length ? ipaByQuestion : undefined,
  };
}
```

### Part 4: Add Duplicate Detection Logging

**File**: `src/lib/graph/mergeGraphs.ts`

Add console warnings when duplicates are detected:

```typescript
if (existingCanonical) {
  console.warn(
    `[mergeGraphs] Semantic duplicate detected: "${node.name}" (${node.id}) ` +
    `merged into "${existingCanonical.name}" (${existingCanonical.id})`
  );
  // ... rest of merge logic
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/KnowledgeGraphApp.tsx` | Accumulate nodes across batches, send richer context |
| `supabase/functions/generate-graph/index.ts` | Strengthen incremental prompt with strict reuse rules |
| `src/lib/graph/mergeGraphs.ts` | Add semantic deduplication pass after merge |

---

## Expected Outcome

| Before | After |
|--------|-------|
| Each batch gets same stale context | Each batch gets accumulated context |
| Only ID+name sent to AI | ID+name+tier+description sent |
| "Reuse if matches" (suggestion) | "NEVER create duplicates" (requirement) |
| Merge by exact ID only | Merge by ID + semantic similarity |
| Silent duplicates | Logged warnings when duplicates detected |
