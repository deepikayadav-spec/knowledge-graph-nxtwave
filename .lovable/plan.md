
# Rewrite Edge Function: IPA → LTA → Normalize → DAG Pipeline

## Overview

Completely rewrite the `generate-graph` edge function to follow the exact methodology from the IPA/LTA document, replacing the current "Transferable Skills" approach with a structured 4-phase cognitive decomposition pipeline.

---

## Current vs. Proposed Pipeline

```text
CURRENT APPROACH:
┌─────────────┐
│  Questions  │ ──▶ AI identifies "transferable skills" ──▶ Graph
└─────────────┘     (single-pass, intuitive grouping)

PROPOSED IPA/LTA PIPELINE:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Questions  │ ──▶ │  Phase 1:   │ ──▶ │  Phase 2:   │ ──▶ │  Phase 3:   │ ──▶ │  Phase 4:   │
│             │     │  IPA        │     │  LTA        │     │  Normalize  │     │  Build DAG  │
└─────────────┘     │  (Trace     │     │  (Extract   │     │  (Dedupe,   │     │  (Prereq    │
                    │  cognitive  │     │  knowledge  │     │  unify,     │     │  edges,     │
                    │  algorithm) │     │  & skills)  │     │  atomize)   │     │  levels)    │
                    └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Phase 1: Information Processing Analysis (IPA)

### Purpose
Trace the **cognitive algorithm** a competent student uses to solve each question.

### IPA Step Types (from document)
| Step Type | Description | Example |
|-----------|-------------|---------|
| PERCEIVE | Notice relevant features in input | "See that input has multiple lines" |
| ENCODE | Transform input into mental representation | "Parse as list of integers" |
| RETRIEVE | Recall knowledge from long-term memory | "Recall dictionary syntax" |
| DECIDE/PLAN | Choose strategy or branch | "If count needed, use accumulator" |
| EXECUTE | Perform computational action | "Initialize empty dict" |
| MONITOR | Check correctness, handle edge cases | "Verify no KeyError" |

### Example IPA Output
```json
{
  "question": "Count frequency of each word in a sentence",
  "ipaSteps": [
    {"step": 1, "type": "PERCEIVE", "operation": "Identify input as string with spaces"},
    {"step": 2, "type": "ENCODE", "operation": "Split string into word list"},
    {"step": 3, "type": "RETRIEVE", "operation": "Recall dictionary for counting"},
    {"step": 4, "type": "DECIDE", "operation": "Choose iteration with accumulation"},
    {"step": 5, "type": "EXECUTE", "operation": "For each word: check/update dict"},
    {"step": 6, "type": "MONITOR", "operation": "Handle case-sensitivity, punctuation"}
  ]
}
```

---

## Phase 2: Learning Task Analysis (LTA)

### Purpose
For each IPA step, identify the **specific knowledge, procedures, and judgments** required.

### LTA Categories (from document)
| Category | Description | Example |
|----------|-------------|---------|
| **Declarative** | Facts, definitions, syntax | "dict[key] = value syntax" |
| **Procedural** | How-to sequences | "Steps to iterate with enumerate" |
| **Conditional** | When to apply what | "Use .get() when key might not exist" |
| **Strategic** | High-level planning | "Accumulator pattern for counting" |

### The "Without X?" Test
For each candidate skill, ask: **"Can a student reliably perform this step WITHOUT having mastered X?"**
- If NO → X is a prerequisite
- If YES → X is not required (don't add edge)

### Example LTA Output
```json
{
  "ipaStep": "Split string into word list",
  "requiredKnowledge": [
    {"id": "string_methods", "type": "declarative", "content": "str.split() method exists"},
    {"id": "list_creation", "type": "procedural", "content": "How to store result in variable"},
    {"id": "whitespace_handling", "type": "conditional", "content": "split() handles multiple spaces"}
  ]
}
```

---

## Phase 3: Normalization (Skill Taxonomy)

### Purpose
Convert raw LTA outputs into a **unified skill vocabulary** that prevents node explosion.

### Normalization Rules (from document)

1. **Synonym Unification**: Merge nodes with identical observable behavior
   - "Initialize empty dict" + "Create new dictionary" → `dict_initialization`
   
2. **Atomicity Split**: Break compound skills until single-testable
   - "Use dictionary for counting" → `dict_initialization` + `dict_key_access` + `dict_value_update`

3. **Tier Assignment**: Classify by complexity level
   - Foundational: Language primitives (variables, operators)
   - Core: Control structures (loops, conditionals)
   - Applied: Patterns (accumulator, search)
   - Advanced: Complex algorithms (recursion, DP)

4. **Transferability Check**: Ensure skill applies across contexts
   - If skill is context-specific, generalize or merge with similar

### Skill Node Schema
```json
{
  "id": "snake_case_unique_id",
  "name": "Human-Readable Skill Name",
  "tier": "foundational|core|applied|advanced",
  "type": "declarative|procedural|conditional|strategic",
  "description": "What mastery of this skill looks like",
  "atomicityCheck": "Can be tested with: [single question type]",
  "appearsInQuestions": ["Q1", "Q5", "Q12"]
}
```

---

## Phase 4: Build DAG (Directed Acyclic Graph)

### Purpose
Construct prerequisite edges using strict necessity criteria.

### Edge Rules (from document)

1. **Necessity Test**: Only add edge A → B if:
   - Performance on B is **unreliable** without A
   - A provides **essential** knowledge for B (not just helpful)

2. **Direction Flow**: Edges follow learning hierarchy:
   ```
   Concept → Procedure → Strategy → Performance
   Declarative → Procedural → Conditional → Strategic
   ```

3. **Transitivity Reduction**: Remove redundant edges
   - If A → B and B → C, don't add direct A → C

4. **Level Computation**:
   ```
   level(node) = 0 if no prerequisites
   level(node) = 1 + max(level(prereq) for prereq in prerequisites)
   ```

### Edge Schema
```json
{
  "from": "prerequisite_skill_id",
  "to": "dependent_skill_id",
  "reason": "Why B cannot be performed without A",
  "necessityScore": 0.9,
  "relationshipType": "requires|builds_on|extends"
}
```

---

## New System Prompt Structure

```text
You are a Knowledge Graph Engineer using the IPA/LTA methodology.

