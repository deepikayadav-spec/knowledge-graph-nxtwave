

# Improve Node Granularity and IPA Prompt Engineering

## Overview
Transform the AI prompt from a single-pass "generate everything at once" approach to a structured multi-phase process that produces atomic, teachable cognitive capabilities with proper granularity - more aligned with how Math Academy manually constructs their knowledge graph.

---

## Current Problems

### 1. Single-Pass Generation
The current prompt asks the AI to do everything at once:
- Identify mental steps (IPA)
- Normalize/merge nodes
- Create edges with reasons
- Compute levels
- Generate CME/LE metrics

This leads to **composite nodes** that bundle multiple cognitive operations.

### 2. Poor Granularity Examples

| Current (Too Coarse) | Should Be (Atomic) |
|---------------------|-------------------|
| "Accumulating multiple values per key" | "Initializing empty collection for accumulation" + "Appending item to existing collection" + "Creating new key with initial value" |
| "Counting occurrences of elements" | "Recognizing need for frequency tracking" + "Initializing counter structure" + "Incrementing counter value" + "Retrieving count for key" |
| "Performing set operations" | "Recognizing union scenario" + "Recognizing intersection scenario" + "Recognizing difference scenario" + "Applying union operation" + "Applying intersection operation" |

### 3. Missing Knowledge Point Structure
Math Academy uses **knowledge points** (not just topics):
- Each topic has 3-4 knowledge points
- Each knowledge point is a single assessable capability
- Knowledge points have explicit target assessment levels

### 4. No Assessment Level Targeting
Current nodes don't specify WHAT level they're teaching to:
- Is this node teaching Recognition? Application? Transfer?
- The `highestConceptLevel` is supposed to come from student data, not be generated

---

## Proposed Solution: Three-Phase Prompt Architecture

### Phase 1: IPA Extraction (Raw Mental Steps)

For each question, extract explicit mental operations:

```text
PHASE 1: INFORMATION PROCESSING ANALYSIS

For EACH question, perform detailed IPA:

Question: "Count word frequencies in a text"

Mental Steps (in order of execution):
1. RECOGNIZE: Text needs to be split into words
2. RECALL: Method to split string by delimiter
3. APPLY: Initialize empty frequency structure
4. RECOGNIZE: Need to track each word's count
5. APPLY: Iterate through word list
6. CHECK: Does word exist in structure?
7. BRANCH-YES: Increment existing count
8. BRANCH-NO: Create new entry with count 1
9. RETURN: Final frequency structure

Output these as raw_steps[] for each question.
```

### Phase 2: Normalization (Canonical Nodes)

Merge identical operations across questions into canonical nodes:

```text
PHASE 2: NORMALIZE TO KNOWLEDGE POINTS

Group identical mental operations across all questions:
- "CHECK: Does word exist" + "CHECK: Does key exist" = "checking_key_existence"
- "Initialize empty structure" patterns = separate by structure type

Each knowledge point must be:
- ATOMIC: One cognitive operation, not a composite
- ASSESSABLE: Can write a question that tests ONLY this skill
- REUSABLE: Appears in multiple questions
- STABLE: Doesn't change based on context

Output format:
{
  "knowledgePoints": [
    {
      "id": "checking_key_existence",
      "name": "Checking whether a key exists in a mapping",
      "atomicity_check": "Tests exactly one thing: given a key and a mapping, determine presence",
      "assessment_example": "Given dict d and key k, write code to check if k exists",
      "appears_in_questions": [1, 3, 5]
    }
  ]
}
```

### Phase 3: LTA + Prerequisites

Build the prerequisite graph:

