
# Pivot: Skill Taxonomy + Graph Persistence

## The Problem with Current Approach

The current system encourages **decomposition** ("Can I split this further?"), creating:
- 74 nodes for 72 questions (1:1 ratio = wrong)
- Context-specific nodes like "Using nested loops for pyramid printing"
- Minimal node reuse across questions

## Target Architecture

```text
CURRENT (Atomic Decomposition):
Question: "Print a pyramid pattern"
  └── Nested loop for pyramid printing  ← Context-specific
  └── Printing spaces before stars      ← Too granular
  └── Calculating row width             ← Too granular

PROPOSED (Skill Taxonomy):
Question: "Print a pyramid pattern"
  └── Nested Loop Iteration    ← Transferable skill (reused 50+ times)
  └── String Building          ← Transferable skill (reused 30+ times)
  └── Pattern Recognition      ← Transferable skill (reused 20+ times)
```

---

## Part 1: New Skill Taxonomy Model

### Skill Tiers (Not Atomic Operations)

| Tier | Description | Example | Target Count |
|------|-------------|---------|--------------|
| **Foundational** | Language primitives everyone knows | Variables, Operators | 10-15 skills |
| **Core** | Building-block patterns | Iteration, Conditionals, Data Structures | 20-40 skills |
| **Applied** | Combining patterns for tasks | Sorting, Searching, Accumulation | 30-50 skills |
| **Advanced** | Complex problem-solving patterns | Dynamic Programming, Graph Traversal | 20-40 skills |

**Target**: ~100-150 total skills for a comprehensive programming curriculum

### Skill Definition Criteria (NEW)

A skill should be:
1. **Transferable**: Applies across 5+ different problem contexts
2. **Teachable**: Can be explained and practiced as a unit
3. **Assessable**: Can be tested (but multiple questions can test same skill)
4. **Named generically**: "Nested Loop Iteration" NOT "Nested loops for printing pyramids"

### Examples of Proper Skill Granularity

**TOO GRANULAR (Current System Creates)**:
- "Initializing empty dictionary for frequency counting"
- "Incrementing dictionary value for word count"
- "Using nested loop for pyramid pattern"
- "Using nested loop for matrix traversal"

**CORRECT LEVEL (Proposed)**:
- "Dictionary Operations" (covers init, access, update, delete)
- "Nested Loop Iteration" (covers all 2D iteration patterns)
- "Accumulator Pattern" (covers counting, summing, collecting)
- "String Manipulation" (covers building, parsing, formatting)

---

## Part 2: Revised AI Prompt Strategy

### New System Prompt Philosophy

Replace the "atomicity test" with a "transferability test":

```text
=== SKILL IDENTIFICATION PRINCIPLES ===

1. TRANSFERABLE SKILLS (Not Atomic Operations)
   Each node represents a SKILL that applies across many problem types.
   
   TEST: "Does this skill apply to 5+ different problems?"
   If NO → Too specific, generalize it
   If YES → Good skill level
   
   WRONG: "Using nested loops for pyramid printing" (context-specific)
   WRONG: "Incrementing a counter in a loop" (too fine)
   RIGHT: "Nested Loop Iteration" (applies to pyramids, matrices, grids, etc.)
   RIGHT: "Accumulator Pattern" (applies to counting, summing, collecting)

2. SKILL CONSOLIDATION (Not Decomposition)
   When you see similar operations, MERGE them into one skill.
   
   MERGE THESE INTO ONE:
   - "Nested loops for pyramids" + "Nested loops for matrices" → "Nested Loop Iteration"
   - "Counting words" + "Counting characters" + "Summing values" → "Accumulator Pattern"

3. SKILL HIERARCHY
   Level 0: Fundamentals (variables, operators, basic types)
   Level 1: Control Flow (conditionals, loops, functions)
   Level 2: Data Structures (lists, dicts, sets)
   Level 3: Patterns (accumulator, search, sort)
   Level 4: Advanced (recursion, DP, graphs)

4. TARGET METRICS
   - 1 skill per 5-15 questions on average
   - High reuse: each skill should appear in 10%+ of questions
   - Total skills: aim for 100-200 for a full curriculum
```

