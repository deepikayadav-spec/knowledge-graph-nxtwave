

# Hardcode All KP-to-Subtopic Mappings and Remove Autosave

## Overview
Map all 100 KPs in "LKG IO(Copy)" to the exact subtopics and topics from your spreadsheet, hardcoded in the auto-group edge function. Also completely remove the autosave feature from the app.

## Changes

### 1. Remove Autosave (KnowledgeGraphApp.tsx)
- Remove the `useAutosave` import and hook call
- Remove the `AutosaveIndicator` component from the header
- Remove `isGeneratingFlag` state that was only used for autosave guard
- This ensures no automatic saving happens -- you save manually only

### 2. Add 32 Missing Skill Mappings (auto-group-skills edge function)
The following skills are currently unmapped and will be added to `WEB_SKILL_SUBTOPIC_MAP`:

| Skill ID | Subtopic | Index |
|----------|----------|-------|
| html_document_structure | Introduction to HTML | 0 |
| css_styling_and_layout | CSS Layouts And Box Model | 7 |
| tailwind_css_utility_classes | CSS General | 12 |
| js_console_output | Introduction to JavaScript | 13 |
| js_timers | Schedulers and Callback Functions | 15 |
| js_local_storage_api | Storage Mechanisms | 16 |
| api_http_requests | Network and HTTP Requests | 17 |
| rss_feed_integration | Network and HTTP Requests | 17 |
| js_date_object | JS General | 19 |
| js_core_logic | JS General | 19 |
| date_fns_usage | JS General | 19 |
| google_sheets_api_integration | JS General | 19 |
| ai_api_integration | JS General | 19 |
| ai_prompt_engineering | JS General | 19 |
| ai_workflow_design | JS General | 19 |
| n8n_workflow_design | JS General | 19 |
| n8n_ai_workflow_automation | JS General | 19 |
| n8n_ai_agent_usage | JS General | 19 |
| n8n_expression_language | JS General | 19 |
| n8n_trigger_node_usage | JS General | 19 |
| js_data_structures_set | Data Types | 21 |
| regex_basics | Data Types | 21 |
| input_validation | Conditional Statements | 23 |
| algorithm_two_sum_hash_map | Functions | 24 |
| accumulator_pattern | Loops | 25 |
| algorithm_intersection | Loops | 25 |
| algorithm_prime_check | Loops | 25 |
| algorithm_set_difference | Loops | 25 |
| algorithm_sorting | Loops | 25 |
| algorithm_two_pointers | Loops | 25 |
| algorithm_recursion | Recursion | 26 |
| react_effects | useEffect Hook | 30 |

Note: n8n and AI skills don't have a dedicated topic in your curriculum, so they are mapped to "JS General" as the closest fit. If you'd prefer a separate topic for these, let me know.

### 3. Workflow After Implementation
1. Deploy the updated edge function
2. Load "LKG IO(Copy)" graph
3. Click "Auto-Group" once -- all 100 KPs get mapped to 36 subtopics under 5 topics, no "Other Skills" group
4. Click recalculate on the Topic Score Table to update min/max values
5. No need to press Auto-Group again -- the mappings are deterministic and hardcoded

### Files Modified
- `supabase/functions/auto-group-skills/index.ts` -- add 32 entries to WEB_SKILL_SUBTOPIC_MAP
- `src/components/KnowledgeGraphApp.tsx` -- remove useAutosave hook, AutosaveIndicator component, and isGeneratingFlag state