```text
PHASE 3: LEARNING TASK ANALYSIS

For each knowledge point, identify prerequisites:
- What must the learner ALREADY KNOW to learn this?
- NOT what they do simultaneously

Prerequisite Criteria:
1. NECESSARY: Cannot learn B without knowing A
2. DIRECT: A is immediately used in B, not transitively
3. MINIMAL: Don't include A if A's prerequisites also cover it

Edge format:
{
  "from": "prerequisite_id",
  "to": "dependent_id", 
  "reason": "Specific explanation of why A must come before B",
  "relationship_type": "requires" | "builds_on" | "extends"
}
```

---

## New Data Structures

### Enhanced GraphNode Type

```typescript
export interface GraphNode {
  id: string;
  name: string;
  level: number; // Computed from prerequisites, not AI-set
  
  // NEW: Knowledge Point metadata
  knowledgePoint: {
    atomicityCheck: string;     // Self-check that this is truly atomic
    assessmentExample: string;  // Sample question that tests ONLY this skill
    targetAssessmentLevel: 1 | 2 | 3 | 4; // What level we TEACH to (1-4 only)
    appearsInQuestions: string[]; // Which input questions use this
  };
  
  // CHANGED: CME becomes student-measured, not AI-generated
  cme: {
    measured: boolean; // false until student data exists
    highestConceptLevel: number; // 0 until measured
    independence: 'Unknown' | 'Independent' | 'Lightly Scaffolded' | 'Heavily Assisted';
    retention: 'Unknown' | 'Current' | 'Aging' | 'Expired';
  };
  
  // CHANGED: LE becomes estimated vs measured
  le: {
    estimated: boolean;
    estimatedMinutes: number; // AI estimate
    measuredMinutes?: number; // From student data
  };
  
  description?: string;
}
```

### Question Path Validation

```typescript
export interface QuestionPath {
  question: string;
  requiredNodes: string[];     // All nodes needed
  executionOrder: string[];    // Order they're used
  validationStatus: 'valid' | 'missing_prereqs' | 'invalid_order';
  validationErrors?: string[];
}
```

---

## New Prompt Structure

### Complete System Prompt

```text
You are a Knowledge Graph Engineer that analyzes coding questions to build cognitive capability graphs following the Math Academy methodology.

=== CRITICAL PRINCIPLES ===

1. ATOMIC KNOWLEDGE POINTS
   Each node must represent ONE cognitive operation that can be:
   - Taught in isolation (with prerequisites)
   - Assessed with a single question
   - Described in one sentence starting with a verb

   WRONG: "Working with dictionaries" (topic, not skill)
   WRONG: "Counting word frequencies" (composite operation)
   RIGHT: "Initializing an empty dictionary"
   RIGHT: "Checking if a key exists in a dictionary"
   RIGHT: "Incrementing a numeric value at a key"

2. GRANULARITY TEST
   For each proposed node, ask: "Can I split this further?"
   If yes, split it. If you reach operations like "using the + operator",
   you've gone too fine - those are language primitives, not teachable skills.

3. PREREQUISITE PRECISION
   A prerequisite edge means: "You CANNOT learn B without knowing A"
   NOT: "A is related to B" or "A is commonly used with B"

=== PROCESS ===

STEP 1: IPA (Information Processing Analysis)
For each question, list every cognitive step in execution order:
- What must be RECOGNIZED? (patterns, problem types)
- What must be RECALLED? (syntax, methods, concepts)
- What must be APPLIED? (combining knowledge to write code)
- What DECISIONS are made? (conditionals, edge cases)

Output as:
"ipaByQuestion": {
  "Question text": [
    {"step": 1, "type": "RECOGNIZE", "operation": "Need to track frequencies"},
    {"step": 2, "type": "RECALL", "operation": "Dictionary is appropriate for key-value mapping"},
    ...
  ]
}

STEP 2: NORMALIZE
- Group identical operations across questions
- Create ONE knowledge point for each unique operation
- Verify atomicity: can this be split further?

STEP 3: BUILD PREREQUISITES
- For each knowledge point, list what must be known BEFORE
- Include ONLY direct prerequisites (not transitive)
- Write specific reasons for each edge

STEP 4: VALIDATE
- Trace each question through its knowledge points
- Verify prerequisites are satisfied in order
- Flag any missing nodes or broken paths

=== OUTPUT FORMAT ===

{
  "ipaByQuestion": { ... },
  
  "globalNodes": [
    {
      "id": "snake_case_id",
      "name": "Verb-phrase describing the cognitive operation",
      "description": "One sentence explanation",
      "knowledgePoint": {
        "atomicityCheck": "Why this cannot be split further",
        "assessmentExample": "Sample question testing ONLY this skill",
        "targetAssessmentLevel": 3,
        "appearsInQuestions": ["Question 1", "Question 3"]
      },
      "cme": {
        "measured": false,
        "highestConceptLevel": 0,
        "independence": "Unknown",
        "retention": "Unknown"
      },
      "le": {
        "estimated": true,
        "estimatedMinutes": 15
      }
    }
  ],
  
  "edges": [
    {
      "from": "prereq_id",
      "to": "dependent_id",
      "reason": "Specific reason why from must come before to",
      "relationshipType": "requires"
    }
  ],
  
  "questionPaths": {
    "Question text": {
      "requiredNodes": ["node1", "node2"],
      "executionOrder": ["node1", "node2"],
      "validationStatus": "valid"
    }
  },
  
  "courses": { ... }
}
```

