

# Restore Edges for LKG IO New (No Re-import Needed)

## Approach

Your 51 KPs are intact. We can generate edges in two steps:

### Step 1: Insert Mandatory Edges Directly via SQL

The WEB_CONFIG already defines 33 mandatory prerequisite edges. Of those, the following match your existing 51 skills (both `from` and `to` exist):

| From | To | Reason |
|------|-----|--------|
| html_elements | html_forms | forms use HTML elements |
| html_elements | html_semantic_elements | semantic elements build on basic elements |
| html_attributes | html_forms | forms require attribute knowledge |
| css_selectors | css_properties | applying properties requires selectors |
| css_properties | css_box_model | box model uses CSS properties |
| css_box_model | css_flexbox | flexbox builds on box model |
| css_box_model | css_grid | grid builds on box model |
| css_properties | css_positioning | positioning uses CSS properties |
| css_flexbox | css_responsive_design | responsive design uses flexbox |
| css_media_queries | css_responsive_design | responsive design uses media queries |
| js_variables | js_conditionals | conditionals operate on variables |
| js_variables | js_loops | loops operate on variables |
| js_variables | js_functions | functions use variables |
| js_conditionals | js_loops | loops use conditional logic |
| js_functions | js_dom_manipulation | DOM manipulation uses functions |
| js_dom_manipulation | js_event_handling | event handling requires DOM access |
| js_functions | js_async_await | async/await uses function concepts |
| js_promises | js_async_await | async/await is sugar for promises |
| js_async_await | js_fetch_api | fetch API uses async/await |
| js_functions | js_classes | classes use function concepts |
| js_objects | js_classes | classes are object blueprints |
| html_elements | react_jsx | JSX builds on HTML knowledge |
| js_functions | react_components | React components are functions |
| react_components | react_state | state requires component knowledge |
| react_components | react_props | props require component knowledge |
| react_state | react_routing | routing works with state (via react_effects) |
| js_fetch_api | ai_api_integration | AI API integration uses fetch |
| ai_prompt_engineering | ai_workflow_design | workflow design builds on prompts |
| ai_api_integration | ai_workflow_design | workflow design chains API calls |

That gives ~29 edges from mandatory rules alone.

### Step 2: Add Additional Logical Edges via SQL

For the remaining skills not covered by mandatory edges (css_specificity, css_transforms, css_utility_frameworks, js_arrays, js_browser_storage, js_closures, js_constructor_functions, js_date_object_manipulation, js_error_handling, js_in_place_manipulation, js_loop_control_statements, js_modules, js_operators, js_recursion, js_string_methods, js_timed_events, nested_iteration, react_context_api, react_lists_keys, react_protected_routes, react_routing), I will add logical prerequisite edges following the curriculum sequence and tier hierarchy.

This brings us to roughly 60-70 edges total (~1.2-1.4 per node), which is a solid starting point.

### Step 3: Recompute Levels

After inserting edges, trigger a level recomputation so nodes are positioned correctly on the graph based on their prerequisite depth.

## Implementation

All done via a single SQL INSERT into `skill_edges` -- no edge function call needed, no questions required. The edges are deterministic based on the curriculum structure and skill relationships.

### File Changes: None

This is purely a database operation -- inserting rows into `skill_edges` for graph_id `df547747-1481-44ba-a936-83793fe349e7`.

