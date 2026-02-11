

# Add "Problem Solving" as Topic 17

## What Changes

Append **"Problem Solving"** as **Topic 17** after "Miscellaneous Topics" (Topic 16).

## File: `supabase/functions/generate-graph/index.ts`

### 1. Update inline prompt text (line 431)
Add line after "Miscellaneous Topics":
```
16. Miscellaneous Topics
17. Problem Solving
```

### 2. Update `CURRICULUM_TOPICS` array (line 451)
Add `"Problem Solving"` after `"Miscellaneous Topics"`.

### 3. Update `SKILL_TOPIC_MAP` (after line 497)
Add problem-solving related skills at topic 17:
- `problem_solving: 17`
- `algorithmic_thinking: 17`
- `debugging: 17`

## File: `src/lib/graph/mergeGraphs.ts`

No changes needed -- no new mandatory edges required since Problem Solving is a capstone topic that can draw from any prior skill naturally.

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-graph/index.ts` | Update prompt text, `CURRICULUM_TOPICS` array, and `SKILL_TOPIC_MAP` |