---

## Granularity Guidelines

### Too Coarse (BAD)
- "Dictionary operations" - Topic, not skill
- "Counting frequencies" - Composite of 5+ skills
- "Data manipulation" - Vague category

### Just Right (GOOD)
- "Initializing an empty dictionary" - One action
- "Checking if key exists in dictionary" - One decision
- "Appending to a list value in a dictionary" - One operation
- "Retrieving value with default fallback" - One operation

### Too Fine (BAD)
- "Using the [] operator" - Language primitive
- "Typing a variable name" - Too mechanical
- "Understanding what = means" - Too basic

### Decomposition Example

**Original**: "Counting word frequencies in text"

**Decomposed**:
1. "Recognizing frequency-counting pattern" (RECOGNIZE)
2. "Splitting string into word list" (APPLY)
3. "Initializing empty frequency dictionary" (APPLY)
4. "Iterating through a list" (APPLY - reused from other skills)
5. "Checking key existence in dictionary" (APPLY - reused)
6. "Incrementing numeric value at key" (APPLY)
7. "Inserting new key with initial value" (APPLY)

Nodes 4, 5, 6, 7 are **reusable** across many questions.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-graph/index.ts` | Complete prompt rewrite with 4-step process |
| `src/types/graph.ts` | Add `knowledgePoint` interface, update CME/LE structures |
| `src/data/sampleGraph.ts` | Update sample to match new structure |
| `src/components/panels/NodeDetailPanel.tsx` | Display new fields (atomicity, assessment example) |
| `src/components/graph/GraphNode.tsx` | Handle `measured: false` state visually |

---

## Validation & Quality Checks

The AI should perform these checks before outputting:

1. **Atomicity Check**: For each node, verify it can't be split
2. **Assessment Check**: Verify the assessment example tests ONLY that skill
3. **Prerequisite Check**: Verify no circular dependencies
4. **Path Check**: Verify each question's path follows valid prerequisite order
5. **Coverage Check**: Verify all IPA steps map to nodes

---

## Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| Average nodes per question | 2-3 | 5-8 |
| Node reuse across questions | ~30% | ~60%+ |
| Composite nodes | Common | Rare |
| Assessment clarity | Vague | Specific |
| Prerequisite precision | Loose | Strict |

---

## Implementation Order

1. Update `src/types/graph.ts` with new interfaces
2. Rewrite the edge function prompt in `generate-graph/index.ts`
3. Update sample data to match new structure
4. Update NodeDetailPanel to display new fields
5. Add visual indicator for "unmeasured" nodes
6. Test with various question sets