=== PHASE 1: INFORMATION PROCESSING ANALYSIS (IPA) ===

For each question, trace the cognitive algorithm:
1. PERCEIVE: What features does the solver notice?
2. ENCODE: How is input represented mentally?
3. RETRIEVE: What knowledge is recalled?
4. DECIDE/PLAN: What strategy is chosen?
5. EXECUTE: What actions are performed?
6. MONITOR: How is correctness verified?

=== PHASE 2: LEARNING TASK ANALYSIS (LTA) ===

For each IPA step, identify required skills:
- Declarative: Facts and syntax knowledge
- Procedural: Step-by-step how-to
- Conditional: When to apply what
- Strategic: High-level planning

Apply the "WITHOUT X?" test:
"Can this step be performed reliably WITHOUT skill X?"
- If NO → X is prerequisite
- If YES → X is not required

=== PHASE 3: NORMALIZATION ===

1. UNIFY synonyms (same observable behavior → same node)
2. SPLIT compounds (until single-testable)
3. ASSIGN tier (foundational/core/applied/advanced)
4. CHECK transferability (must apply to 5+ contexts)

=== PHASE 4: BUILD DAG ===

1. Add edge A→B only if B is UNRELIABLE without A
2. Flow: Declarative → Procedural → Conditional → Strategic
3. Remove transitive edges (if A→B→C, don't add A→C)
4. Compute levels from prerequisites

=== TARGET METRICS ===

- Skill count: 1 per 5-15 questions
- Edge density: 1.5-2.5 edges per node
- Reuse rate: Each skill in 10%+ of questions
- Max depth: 5-7 levels for typical curriculum

=== OUTPUT FORMAT ===

{
  "ipaByQuestion": { /* Raw IPA traces for transparency */ },
  "globalNodes": [ /* Normalized skill nodes */ ],
  "edges": [ /* Prerequisite relationships */ ],
  "questionPaths": { /* Question → skill mappings */ }
}
```

---

## Implementation Details

### File Changes

**`supabase/functions/generate-graph/index.ts`**
- Replace entire `systemPrompt` with IPA/LTA methodology
- Update output parsing to handle new `ipaByQuestion` field
- Add validation for edge necessity scores
- Keep incremental mode but update for new schema

### Updated Type Definitions

**`src/types/graph.ts`** - Add IPA step types:
```typescript
export interface IPAStep {
  step: number;
  type: 'PERCEIVE' | 'ENCODE' | 'RETRIEVE' | 'DECIDE' | 'EXECUTE' | 'MONITOR';
  operation: string;
}

export interface SkillNode {
  id: string;
  name: string;
  tier: 'foundational' | 'core' | 'applied' | 'advanced';
  type: 'declarative' | 'procedural' | 'conditional' | 'strategic';
  description: string;
  atomicityCheck: string;
  appearsInQuestions: string[];
}
```

---

## Consolidation Strategy (Preventing Node Explosion)

The key insight from combining IPA/LTA with your scalability needs:

### Two-Pass Approach

**Pass 1: IPA/LTA (Detailed)**
- Extract all cognitive steps and skills per question
- This may initially produce many nodes

**Pass 2: Normalize (Consolidate)**
- Merge nodes with same observable behavior
- Generalize context-specific nodes
- Apply transferability test (5+ contexts)
- Target: N/5 to N/3 final nodes for N questions

### Example Consolidation

```text
RAW LTA OUTPUT (before normalization):
- "Initialize empty dict for word counting"
- "Initialize empty dict for character frequency"
- "Create dictionary for storing grades"

AFTER NORMALIZATION:
- "Dictionary Initialization" (single node, appears in 3+ questions)
```

---

## Quality Validation Rules

After generation, validate:

1. **Node Count**: Should be questions/5 to questions/3
2. **Edge Density**: 1.5-2.5 edges per node average
3. **Reuse Rate**: 60%+ nodes appear in 2+ questions
4. **DAG Property**: No cycles in edge graph
5. **Level Distribution**: Nodes spread across 4-6 levels

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-graph/index.ts` | Complete rewrite of system prompt to IPA/LTA pipeline |
| `src/types/graph.ts` | Add IPAStep interface, update skill types |
| `src/lib/graph/mergeGraphs.ts` | Handle ipaByQuestion merging |

---

## Expected Outcomes

| Metric | Current | With IPA/LTA |
|--------|---------|--------------|
| Methodology | Intuitive grouping | Structured cognitive analysis |
| Transparency | Black box | IPA traces show reasoning |
| Node count (72 Qs) | 74 | 15-25 |
| Prerequisites | Ad-hoc | Necessity-tested |
| Scalability (1000 Qs) | ~1000 nodes | 80-150 nodes |
