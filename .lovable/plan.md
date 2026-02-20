

# Group Ungrouped KPs and Show Topic Score Table

## Problem
The "LKG IO(Copy)" graph has 100 skills but 35 are ungrouped (no subtopic_id). These are mostly JS Coding and CSS skills missing from the `WEB_SKILL_SUBTOPIC_MAP` in the auto-group edge function.

## Step 1: Update the skill-to-subtopic map

Add 35 missing skill mappings to `WEB_SKILL_SUBTOPIC_MAP` in `supabase/functions/auto-group-skills/index.ts`:

| Skill ID | Subtopic (index) |
|----------|-----------------|
| html_basics | Introduction to HTML (0) |
| css_positioning | CSS Display And Position (6) |
| css_transform | CSS General (12) |
| css_z_index | CSS Display And Position (6) |
| css_grid_alignment | CSS Grid (10) |
| css_flexbox_layout | CSS Flexbox (9) |
| css_basics | Introduction To CSS And CSS Selectors (4) |
| exception_handling | Asynchronous JS and Error Handling (18) |
| js_spread_rest_operators | JS General (19) |
| class_definition | JS General (19) |
| object_methods | JS General (19) |
| react_component_data_flow | React Components and Props (28) |
| react_component_fundamentals | Introduction to React (27) |
| react_conditional_rendering | React Lists and Forms (34) |
| variable_assignment | Variables (20) |
| basic_output | Variables (20) |
| basic_input | Variables (20) |
| input_parsing | Variables (20) |
| formatted_output | Variables (20) |
| input_output_formatting | Variables (20) |
| type_conversion | Data Types (21) |
| type_recognition | Data Types (21) |
| string_indexing | Data Types (21) |
| list_operations | Data Types (21) |
| dictionary_operations | Data Types (21) |
| comparison_operators | Operators (22) |
| arithmetic_operations | Operators (22) |
| boolean_logic | Operators (22) |
| conditional_branching | Conditional Statements (23) |
| function_definition | Functions (24) |
| function_calls | Functions (24) |
| loop_iteration | Loops (25) |
| search_pattern | Loops (25) |
| loop_control_statements | Loops (25) |
| iterative_control_flow | Loops (25) |

## Step 2: Re-run Auto-Group

After deploying the updated edge function, you click "Auto-Group" in the UI. It will clear existing groupings and reassign all 100 skills correctly.

## Step 3: Calculate topic score ranges

After grouping completes, trigger `calculateAndPersistTopicScoreRanges` (already wired up -- it auto-runs when the graph loads and ranges are empty). For a manual trigger, add a "Recalc Ranges" button to the toolbar that calls this function and updates state.

## Step 4: Add Topic Score Table beside the graph

Create a new `TopicScoreTable` component that displays a compact table with columns: Topic, Min, Max, Questions. It will be shown to the right of the graph canvas (before the mastery sidebar, if active) when `topicScoreRanges` has data.

### Technical Details

**Files changed:**
1. `supabase/functions/auto-group-skills/index.ts` -- add 35 entries to `WEB_SKILL_SUBTOPIC_MAP`
2. `src/components/panels/TopicScoreTable.tsx` -- new component: compact table using shadcn Table
3. `src/components/KnowledgeGraphApp.tsx` -- render `TopicScoreTable` beside the graph, add "Recalc Ranges" button in toolbar, refresh ranges after auto-group completes

**TopicScoreTable** will:
- Accept `topicScoreRanges` and an `onRecalculate` callback as props
- Render a narrow panel (~250px) on the right side of the graph area
- Show topic name, min (always 0), max (unique question count), and total questions
- Include a small refresh button to recalculate

