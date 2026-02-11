

# Add "Abstraction and Polymorphism" to Curriculum Sequence

## What Changes

Insert **"Abstraction and Polymorphism"** as **Topic 15** after "Introduction to Object Oriented Programming" (Topic 14), pushing "Miscellaneous Topics" to **Topic 16**.

## File: `supabase/functions/generate-graph/index.ts`

### 1. Update inline prompt text (around lines 429-430)
Change the numbered list to:
```
14. Introduction to Object Oriented Programming
15. Abstraction and Polymorphism
16. Miscellaneous Topics
```

### 2. Update `CURRICULUM_TOPICS` array (around lines 448-449)
Insert `"Abstraction and Polymorphism"` between OOP and Miscellaneous.

### 3. Update `SKILL_TOPIC_MAP` (around lines 489-492)
- Add new OOP-related skills at topic 15:
  - `abstraction: 15`
  - `polymorphism: 15`
  - `inheritance: 15`
- Shift existing topic 15 entries (`file_io`, `exception_handling`) to **16**

### 4. Add mandatory edges
- `class_definition -> abstraction` (abstraction builds on class concepts)
- `class_definition -> polymorphism` (polymorphism requires OOP basics)
- `class_definition -> inheritance` (inheritance requires class knowledge)

These go in both the `MANDATORY_EDGES` array in the edge function and in `src/lib/graph/mergeGraphs.ts`.

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-graph/index.ts` | Update prompt text, `CURRICULUM_TOPICS`, `SKILL_TOPIC_MAP`, add mandatory edges |
| `src/lib/graph/mergeGraphs.ts` | Add matching mandatory edges for abstraction/polymorphism/inheritance |

