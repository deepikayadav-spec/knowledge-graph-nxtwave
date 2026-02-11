

# Fix "New PF" Graph + Harden Generation Logic

## Part 1: Fix Existing Graph (Database Surgery)

These are direct SQL operations on graph `f284056c-ad2a-4011-9f09-d9f1dd683417`.

### 1A. Insert missing prerequisite edges

| Edge | Reason |
|------|--------|
| `loop_iteration -> set_operations` | Sets require iteration to build |
| `list_operations -> set_operations` | Sets are often created from lists |
| `loop_iteration -> dictionary_operations` (already exists) | Verified present |
| `conditional_branching -> filter_pattern` | Currently goes through `input_parsing` instead of direct |

### 1B. Remove incorrect edge

| Edge to remove | Why |
|----------------|-----|
| `variable_assignment -> basic_output` | Violates the independence rule -- `basic_output` is a foundational skill that doesn't require `variable_assignment` |

### 1C. Recompute all levels

After edge changes, add a `recomputeAndSaveLevels()` function to `useGraphPersistence.ts` that:
1. Loads all edges for a graph from DB
2. Runs topological sort: `level = 0` if no incoming, else `1 + max(prereq levels)`
3. Batch-updates the `skills` table

Add a "Recompute Levels" button to `GraphManagerPanel.tsx`.

After recomputation, the corrected levels will be:
- `variable_assignment` stays L0
- `type_recognition` stays L0
- `arithmetic_operations` moves from L3 to L0 (foundational, independence rule)
- `basic_output` moves from L1 to L0 (foundational, after removing bad edge)
- `set_operations` moves from L0 to L9 (after `list_operations` at L8)
- All downstream nodes cascade correctly

---

## Part 2: Harden Generation Logic (Prevent Future Anomalies)

### 2A. Update curriculum topic list

Add "Intro to Matrices & Shorthand Expressions" as Topic 12 in `supabase/functions/generate-graph/index.ts`:
- Inline prompt text (lines 416-429)
- `CURRICULUM_TOPICS` array (lines 433-448)

New sequence: 15 topics total.

### 2B. Add `SKILL_TOPIC_MAP` for hard enforcement

Create a mapping of every known skill to its earliest allowed topic position in the edge function:

```text
variable_assignment       -> 1
basic_output              -> 2
basic_input               -> 2
type_recognition          -> 1
type_conversion           -> 2
arithmetic_operations     -> 3
comparison_operators      -> 3
boolean_logic             -> 3
conditional_branching     -> 3
nested_conditions         -> 4
loop_iteration            -> 5
loop_control_statements   -> 6
string_methods            -> 7
string_concatenation      -> 2
string_indexing           -> 2
string_slicing            -> 2
string_repetition         -> 2
string_methods            -> 7
list_operations           -> 8
function_definition       -> 9
function_calls            -> 9
recursion                 -> 10
tuple_operations          -> 11
set_operations            -> 11
dictionary_operations     -> 13
(patterns like accumulator, search, filter -> 5, since they require loops)
```

### 2C. Programmatic post-generation node filter

After the AI response is parsed but before mandatory edge injection, add a filter step:

1. Determine max topic position from the `topicMap` sent by the client (highest topic number in the batch)
2. For each node in `graphData.globalNodes`, check `SKILL_TOPIC_MAP[node.id]`
3. If the skill's topic position exceeds `maxTopicPosition`, strip it out along with its edges and question path references
4. Log warnings for removed nodes

This is the hard enforcement layer -- even if the AI hallucinates a `dictionary_operations` node for Topic 5 questions, it gets removed.

### 2D. Add missing mandatory edges

Add to both `generate-graph/index.ts` and `src/lib/graph/mergeGraphs.ts`:

| New mandatory edge | Reason |
|-------------------|--------|
| `loop_iteration -> set_operations` | Sets require iteration |
| `list_operations -> set_operations` | Sets built from lists |
| `loop_iteration -> list_operations` | List building requires looping |
| `loop_iteration -> filter_pattern` | Filtering requires iterating |
| `loop_iteration -> transform_pattern` | Transforming requires iterating |
| `conditional_branching -> loop_iteration` | Loops use conditions for termination |

### 2E. Fix independence rule enforcement

The edge function prompt says `variable_assignment`, `basic_output`, `arithmetic_operations`, and `type_recognition` are independent Level 0 skills. But the AI sometimes creates edges between them (e.g., `variable_assignment -> basic_output`).

Add a programmatic post-processing step that strips any edges where BOTH endpoints are in the independence set:

```text
INDEPENDENT_FOUNDATIONAL = {variable_assignment, basic_output, arithmetic_operations, type_recognition}
Remove edge if (from IN set AND to IN set)
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-graph/index.ts` | Update curriculum (2 places), add `SKILL_TOPIC_MAP`, add post-generation filter, add mandatory edges, add independence rule enforcement |
| `src/lib/graph/mergeGraphs.ts` | Add mandatory edges for `set_operations`, `list_operations`, `filter_pattern`, `transform_pattern`; add independence rule enforcement |
| `src/hooks/useGraphPersistence.ts` | Add `recomputeAndSaveLevels()` function |
| `src/components/panels/GraphManagerPanel.tsx` | Add "Recompute Levels" button |

## Execution Order

1. Code changes to all 4 files
2. Deploy updated edge function
3. Insert missing edges + remove bad edge via SQL for "New PF" graph
4. Trigger "Recompute Levels" from the UI to fix all level values

After this:
- The existing "New PF" graph will have correct levels and edges
- Future generations will have hard programmatic enforcement of the curriculum sequence
- No more orphaned Level 0 non-foundational nodes
- No more out-of-sequence skill creation

