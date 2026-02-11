

# Improve Auto-Grouping: Complete Skill-to-Topic Map

## Problem

The `SKILL_TOPIC_MAP` only contains ~45 entries, but the "New PF" graph has 58 skills. These 22 skills are unmapped and all land in a generic "Other Skills" bucket:

| Unmapped Skill | Should Belong To |
|---|---|
| `class_inheritance` | Topic 15 - Abstraction and Polymorphism |
| `abstract_class_interaction` | Topic 15 - Abstraction and Polymorphism |
| `method_overriding` | Topic 15 - Abstraction and Polymorphism |
| `encapsulation_concepts` | Topic 14 - Introduction to OOP |
| `character_encoding_conversion` | Topic 7 - Comparing Strings & Naming Variables |
| `conditional_expression` | Topic 3 - Operators & Conditional Statements |
| `numeric_rounding` | Topic 3 - Operators & Conditional Statements |
| `geometric_pattern_generation` | Topic 5 - Loops |
| `integer_digit_extraction` | Topic 5 - Loops |
| `list_aggregation` | Topic 8 - Lists |
| `list_sorting` | Topic 8 - Lists |
| `sequence_rotation` | Topic 8 - Lists |
| `matrix_construction` | Topic 12 - Matrices & Shorthand |
| `matrix_element_access` | Topic 12 - Matrices & Shorthand |
| `matrix_transposition` | Topic 12 - Matrices & Shorthand |
| `matrix_rotation` | Topic 12 - Matrices & Shorthand |
| `matrix_diagonal_traversal` | Topic 12 - Matrices & Shorthand |
| `backtracking_pattern` | Topic 17 - Problem Solving |
| `deferred_modification_pattern` | Topic 17 - Problem Solving |
| `stateful_computation_simulation` | Topic 17 - Problem Solving |
| `subproblem_enumeration_pattern` | Topic 17 - Problem Solving |
| `datetime_manipulation` | Topic 16 - Miscellaneous Topics |

## Changes

### 1. Update `SKILL_TOPIC_MAP` in both files

Add all 22 missing skill mappings to the map in:
- `supabase/functions/auto-group-skills/index.ts`
- `supabase/functions/generate-graph/index.ts`

### 2. Allow re-grouping

Currently the function returns "skipped" if any topics already exist. Change this to **delete existing groupings first** (clear `skill_subtopics`, `skill_topics`, and reset `subtopic_id` on skills), then re-create everything. This way clicking "Auto-Group" always produces a fresh, correct grouping.

### 3. Deploy

Re-deploy both edge functions so the new mappings take effect.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/auto-group-skills/index.ts` | Add 22 missing skill mappings to `SKILL_TOPIC_MAP`; replace "skip if exists" logic with "delete and re-create" logic |
| `supabase/functions/generate-graph/index.ts` | Add same 22 missing skill mappings to `SKILL_TOPIC_MAP` (keep both files in sync) |