### Updated Output Format

```json
{
  "skills": [
    {
      "id": "nested_loop_iteration",
      "name": "Nested Loop Iteration",
      "tier": "core",
      "level": 2,
      "description": "Using loops within loops to traverse 2D structures or generate patterns",
      "transferableContexts": [
        "Matrix traversal",
        "Pattern printing",
        "Grid operations",
        "Combination generation"
      ],
      "prerequisites": ["basic_loop", "variable_scope"],
      "appearsInQuestions": ["Q1", "Q5", "Q12", "Q34", ...]
    }
  ],
  "edges": [...],
  "questionMappings": {
    "Print a pyramid pattern": {
      "skills": ["nested_loop_iteration", "string_building", "pattern_recognition"],
      "primarySkill": "nested_loop_iteration"
    }
  }
}
```

---

## Part 3: Database Persistence

### New Tables

**Table: `knowledge_graphs`**
```sql
CREATE TABLE knowledge_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  total_skills INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0
);
```

**Table: `skills`**
```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL, -- e.g., "nested_loop_iteration"
  name TEXT NOT NULL,
  tier TEXT NOT NULL, -- foundational, core, applied, advanced
  level INTEGER NOT NULL,
  description TEXT,
  transferable_contexts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(graph_id, skill_id)
);
```

**Table: `skill_edges`**
```sql
CREATE TABLE skill_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  from_skill TEXT NOT NULL,
  to_skill TEXT NOT NULL,
  relationship_type TEXT DEFAULT 'requires',
  reason TEXT,
  UNIQUE(graph_id, from_skill, to_skill)
);
```

**Table: `questions`**
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  skills TEXT[] NOT NULL, -- Array of skill_ids
  primary_skill TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### API Changes

- `POST /generate-graph` → Returns skill taxonomy (not atomic nodes)
- `POST /save-graph` → Persists graph to database
- `GET /graphs` → List saved graphs
- `GET /graphs/:id` → Load specific graph
- `DELETE /graphs/:id` → Delete graph

---

## Part 4: UI Updates

### Graph Management
- Add "Save Graph" button in header
- Add "My Graphs" sidebar/dropdown to load saved graphs
- Add "New Graph" option to start fresh
- Show graph name in header when loaded

### Skill Display Changes
- Show tier badges (Foundational, Core, Applied, Advanced)
- Show "appears in X questions" count prominently
- Group skills by tier in legend

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-graph/index.ts` | Complete prompt rewrite for skill taxonomy |
| `src/types/graph.ts` | Add Skill type, update interfaces for new model |
| `src/components/KnowledgeGraphApp.tsx` | Add save/load functionality, graph management |
| `src/lib/graph/mergeGraphs.ts` | Update for skill-based merging |
| Database | Create new tables for persistence |

---

## Implementation Order

1. **Database setup**: Create tables for graph persistence
2. **Prompt rewrite**: Change AI from atomic decomposition to skill taxonomy
3. **Type updates**: Align TypeScript types with new model
4. **Save/Load UI**: Add graph management features
5. **Test with your 72 questions**: Verify ~15-25 skills instead of 74 nodes

---

## Expected Outcomes

| Metric | Current | Target |
|--------|---------|--------|
| Nodes per 72 questions | 74 | 15-25 |
| Node reuse rate | ~1 question/node | 3-5 questions/node |
| Nodes for 1000 questions | ~1000 | 80-150 |
| Graph readability | Dense, overwhelming | Clear skill hierarchy |

---

## Key Prompt Changes (Summary)

**Remove**:
- "Can I split this further?" test
- "Atomic knowledge points" concept
- "5-8 nodes per question" target

**Add**:
- "Does this skill apply to 5+ problems?" test
- "Transferable skill" concept
- "1 skill per 5-15 questions" target
- Skill consolidation instructions
- Tier-based hierarchy (Foundational → Advanced)
