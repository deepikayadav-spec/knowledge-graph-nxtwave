

# Fix Remaining Anomalies in "New PF" Graph

## What's Still Wrong

### 1. `arithmetic_operations` at Level 3 instead of Level 0
Two edges point INTO this foundational skill, pulling it up from Level 0:
- `type_conversion -> arithmetic_operations` (remove)
- `sequence_length_retrieval -> arithmetic_operations` (remove)

This cascades: `comparison_operators` (L4), `boolean_logic` (L5), `conditional_branching` (L6), `loop_iteration` (L7) -- all are 3 levels higher than they should be because `arithmetic_operations` is wrongly elevated.

### 2. Missing mandatory edges in the database
- `loop_iteration -> filter_pattern` -- not present
- `loop_iteration -> transform_pattern` -- not present

### 3. Independence rule is too narrow
The current rule only removes edges where BOTH endpoints are foundational. It needs to also remove edges where the TARGET is foundational, since foundational skills should have NO prerequisites.

## Fixes

### Database Surgery (SQL on graph `f284056c-...`)
1. DELETE edges: `type_conversion -> arithmetic_operations` and `sequence_length_retrieval -> arithmetic_operations`
2. INSERT edges: `loop_iteration -> filter_pattern` and `loop_iteration -> transform_pattern`
3. After SQL changes, user clicks "Levels" button to recompute all levels

### Code Fix: Broaden independence rule
In both `supabase/functions/generate-graph/index.ts` and `src/lib/graph/mergeGraphs.ts`, change the independence enforcement from:

```
Remove edge if (from IN foundational AND to IN foundational)
```

to:

```
Remove edge if (to IN foundational)
```

This means: no skill can ever be a prerequisite for a foundational skill. Foundational skills are always Level 0 with zero incoming edges.

### Expected levels after fix
- `arithmetic_operations`: 3 -> 0
- `comparison_operators`: 4 -> 1
- `boolean_logic`: 5 -> 2
- `conditional_branching`: 6 -> 3
- `loop_iteration`: 7 -> 4
- All downstream nodes shift down by 3 levels accordingly

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-graph/index.ts` | Broaden independence rule to strip edges where target is foundational |
| `src/lib/graph/mergeGraphs.ts` | Same independence rule fix |

## Execution Order
1. Delete the 2 bad edges + insert 2 missing edges via SQL
2. Update independence rule in both code files
3. Deploy edge function
4. Click "Levels" button in UI to recompute

