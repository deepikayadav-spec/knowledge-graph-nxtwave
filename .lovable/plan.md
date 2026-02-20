

# Map KPs to Exact Subtopics and Topics for Web Curriculum

## What Will Happen

The backend function that auto-groups skills will be updated with your exact 5 topics and 36 subtopics. When triggered for the "LKG IO New" graph, it will deterministically assign all 51 KPs to the correct subtopic and topic -- no AI generation needed for this domain.

## Mapping Table

### Topic 1: HTML (4 KPs)
| Subtopic | KPs |
|----------|-----|
| Introduction to HTML | html_semantic_elements |
| HTML Elements | html_elements |
| HTML Forms and Tables | html_forms |
| HTML Attributes and General | html_attributes |

### Topic 2: CSS (10 KPs)
| Subtopic | KPs |
|----------|-----|
| Introduction To CSS And CSS Selectors | css_selectors |
| CSS Properties | css_properties |
| CSS Display And Position | css_positioning |
| CSS Layouts And Box Model | css_box_model |
| CSS Selectors | css_specificity |
| CSS Flexbox | css_flexbox |
| CSS Grid | css_grid |
| CSS Media Queries | css_media_queries, css_responsive_design |
| CSS General | css_transforms, css_utility_frameworks |

### Topic 3: JS (14 KPs)
| Subtopic | KPs |
|----------|-----|
| Introduction to JavaScript | js_closures |
| DOM And Events | js_dom_manipulation, js_event_handling |
| Schedulers and Callback Functions | js_timed_events |
| Storage Mechanisms | js_browser_storage |
| Network and HTTP Requests | js_fetch_api |
| Asynchronous JS and Error Handling | js_async_await, js_promises, js_error_handling |
| JS General | js_modules, js_classes, js_constructor_functions, js_date_object_manipulation |

### Topic 4: JS Coding (13 KPs)
| Subtopic | KPs |
|----------|-----|
| Variables | js_variables |
| Data Types | js_string_methods, js_arrays, js_objects, js_in_place_manipulation |
| Operators | js_operators |
| Conditional Statements | js_conditionals |
| Functions | js_functions |
| Loops | js_loops, js_loop_control_statements, nested_iteration |
| Recursion | js_recursion |

### Topic 5: React (10 KPs)
| Subtopic | KPs |
|----------|-----|
| Introduction to React | react_jsx |
| React Components and Props | react_components, react_props |
| useState Hook | react_state |
| More React Hooks | react_context_api |
| React Router | react_routing |
| Authentication and Authorisation | react_protected_routes |
| React Lists and Forms | react_lists_keys |

### Unmapped (3 KPs) -> "Other Skills"
ai_prompt_engineering, ai_api_integration, ai_workflow_design

Note: useEffect Hook, React General, and a few other subtopics have no KPs currently mapped and will be created as empty subtopics (they will populate when new questions add those KPs).

## Technical Changes

### File: `supabase/functions/auto-group-skills/index.ts`

1. Add `WEB_CURRICULUM_TOPICS` array (your 5 topics) and `WEB_SUBTOPICS` array (your 36 subtopics)
2. Add `WEB_SUBTOPIC_TOPIC_MAP` linking each subtopic index to its parent topic index
3. Add `WEB_SKILL_SUBTOPIC_MAP` mapping each skill_id directly to a subtopic index (deterministic, no AI needed)
4. Add domain detection: count how many skills match the web map vs. Python map, pick the one with more matches
5. For web domain: skip AI subtopic generation entirely -- create topics, then create subtopics from the fixed list, then assign KPs using the deterministic map
6. Keep Python path unchanged (existing behavior)

### After Deployment

The function will be deployed and then invoked for graph `df547747-1481-44ba-a936-83793fe349e7` (LKG IO New). The existing UI (HierarchicalMasteryView, Subtopic/Topic graph views) will immediately display the proper hierarchy.

