

# Add Web Curriculum Sequence to WEB_CONFIG

## Overview

Update the `WEB_CONFIG` in `generate-graph/index.ts` with the actual curriculum sequence from the screenshot. This enables curriculum-aware topic filtering for web questions, just like Python has today.

## Curriculum Sequence (from screenshot)

The larger course contains 5 sub-courses with these topics:

**HTML (Course 1):**
1. Introduction to HTML
2. HTML Elements
3. HTML Forms and Tables
4. HTML Attributes and General

**CSS (Course 2):**
5. Introduction To CSS And CSS Selectors
6. CSS Properties
7. CSS Display And Position
8. CSS Layouts And Box Model
9. CSS Selectors
10. CSS Flexbox
11. CSS Grid
12. CSS Media Queries
13. CSS General

**JS (Course 3):**
14. Introduction to JavaScript
15. DOM And Events
16. Schedulers & Callback Functions
17. Storage Mechanisms
18. Network & HTTP Requests
19. Asynchronous JS and Error Handling
20. JS General

**JS Coding (Course 4):**
21. Variables
22. Data Types
23. Operators
24. Conditional Statements
25. Functions
26. Loops
27. Recursion

**React (Course 5):**
28. Introduction to React
29. React Components & Props
30. useState Hook
31. useEffect Hook
32. More React Hooks
33. React Router
34. Authentication & Authorisation
35. React Lists & Forms
36. React General

## Test Cases Confirmation

No changes needed. The test cases prompt section (lines 733-749 of the edge function) is already in the shared portion of the prompt, meaning it applies to Python, Web, and any future domain equally. The IPA/LTA workflow analyzes whatever content the question contains -- structured or free-form -- so no workflow changes are required.

## Changes

### 1. Update `WEB_CONFIG.curriculumSequence`

Add the full 36-topic sequence as a formatted string, matching the Python format.

### 2. Update `WEB_CONFIG.curriculumTopics`

Populate the array with all 36 topic names.

### 3. Update `WEB_CONFIG.skillTopicMap`

Map each skill to its earliest allowed topic number:

| Skill | Earliest Topic | Reasoning |
|-------|---------------|-----------|
| html_document_structure | 1 | Introduction to HTML |
| html_elements | 2 | HTML Elements |
| html_forms | 3 | HTML Forms and Tables |
| html_tables | 3 | HTML Forms and Tables |
| html_attributes | 4 | HTML Attributes and General |
| html_semantic_elements | 4 | HTML Attributes and General |
| css_selectors | 5 | Introduction To CSS And CSS Selectors |
| css_properties | 6 | CSS Properties |
| css_positioning | 7 | CSS Display And Position |
| css_box_model | 8 | CSS Layouts And Box Model |
| css_flexbox | 10 | CSS Flexbox |
| css_grid | 11 | CSS Grid |
| css_media_queries | 12 | CSS Media Queries |
| css_responsive_design | 12 | CSS Media Queries |
| css_transitions | 13 | CSS General |
| css_animations | 13 | CSS General |
| js_dom_manipulation | 15 | DOM And Events |
| js_event_handling | 15 | DOM And Events |
| js_async_await | 16 | Schedulers & Callback Functions |
| js_promises | 16 | Schedulers & Callback Functions |
| js_fetch_api | 18 | Network & HTTP Requests |
| js_error_handling | 19 | Asynchronous JS and Error Handling |
| js_variables | 21 | Variables |
| js_operators | 23 | Operators |
| js_conditionals | 24 | Conditional Statements |
| js_functions | 25 | Functions |
| js_loops | 26 | Loops |
| js_arrays | 26 | Loops (arrays used with loops) |
| js_objects | 25 | Functions (objects used with functions) |
| js_string_methods | 22 | Data Types |
| js_modules | 20 | JS General |
| js_classes | 20 | JS General |
| react_components | 28 | Introduction to React |
| react_jsx | 28 | Introduction to React |
| react_props | 29 | React Components & Props |
| react_state | 30 | useState Hook |
| react_effects | 31 | useEffect Hook |
| react_routing | 33 | React Router |
| react_lists_keys | 35 | React Lists & Forms |
| ai_prompt_engineering | 20 | JS General (GenAI topics span across) |
| ai_api_integration | 18 | Network & HTTP Requests |
| ai_workflow_design | 20 | JS General |

### 4. Update `WEB_CONFIG.independentFoundational`

Set to: `html_document_structure`, `html_elements`, `css_selectors`, `js_variables`

These are true entry points that don't depend on each other (HTML, CSS, and JS are taught as separate courses initially).

## File Modified

| File | Change |
|------|--------|
| `supabase/functions/generate-graph/index.ts` | Update WEB_CONFIG: curriculumSequence, curriculumTopics, skillTopicMap |

## What Stays the Same

- All Python config unchanged
- IPA/LTA workflow unchanged (already handles test cases for all domains)
- Shared prompt sections unchanged
- No UI changes needed
- No database changes

