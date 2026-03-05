import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// DOMAIN CONFIGURATION TYPES
// ============================================================

interface DomainConfig {
  skillCatalog: string;
  scopeConstraint: string;
  curriculumSequence: string;
  inputFormatDescription: string;
  exampleIPA: string;
  skillTopicMap: Record<string, number>;
  independentFoundational: Set<string>;
  mandatoryEdges: Array<{ from: string; to: string; reason: string }>;
  curriculumTopics: string[];
}

// ============================================================
// PYTHON DOMAIN CONFIG
// ============================================================

const PYTHON_CONFIG: DomainConfig = {
  skillCatalog: `
=== REFERENCE SKILL CATALOG (MAP TO THESE FIRST) ===

Before creating ANY new skill, check if it maps to this catalog:

FOUNDATIONAL (Level 0):
- variable_assignment: Storing values in named containers
- arithmetic_operations: +, -, *, /, %, //
- comparison_operators: ==, !=, <, >, <=, >=
- boolean_logic: and, or, not operations
- type_recognition: Identifying int, str, list, dict, etc.

CORE (Level 1-2):
- conditional_branching: if/elif/else control flow
- loop_iteration: for and while loops
- list_operations: indexing, slicing, append, extend
- dictionary_operations: key access, update, iteration
- string_methods: split, join, strip, replace, find
- function_definition: def, parameters, return
- function_calls: invoking functions with arguments

APPLIED (Level 3-4):
- nested_iteration: loops within loops
- accumulator_pattern: building results through iteration
- search_pattern: finding elements in collections
- filter_pattern: selecting elements by condition
- transform_pattern: mapping elements to new values
- input_parsing: converting string input to structured data
- output_formatting: building formatted string output

ADVANCED (Level 5+):
- recursion: self-referential function calls
- list_comprehension: compact list building syntax
- file_io: reading and writing files
- exception_handling: try/except/finally
- class_definition: OOP class creation
- object_methods: instance methods and attributes

ONLY create a new skill if NONE of the above apply.
When creating new skills, they must be AT THIS SAME LEVEL of abstraction.

IMPORTANT: The catalog is for NAMING CONSISTENCY only. Do NOT create nodes
for skills that are not required by the given questions. If no question
requires loop_iteration, do NOT include it in the output. The catalog
tells you WHAT TO CALL a skill if you need it, not which skills to include.

CURRICULUM AWARENESS: When questions are tagged with a topic, do NOT
create skill nodes from topics that come LATER in the curriculum sequence.
For example, if all questions are from "Operators & Conditional Statements"
(Topic 3), do NOT create loop_iteration (Topic 5), function_calls (Topic 9),
or any other skill that belongs to a later topic. Only create skills that
a student would have encountered BY that point in the curriculum.`,

  scopeConstraint: `
=== PROGRAMMING FOUNDATIONS SCOPE CONSTRAINT ===

This is a Programming Foundations course. Students solve problems using 
bruteforce methods ONLY. Do NOT create skills for advanced algorithmic 
patterns: Sliding Window, Two Pointers, Greedy Algorithm, Dynamic 
Programming, Kadane's Algorithm, Divide and Conquer, Binary Search 
optimization, Backtracking, Graph Algorithms, or Trie structures.

If a problem could be solved with an advanced pattern, map it to the 
fundamental bruteforce skills (e.g., nested_iteration, accumulator_pattern, 
search_pattern, filter_pattern).

REPETITION WITHOUT LOOPS: If a problem asks to repeat an action a small 
fixed number of times (e.g., "print Hello 3 times"), and the question 
belongs to a topic BEFORE "Loops" (Topic 5) in the curriculum, map it 
to basic_output (repeated print statements), NOT to loop_iteration. 
Only use loop_iteration when the question is FROM Topic 5 or later, 
OR when the repetition count is variable/large.`,

  curriculumSequence: `
=== CURRICULUM SEQUENCE ===

Topics are taught in this order. Use this to inform prerequisite edges -- 
skills from earlier topics should generally be prerequisites for skills 
in later topics:

1. Introduction to Python
2. I/O Basics
3. Operators & Conditional Statements
4. Nested Conditions
5. Loops
6. Loop Control Statements
7. Comparing Strings & Naming Variables
8. Lists
9. Functions
10. Recursion
11. Tuples & Sets
12. Intro to Matrices & Shorthand Expressions
13. Dictionaries
14. Introduction to Object Oriented Programming
15. Abstraction and Polymorphism
16. Miscellaneous Topics
17. Problem Solving`,

  inputFormatDescription: `
=== INPUT FORMAT ===

Questions are provided in a simple structured format with these sections:
- Question: The task description
- Input: Expected input format/types
- Output: Expected output format/types  
- Explanation: Solution approach, algorithm description, or hints

Multiple questions are separated by new "Question:" sections.

Use ALL sections when performing IPA analysis:
- Explanation informs the DECIDE and EXECUTE steps with solution strategy
- Input/Output sections clarify data type handling requirements`,

  exampleIPA: `
=== EXAMPLE IPA/LTA ANALYSIS ===

Question (structured format):
Question: Count frequency of each word in a sentence.
Input: A string containing words separated by spaces.
Output: A dictionary mapping each word to its frequency count.
Explanation: Split the string by spaces, iterate through words, and use a dictionary to track counts. Normalize case for consistency.

IPA Trace:
1. PERCEIVE: Input is a string with spaces separating words (from Input section)
2. ENCODE: Split string into list of words, normalize case (from Explanation)
3. RETRIEVE: Dictionary can map word → count (from Output section)
4. DECIDE: Use accumulator pattern with dictionary (from Explanation)
5. EXECUTE: For each word, check if in dict, then increment or initialize
6. MONITOR: Verify counts are correct, handle empty input

LTA Extraction:
- PERCEIVE step requires: string_recognition (declarative)
- ENCODE step requires: string_split_method (procedural)
- RETRIEVE step requires: dictionary_concept (declarative)
- DECIDE step requires: accumulator_pattern_selection (strategic)
- EXECUTE step requires: dictionary_operations (procedural), loop_iteration (procedural)
- MONITOR step requires: edge_case_handling (conditional)

After normalization, this maps to skills like:
- string_methods (core, procedural)
- dictionary_operations (core, procedural)
- loop_iteration (core, procedural)
- accumulator_pattern (applied, strategic)`,

  curriculumTopics: [
    "Introduction to Python",
    "I/O Basics",
    "Operators & Conditional Statements",
    "Nested Conditions",
    "Loops",
    "Loop Control Statements",
    "Comparing Strings & Naming Variables",
    "Lists",
    "Functions",
    "Recursion",
    "Tuples & Sets",
    "Intro to Matrices & Shorthand Expressions",
    "Dictionaries",
    "Introduction to Object Oriented Programming",
    "Abstraction and Polymorphism",
    "Miscellaneous Topics",
    "Problem Solving",
  ],

  skillTopicMap: {
    variable_assignment: 1,
    type_recognition: 1,
    basic_output: 2,
    basic_input: 2,
    type_conversion: 2,
    string_concatenation: 2,
    string_indexing: 2,
    string_slicing: 2,
    string_repetition: 2,
    sequence_length_retrieval: 2,
    arithmetic_operations: 3,
    comparison_operators: 3,
    boolean_logic: 3,
    conditional_branching: 3,
    conditional_expression: 3,
    numeric_rounding: 3,
    nested_conditions: 4,
    loop_iteration: 5,
    accumulator_pattern: 5,
    search_pattern: 5,
    filter_pattern: 5,
    transform_pattern: 5,
    input_parsing: 5,
    nested_iteration: 5,
    geometric_pattern_generation: 5,
    integer_digit_extraction: 5,
    loop_control_statements: 6,
    string_methods: 7,
    formatted_output: 7,
    output_formatting: 7,
    character_encoding_conversion: 7,
    list_operations: 8,
    list_comprehension: 8,
    list_aggregation: 8,
    list_sorting: 8,
    sequence_rotation: 8,
    function_definition: 9,
    function_calls: 9,
    recursion: 10,
    tuple_operations: 11,
    set_operations: 11,
    matrix_operations: 12,
    matrix_construction: 12,
    matrix_element_access: 12,
    matrix_transposition: 12,
    matrix_rotation: 12,
    matrix_diagonal_traversal: 12,
    dictionary_operations: 13,
    class_definition: 14,
    object_methods: 14,
    encapsulation_concepts: 14,
    abstraction: 15,
    polymorphism: 15,
    inheritance: 15,
    class_inheritance: 15,
    abstract_class_interaction: 15,
    method_overriding: 15,
    file_io: 16,
    exception_handling: 16,
    datetime_manipulation: 16,
    problem_solving: 17,
    algorithmic_thinking: 17,
    debugging: 17,
    backtracking_pattern: 17,
    deferred_modification_pattern: 17,
    stateful_computation_simulation: 17,
    subproblem_enumeration_pattern: 17,
  },

  independentFoundational: new Set([
    'variable_assignment', 'basic_output', 'arithmetic_operations', 'type_recognition'
  ]),

  mandatoryEdges: [
    { from: 'variable_assignment', to: 'basic_input', reason: 'input() requires storing the result in a variable' },
    { from: 'variable_assignment', to: 'type_conversion', reason: 'type conversion operates on values stored in variables' },
    { from: 'variable_assignment', to: 'string_concatenation', reason: 'concatenation operates on values in variables' },
    { from: 'variable_assignment', to: 'string_indexing', reason: 'indexing requires a string stored in a variable' },
    { from: 'variable_assignment', to: 'string_repetition', reason: 'repetition operates on strings in variables' },
    { from: 'variable_assignment', to: 'sequence_length_retrieval', reason: 'len() operates on values stored in variables' },
    { from: 'type_recognition', to: 'type_conversion', reason: 'must recognize types before converting between them' },
    { from: 'arithmetic_operations', to: 'comparison_operators', reason: 'comparisons often involve computed values' },
    { from: 'comparison_operators', to: 'conditional_branching', reason: 'conditions use comparison operators' },
    { from: 'conditional_branching', to: 'nested_conditions', reason: 'nesting requires understanding single conditions' },
    { from: 'variable_assignment', to: 'loop_iteration', reason: 'loops operate on variables' },
    { from: 'loop_iteration', to: 'accumulator_pattern', reason: 'accumulating requires looping' },
    { from: 'loop_iteration', to: 'search_pattern', reason: 'searching requires iterating' },
    { from: 'string_indexing', to: 'string_slicing', reason: 'slicing builds on indexing concepts' },
    { from: 'conditional_branching', to: 'filter_pattern', reason: 'filtering requires if/else logic' },
    { from: 'basic_output', to: 'formatted_output', reason: 'formatted output builds on basic print knowledge' },
    { from: 'loop_iteration', to: 'nested_iteration', reason: 'nested loops require understanding single loops' },
    { from: 'loop_iteration', to: 'set_operations', reason: 'building sets requires iteration' },
    { from: 'list_operations', to: 'set_operations', reason: 'sets are often created from lists' },
    { from: 'loop_iteration', to: 'list_operations', reason: 'list building requires looping' },
    { from: 'loop_iteration', to: 'filter_pattern', reason: 'filtering requires iterating' },
    { from: 'loop_iteration', to: 'transform_pattern', reason: 'transforming requires iterating' },
    { from: 'conditional_branching', to: 'loop_iteration', reason: 'loops use conditions for termination' },
    { from: 'class_definition', to: 'abstraction', reason: 'abstraction builds on class concepts' },
    { from: 'class_definition', to: 'polymorphism', reason: 'polymorphism requires OOP basics' },
    { from: 'class_definition', to: 'inheritance', reason: 'inheritance requires class knowledge' },
  ],
};

// ============================================================
// WEB DOMAIN CONFIG (HTML/CSS/JS/React/GenAI)
// ============================================================

const WEB_CONFIG: DomainConfig = {
  skillCatalog: `
=== REFERENCE SKILL CATALOG (MAP TO THESE FIRST) ===

Before creating ANY new skill, check if it maps to this catalog:

HTML:
- html_document_structure: DOCTYPE, html, head, body tags
- html_elements: headings, paragraphs, lists, links, images, div, span
- html_attributes: id, class, src, href, alt, style attributes
- html_forms: form, input, textarea, select, button, labels
- html_tables: table, tr, td, th, thead, tbody
- html_semantic_elements: header, footer, nav, main, section, article, aside

CSS:
- css_selectors: element, class, id, descendant, pseudo-class selectors
- css_properties: color, font, background, border, margin, padding
- css_box_model: margin, border, padding, content, width/height
- css_flexbox: display flex, justify-content, align-items, flex-direction
- css_grid: display grid, grid-template, gap, grid areas
- css_positioning: static, relative, absolute, fixed, sticky, z-index
- css_responsive_design: media queries, viewport units, fluid layouts
- css_media_queries: breakpoints, min-width, max-width queries
- css_animations: keyframes, animation properties, timing functions
- css_transitions: transition properties, hover effects, timing

JavaScript:
- js_variables: let, const, var, data types, scope
- js_operators: arithmetic, comparison, logical, ternary
- js_conditionals: if/else, switch, ternary expressions
- js_loops: for, while, do-while, for...of, for...in
- js_arrays: creation, methods (push, pop, map, filter, reduce)
- js_objects: creation, properties, methods, destructuring
- js_functions: declaration, expression, arrow functions, parameters
- js_string_methods: split, join, trim, replace, includes, template literals
- js_dom_manipulation: querySelector, createElement, innerHTML, classList
- js_event_handling: addEventListener, event types, event delegation
- js_async_await: async functions, await, error handling
- js_promises: creation, then/catch, Promise.all
- js_fetch_api: fetch, GET/POST requests, response handling
- js_modules: import/export, default exports, named exports
- js_classes: class syntax, constructor, methods, inheritance
- js_error_handling: try/catch/finally, custom errors

React:
- react_components: functional components, JSX syntax
- react_jsx: JSX expressions, conditional rendering, lists
- react_state: useState, state management, immutability
- react_props: prop passing, destructuring, children
- react_effects: useEffect, side effects, cleanup
- react_routing: React Router, routes, navigation
- react_lists_keys: rendering lists, key prop

Gen AI:
- ai_prompt_engineering: prompt design, context, instructions
- ai_api_integration: calling AI APIs, handling responses
- ai_workflow_design: chaining AI calls, processing pipelines

ONLY create a new skill if NONE of the above apply.
When creating new skills, they must be AT THIS SAME LEVEL of abstraction.

IMPORTANT: The catalog is for NAMING CONSISTENCY only. Do NOT create nodes
for skills that are not required by the given questions.`,

  scopeConstraint: `
=== WEB DEVELOPMENT SCOPE CONSTRAINT ===

This is a web development course covering HTML, CSS, JavaScript, Dynamic 
Web Apps, React JS, and Generative AI integration. Students build 
real-world web applications.

Skills should reflect web development concepts at the appropriate level 
of abstraction. Do NOT create hyper-specific skills for individual CSS 
properties or HTML tags — group them into transferable capabilities.`,

  curriculumSequence: `
=== CURRICULUM SEQUENCE ===

Topics are taught in this order. Use this to inform prerequisite edges --
skills from earlier topics should generally be prerequisites for skills
in later topics:

HTML (Course 1):
1. Introduction to HTML
2. HTML Elements
3. HTML Forms and Tables
4. HTML Attributes and General

CSS (Course 2):
5. Introduction To CSS And CSS Selectors
6. CSS Properties
7. CSS Display And Position
8. CSS Layouts And Box Model
9. CSS Selectors
10. CSS Flexbox
11. CSS Grid
12. CSS Media Queries
13. CSS General

JS (Course 3):
14. Introduction to JavaScript
15. DOM And Events
16. Schedulers & Callback Functions
17. Storage Mechanisms
18. Network & HTTP Requests
19. Asynchronous JS and Error Handling
20. JS General

JS Coding (Course 4):
21. Variables
22. Data Types
23. Operators
24. Conditional Statements
25. Functions
26. Loops
27. Recursion

React (Course 5):
28. Introduction to React
29. React Components & Props
30. useState Hook
31. useEffect Hook
32. More React Hooks
33. React Router
34. Authentication & Authorisation
35. React Lists & Forms
36. React General`,

  inputFormatDescription: `
=== INPUT FORMAT ===

Questions may be in EITHER format:

FORMAT 1 - Structured (with headers):
- Question: The task description
- Input: Expected input format/types
- Output: Expected output format/types
- Explanation: Solution approach

FORMAT 2 - Free-form:
Questions are plain text descriptions of web development tasks, 
design challenges, or coding problems. They may describe UI to build,
features to implement, or concepts to demonstrate.

Both formats are valid. Analyze whatever is provided.`,

  exampleIPA: `
=== EXAMPLE IPA/LTA ANALYSIS ===

Question (free-form):
Create a responsive navigation bar with a hamburger menu for mobile. 
The nav should have links to Home, About, and Contact pages. Use flexbox 
for desktop layout and a toggle button for mobile.

IPA Trace:
1. PERCEIVE: Need a nav bar with 3 links, responsive with mobile hamburger
2. ENCODE: Structure as nav element with ul/li for links, button for toggle
3. RETRIEVE: Flexbox for layout, media queries for responsive, JS for toggle
4. DECIDE: Use semantic HTML nav, CSS flexbox + media query, JS click handler
5. EXECUTE: Build HTML structure, CSS flex layout, media query breakpoint, JS toggle
6. MONITOR: Test responsive behavior, verify hamburger works

LTA Extraction:
- PERCEIVE: html_semantic_elements (declarative)
- ENCODE: html_elements (procedural)
- RETRIEVE: css_flexbox, css_media_queries (declarative)
- DECIDE: css_responsive_design (strategic)
- EXECUTE: js_dom_manipulation, js_event_handling (procedural)
- MONITOR: css_responsive_design (conditional)

After normalization:
- html_semantic_elements (foundational)
- html_elements (foundational)
- css_flexbox (core)
- css_media_queries (core)
- css_responsive_design (applied)
- js_dom_manipulation (core)
- js_event_handling (core)`,

  curriculumTopics: [
    "Introduction to HTML",
    "HTML Elements",
    "HTML Forms and Tables",
    "HTML Attributes and General",
    "Introduction To CSS And CSS Selectors",
    "CSS Properties",
    "CSS Display And Position",
    "CSS Layouts And Box Model",
    "CSS Selectors",
    "CSS Flexbox",
    "CSS Grid",
    "CSS Media Queries",
    "CSS General",
    "Introduction to JavaScript",
    "DOM And Events",
    "Schedulers & Callback Functions",
    "Storage Mechanisms",
    "Network & HTTP Requests",
    "Asynchronous JS and Error Handling",
    "JS General",
    "Variables",
    "Data Types",
    "Operators",
    "Conditional Statements",
    "Functions",
    "Loops",
    "Recursion",
    "Introduction to React",
    "React Components & Props",
    "useState Hook",
    "useEffect Hook",
    "More React Hooks",
    "React Router",
    "Authentication & Authorisation",
    "React Lists & Forms",
    "React General",
  ],

  skillTopicMap: {
    html_document_structure: 1,
    html_elements: 2,
    html_forms: 3,
    html_tables: 3,
    html_attributes: 4,
    html_semantic_elements: 4,
    css_selectors: 5,
    css_properties: 6,
    css_positioning: 7,
    css_box_model: 8,
    css_flexbox: 10,
    css_grid: 11,
    css_media_queries: 12,
    css_responsive_design: 12,
    css_transitions: 13,
    css_animations: 13,
    js_dom_manipulation: 15,
    js_event_handling: 15,
    js_async_await: 16,
    js_promises: 16,
    js_fetch_api: 18,
    js_error_handling: 19,
    js_variables: 21,
    js_operators: 23,
    js_conditionals: 24,
    js_functions: 25,
    js_loops: 26,
    js_arrays: 26,
    js_objects: 25,
    js_string_methods: 22,
    js_modules: 20,
    js_classes: 20,
    react_components: 28,
    react_jsx: 28,
    react_props: 29,
    react_state: 30,
    react_effects: 31,
    react_routing: 33,
    react_lists_keys: 35,
    ai_prompt_engineering: 20,
    ai_api_integration: 18,
    ai_workflow_design: 20,
  },

  independentFoundational: new Set([
    'html_document_structure', 'html_elements', 'css_selectors', 'js_variables'
  ]),

  mandatoryEdges: [
    { from: 'html_elements', to: 'html_forms', reason: 'forms use HTML elements' },
    { from: 'html_elements', to: 'html_tables', reason: 'tables use HTML elements' },
    { from: 'html_elements', to: 'html_semantic_elements', reason: 'semantic elements build on basic element knowledge' },
    { from: 'html_attributes', to: 'html_forms', reason: 'forms require attribute knowledge' },
    { from: 'css_selectors', to: 'css_properties', reason: 'applying properties requires selector knowledge' },
    { from: 'css_properties', to: 'css_box_model', reason: 'box model uses CSS properties' },
    { from: 'css_box_model', to: 'css_flexbox', reason: 'flexbox builds on box model understanding' },
    { from: 'css_box_model', to: 'css_grid', reason: 'grid builds on box model understanding' },
    { from: 'css_properties', to: 'css_positioning', reason: 'positioning uses CSS properties' },
    { from: 'css_properties', to: 'css_transitions', reason: 'transitions animate CSS properties' },
    { from: 'css_transitions', to: 'css_animations', reason: 'animations build on transition concepts' },
    { from: 'css_flexbox', to: 'css_responsive_design', reason: 'responsive design uses flexbox' },
    { from: 'css_media_queries', to: 'css_responsive_design', reason: 'responsive design uses media queries' },
    { from: 'js_variables', to: 'js_conditionals', reason: 'conditionals operate on variables' },
    { from: 'js_variables', to: 'js_loops', reason: 'loops operate on variables' },
    { from: 'js_variables', to: 'js_functions', reason: 'functions use variables' },
    { from: 'js_conditionals', to: 'js_loops', reason: 'loops use conditional logic' },
    { from: 'js_functions', to: 'js_dom_manipulation', reason: 'DOM manipulation uses functions' },
    { from: 'js_dom_manipulation', to: 'js_event_handling', reason: 'event handling requires DOM access' },
    { from: 'js_functions', to: 'js_async_await', reason: 'async/await uses function concepts' },
    { from: 'js_promises', to: 'js_async_await', reason: 'async/await is syntactic sugar for promises' },
    { from: 'js_async_await', to: 'js_fetch_api', reason: 'fetch API uses async/await' },
    { from: 'js_functions', to: 'js_classes', reason: 'classes use function concepts' },
    { from: 'js_objects', to: 'js_classes', reason: 'classes are object blueprints' },
    { from: 'html_elements', to: 'react_jsx', reason: 'JSX builds on HTML knowledge' },
    { from: 'js_functions', to: 'react_components', reason: 'React components are functions' },
    { from: 'react_components', to: 'react_state', reason: 'state management requires component knowledge' },
    { from: 'react_components', to: 'react_props', reason: 'props require component knowledge' },
    { from: 'react_state', to: 'react_effects', reason: 'effects respond to state changes' },
    { from: 'js_fetch_api', to: 'ai_api_integration', reason: 'AI API integration uses fetch' },
    { from: 'ai_prompt_engineering', to: 'ai_workflow_design', reason: 'workflow design builds on prompt engineering' },
    { from: 'ai_api_integration', to: 'ai_workflow_design', reason: 'workflow design chains API calls' },
  ],
};

// ============================================================
// SHARED PROMPT SECTIONS
// ============================================================

function buildSystemPrompt(config: DomainConfig): string {
  return `You are a Knowledge Graph Engineer tasked with constructing a Knowledge Graph of Knowledge Points (KPs) from a set of questions.

The goal is to identify the underlying cognitive capabilities required to solve the questions and organize them into a reusable knowledge graph.

A Knowledge Point (KP) represents a reusable unit of knowledge or reasoning capability that can appear across multiple questions. Knowledge Points can include:
- Conceptual knowledge (definitions, rules, syntax)
- Procedural operations (how to perform a task)
- Reasoning operators (logical or mathematical reasoning)
- Strategic patterns used to solve problems

Knowledge Points should represent general cognitive capabilities, not problem-specific tasks.

WRONG examples (problem-specific):
- sum_numbers_in_list
- count_words_in_sentence
- find_diagonal_of_matrix

RIGHT examples (general reusable KPs):
- accumulator_pattern
- nested_iteration
- matrix_traversal

The knowledge graph should capture:
1. Knowledge Point nodes
2. Prerequisite relationships between Knowledge Points
3. Which Knowledge Points are required to solve each question

The graph should remain stable across many questions, meaning similar capabilities reuse the same KP nodes, KPs represent transferable knowledge, and KPs are not specific to individual problems.

${config.inputFormatDescription}

${config.skillCatalog}

${config.scopeConstraint}

${config.curriculumSequence}

======================================================================
PHASE 1: INFORMATION PROCESSING ANALYSIS (IPA)
======================================================================

For each question, analyze the cognitive process a competent student follows to solve it. The goal of IPA is to trace the mental algorithm used during problem solving.

Each reasoning trace should consider the following cognitive stages:

PERCEIVE
Identify the relevant information present in the question.
Examples:
- Recognizing that input is a list of numbers
- Identifying grammatical structure in a sentence
- Detecting relationships in a logic puzzle

ENCODE
Transform the information into a mental representation that can be reasoned about.
Examples:
- Interpreting a list as iterable elements
- Mapping family relationships into a tree
- Structuring sentences into grammatical components

RETRIEVE
Recall knowledge from memory that is relevant to solving the problem.
Examples:
- Recalling how loops work
- Remembering a grammar rule
- Recalling ratio transformation rules

DECIDE
Select the reasoning strategy or rule to apply.
Examples:
- Choosing to iterate through elements
- Applying a grammar correction rule
- Using ratio comparison to solve a quantitative problem

EXECUTE
Apply the selected reasoning operation.
Examples:
- Simulating program execution
- Applying a rule to correct a sentence
- Performing arithmetic or logical steps

MONITOR
Verify correctness and check for edge cases or inconsistencies.
Examples:
- Checking output correctness
- Ensuring logical relationships remain consistent
- Verifying grammar agreement

The IPA trace should reveal the underlying reasoning operators used to solve the question. These operators will later be converted into Knowledge Points during Learning Task Analysis.

=== TEST CASES (OPTIONAL INPUT) ===

Some questions may include test cases as input/output pairs. When present:

1. During PERCEIVE: Examine test case inputs for edge cases the question
   text does not mention (zero, negative numbers, empty strings, very large
   values, special characters, boundary conditions).

2. During MONITOR: If test cases reveal error handling scenarios (invalid
   input, edge boundaries), ensure appropriate skills like input_validation,
   boundary_checking, or error_handling are surfaced.

3. Test cases that show MULTIPLE distinct scenarios suggest the question
   has hidden complexity -- make sure all required skills are captured.

4. Do NOT create separate skills for individual test cases. Use them as
   evidence to inform your IPA analysis and skill identification.

If no test cases are provided for a question, analyze based on question text alone.

${config.exampleIPA}

======================================================================
PHASE 2: LEARNING TASK ANALYSIS (LTA)
======================================================================

After performing IPA for each question, identify the Knowledge Points required at each cognitive step. The purpose of LTA is to convert the cognitive reasoning trace into reusable units of knowledge that can become nodes in the knowledge graph.

For each IPA step, determine what knowledge a student must possess in order to perform that step reliably.

Classify each Knowledge Point using one of the following knowledge types:

Declarative Knowledge
Facts, definitions, syntax, or rules that must be remembered.
Examples:
- Meaning of comparison operators
- Subject–verb agreement rule
- Definition of ratio

Procedural Knowledge
Step-by-step methods used to perform operations.
Examples:
- Loop iteration
- Applying a grammar correction
- Performing cross multiplication

Conditional Knowledge
Knowledge of when to apply a rule or method.
Examples:
- Recognizing when to use a loop
- Identifying when a grammar rule is violated
- Detecting when ratio reasoning is required

Strategic Knowledge
Higher-level reasoning patterns or problem-solving strategies.
Examples:
- Accumulator pattern
- Constraint propagation in logic puzzles
- Elimination strategy in MCQ reasoning

Each Knowledge Point should represent a reusable reasoning capability that can appear in multiple questions. Avoid extracting KPs that are specific to one problem context.

WRONG:
- count_words_in_sentence
- blood_relation_uncle

RIGHT:
- accumulator_pattern
- generation_tracking
- relationship_composition

The output of LTA should be a set of candidate Knowledge Points that will later be normalized and merged into the global knowledge graph.

======================================================================
PHASE 3: KNOWLEDGE POINT NORMALIZATION
======================================================================

After extracting candidate Knowledge Points through LTA, normalize them so that the knowledge graph remains compact, consistent, and reusable across many questions.

Apply the following rules:

RULE 1: SYNONYM UNIFICATION (ONE SKILL PER CONCEPT)
If multiple candidate KPs represent the same underlying capability, merge them into a single canonical KP.
- "Initialize empty dictionary" → dictionary_operations
- "Add key to dictionary" → dictionary_operations
- "Check if key exists" → dictionary_operations
- ALL dictionary work = ONE node: dictionary_operations

WRONG (duplicate concepts):
- counting_numbers
- frequency_counting
- sum_accumulation

RIGHT (canonical KP):
- accumulator_pattern

RULE 2: PREFER GENERAL COGNITIVE OPERATORS (PATTERN OVER CONTEXT)
Knowledge Points should represent general reasoning operators, not problem-specific tasks.
- "Count words" → accumulator_pattern
- "Sum numbers" → accumulator_pattern
- "Collect unique items" → accumulator_pattern
- ALL accumulation = ONE node: accumulator_pattern

WRONG:
- nested_loop_for_matrix
- nested_loop_for_triangle
- nested_loop_for_pyramid

RIGHT:
- nested_iteration (applies to ALL 2D traversal)

RULE 3: ATOMICITY
Each Knowledge Point should represent one testable capability.

WRONG (compound KP):
- iterate_and_sum_list

RIGHT:
- loop_iteration
- accumulator_pattern

RULE 4: REUSABILITY REQUIREMENT & MAXIMUM NODE COUNT
A Knowledge Point should be applicable in multiple questions. If a candidate KP appears specific to only one problem context, generalize it into a broader capability.

For N questions, create AT MOST N/5 skill nodes.
If you have more, you MUST consolidate further.

RULE 5: ABSTRACTION LEVEL CONSISTENCY & PRE-MERGE CHECK
Ensure that Knowledge Points remain at a similar level of abstraction. Avoid mixing very broad concepts with extremely specific procedures.

Before finalizing, ask for EACH node:
"Could this be merged with another node without losing testable distinction?"
If YES → merge them.

WRONG (imbalanced):
- loop_iteration (broad)
- matrix_diagonal_traversal (too specific)

RIGHT:
- loop_iteration
- nested_iteration
- matrix_traversal

=== TIER ASSIGNMENT ===

Classify each normalized KP by complexity level:

| Tier | Description | Examples |
|------|-------------|----------|
| foundational | Language primitives | Variables, Operators, Basic Types |
| core | Control structures | Loops, Conditionals, Functions |
| applied | Patterns & combinations | Accumulator, Search, String Processing |
| advanced | Complex algorithms | Recursion, Dynamic Programming |

=== TRANSFERABILITY CHECK ===

Ensure each skill applies across 5+ contexts. If skill is context-specific, generalize or merge with similar.

======================================================================
PHASE 4: KNOWLEDGE GRAPH CONSTRUCTION (PREREQUISITE DAG)
======================================================================

Using the normalized Knowledge Points, construct a Directed Acyclic Graph (DAG) representing prerequisite relationships between KPs.

An edge A → B means that Knowledge Point A is a prerequisite for Knowledge Point B. A prerequisite relationship indicates that a student generally needs to understand A before reliably applying B.

=== PREREQUISITE TEST ("WITHOUT X?" RULE) ===

For each potential edge A → B, ask:
"Can a student RELIABLY perform B without understanding A?"

- If NO → A is a prerequisite for B → add edge A → B
- If YES → A is not required → do NOT add the edge

This rule prevents unnecessary or incorrect prerequisite relationships.

=== DIRECTION OF KNOWLEDGE PROGRESSION ===

Learning dependencies typically follow this pattern:
  declarative → procedural → conditional → strategic

Examples:
- comparison_operators → conditional_branching
- loop_iteration → accumulator_pattern
- subject_verb_rule → subject_verb_error_detection

However, edges should only be added when the "WITHOUT X?" rule indicates a true dependency.

=== MANDATORY PREREQUISITE EDGES ===

You MUST include these edges whenever both the source and target nodes exist in your output:
${config.mandatoryEdges.map(e => `- ${e.from} -> ${e.to} (${e.reason})`).join('\n')}

If both nodes in a pair above appear in your output, the edge MUST be present. Omitting it is an error.

=== INDEPENDENCE RULE ===

These specific foundational skills are independent entry points and should NOT require each other as prerequisites:
  ${Array.from(config.independentFoundational).join(', ')}

However, skills that BUILD on these foundations SHOULD have appropriate prerequisite edges pointing back to the foundational skills they depend on.

=== MINIMUM CONNECTIVITY ===

Every non-foundational Knowledge Point should have at least one prerequisite. Foundational KPs (such as basic syntax, arithmetic, or fundamental rules) may have no prerequisites. Aim for 1.5-2.5 edges per node.

=== TRANSITIVE REDUCTION ===

Avoid redundant edges. If the graph already contains:
  A → B and B → C
then the direct edge A → C should not be added unless it represents a direct cognitive dependency.

=== NO CYCLES ===

The knowledge graph must remain a Directed Acyclic Graph (DAG). If a cycle appears, remove the weakest dependency.

=== LEVEL COMPUTATION ===

Each Knowledge Point receives a level in the graph:
- Level 0 → no prerequisites (foundational knowledge)
- Level N → 1 + max(level(prereq) for prereq in prerequisites)

This level represents the relative position of the KP in the learning progression.

======================================================================
PHASE 5: KNOWLEDGE POINT CATALOG (CANONICAL NAMING GUIDE)
======================================================================

To maintain consistency across the knowledge graph, use the Reference Skill Catalog (provided above) as a canonical naming guide.

When extracting Knowledge Points:

1. REUSE EXISTING KPs WHEN POSSIBLE
   If a candidate KP represents essentially the same capability as one already present in the catalog or the graph, reuse the same identifier.

   WRONG:
   - count_numbers
   - frequency_count
   - sum_values

   RIGHT:
   - accumulator_pattern

2. CREATE A NEW KP ONLY WHEN NECESSARY
   If the reasoning capability is clearly different from existing catalog entries, create a new Knowledge Point.

3. PREFER GENERAL COGNITIVE OPERATORS
   WRONG:
   - blood_relation_uncle
   - matrix_diagonal_problem
   - count_words_in_sentence

   RIGHT:
   - relationship_composition
   - matrix_traversal
   - accumulator_pattern

4. ENSURE TRANSFERABILITY
   Each KP should be applicable across multiple different questions and not tied to a single problem scenario.

IMPORTANT: The catalog is for NAMING CONSISTENCY only. Do NOT create nodes for skills that are not required by the given questions.

CURRICULUM AWARENESS: When questions are tagged with a topic, do NOT create skill nodes from topics that come LATER in the curriculum sequence.

======================================================================
PHASE 6: JSON OUTPUT FORMAT
======================================================================

Return the final knowledge graph using the following strict JSON structure. The schema must remain unchanged.

IMPORTANT: Do NOT include "ipaByQuestion" in your output. Output ONLY these fields:

{
  "globalNodes": [
    {
      "id": "snake_case_skill_id",
      "name": "Human-Readable Skill Name",
      "level": 0,
      "description": "What mastery of this skill looks like",
      "knowledgePoint": {
        "atomicityCheck": "Can be tested with: [single question type]",
        "assessmentExample": "Sample question testing ONLY this skill",
        "targetAssessmentLevel": 3,
        "appearsInQuestions": ["Q1", "Q5", "Q12"]
      },
      "tier": "core",
      "knowledgeType": "procedural",
      "transferableContexts": ["Context 1", "Context 2", "Context 3", "Context 4", "Context 5"]
    }
  ],
  
  "edges": [
    {
      "from": "prerequisite_skill_id",
      "to": "dependent_skill_id",
      "reason": "Why B cannot be performed reliably without A",
      "relationshipType": "requires"
    }
  ],
  
  "questionPaths": {
    "Question text": {
      "requiredNodes": ["skill1", "skill2"],
      "executionOrder": ["skill1", "skill2"],
      "validationStatus": "valid",
      "primarySkills": ["skill2"],
      "skillWeights": {"skill2": 0.6, "skill1": 0.4}
    }
  },
  
  "courses": {
    "Default": {
      "nodes": [{"id": "skill_id", "inCourse": true}]
    }
  }
}

NOTE: cme and le fields will be auto-populated by the client. Do NOT include them.

=== SKILL WEIGHT GENERATION ===

For EACH question, estimate the cognitive load distribution across its required skills:

1. IDENTIFY PRIMARY SKILLS (1-2): The skill(s) that are the main differentiator/challenge
   - Maximum 2 primary skills per question
   - Use 2 primaries when question has TWO equally-important cognitive focuses
   - Most questions should still have just 1 primary
   - This is typically the highest-level or most complex skill(s) in the path
    
2. IDENTIFY SECONDARY SKILLS: Supporting/prerequisite knowledge applied passively
   - These are skills needed but not the focus of the question
    
3. ASSIGN WEIGHTS (must sum to 1.0):
   - If 1 primary: PRIMARY skill gets 0.6, SECONDARY skills split remaining 0.4
   - If 2 primaries: Each PRIMARY gets 0.3 (0.6 total), SECONDARY skills split 0.4
    
4. ALWAYS output primarySkills as an ARRAY in questionPaths

=== QUALITY VALIDATION (MANDATORY - FAIL = REDO) ===

Before outputting, you MUST verify and FIX if any check fails:

1. COUNT CHECK: nodes.length <= questions.length / 5
   If FAIL → go back and merge more aggressively
    
2. REUSE CHECK: Every node appears in >= 2 questions
   If FAIL → node is too specific, generalize it
    
3. DUPLICATE CHECK: No two nodes test the same underlying capability
   If FAIL → merge them into one
    
4. CATALOG CHECK: Every new node (not in catalog) must be justified

5. Edge Density: Aim for 1.5-2.5 edges per node
6. DAG Property: No cycles in edge graph
7. Level Distribution: Nodes spread across 4-6 levels
8. Necessity: Every edge passes the "WITHOUT X?" test

=== SELF-CHECK BEFORE RETURNING (MANDATORY) ===

1. Count your edges and nodes. Compute edges/nodes ratio.
   If ratio < 1.5, you are UNDER-CONNECTED. Go back and add 
   missing edges from the MANDATORY list above.
2. List every node with zero incoming edges. Each one MUST be 
   one of these foundational skills: ${Array.from(config.independentFoundational).join(', ')}.
   If any non-foundational node has zero incoming edges, add the 
   appropriate prerequisite edge.
3. Verify every MANDATORY edge pair: if both nodes exist, the 
   edge must exist.

=== TARGET METRICS ===

- Skill count: 1 per 5-15 questions
- Edge density: 1.5-2.5 edges per node average
- Reuse rate: Each skill in 10%+ of questions
- Max depth: 5-7 levels for typical curriculum

Output ONLY valid JSON, no explanation.`;
}

// ============================================================
// SHARED UTILITY FUNCTIONS
// ============================================================

function getDomainConfig(domain: string): DomainConfig {
  return domain === 'web' ? WEB_CONFIG : PYTHON_CONFIG;
}

function getCurriculumPosition(topic: string, config: DomainConfig): number {
  if (config.curriculumTopics.length === 0) return -1;
  const lower = topic.toLowerCase();
  const idx = config.curriculumTopics.findIndex(t => 
    t.toLowerCase() === lower || lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower)
  );
  return idx >= 0 ? idx + 1 : -1;
}

const incrementalPromptAddition = `

=== INCREMENTAL MODE (STRICT REUSE) ===

You are EXTENDING an existing skill graph. CRITICAL RULES:

1. SEMANTIC MATCHING (not just name matching):
   - If an existing skill covers the SAME cognitive capability, use its EXACT ID
   - Match by MEANING, not just keywords
   - Example: "dict_operations" and "dictionary manipulation" = SAME skill → use existing ID
   
2. MATCHING CRITERIA:
   A skill matches if ANY of these are true:
   - Tests the same underlying cognitive ability
   - Would have identical prerequisite edges
   - A question requiring skill A would also require skill B (and vice versa)
   
3. NEVER CREATE DUPLICATES:
   Before creating ANY new skill, ask:
   "Is there an existing skill that tests this SAME capability?"
   If YES → MUST use existing ID
   If NO → create new skill
   
4. OUTPUT REQUIREMENTS:
   - Include ipaByQuestion for NEW questions only
   - Return ONLY genuinely new skills (not in existing list)
   - Include edges connecting new skills to existing skills
   - For question paths, use existing skill IDs when they match

Existing skills (MUST reuse these IDs when capability matches):
`;

function isLikelyTruncatedJson(text: string): boolean {
  const openCurly = (text.match(/\{/g) || []).length;
  const closeCurly = (text.match(/\}/g) || []).length;
  const openSquare = (text.match(/\[/g) || []).length;
  const closeSquare = (text.match(/\]/g) || []).length;
  return openCurly !== closeCurly || openSquare !== closeSquare;
}

function attemptJsonRepair(text: string): any | null {
  console.log("[IPA/LTA] Attempting JSON repair for truncated response...");
  let repaired = text.trim();
  let openCurly = 0;
  let openSquare = 0;
  let lastValidPos = 0;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (char === '{') openCurly++;
    else if (char === '}') {
      openCurly--;
      if (openCurly >= 0 && openSquare >= 0) lastValidPos = i + 1;
    }
    else if (char === '[') openSquare++;
    else if (char === ']') {
      openSquare--;
      if (openCurly >= 0 && openSquare >= 0) lastValidPos = i + 1;
    }
  }
  
  if (lastValidPos > 0 && lastValidPos < repaired.length) {
    repaired = repaired.substring(0, lastValidPos);
  }
  
  while (openSquare > 0) { repaired += ']'; openSquare--; }
  while (openCurly > 0) { repaired += '}'; openCurly--; }
  
  repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  
  try {
    const parsed = JSON.parse(repaired);
    console.log("[IPA/LTA] JSON repair successful!");
    return parsed;
  } catch (e) {
    console.error("[IPA/LTA] JSON repair failed:", (e as Error).message);
    return null;
  }
}

function calculateMaxTokens(questionCount: number, isIncremental: boolean, existingNodeCount: number = 0): number {
  // Always request max output to avoid truncation — Gemini 2.5 Flash supports up to 65536
  const maxTokens = 65536;
  console.log(`[IPA/LTA] Calculated max_tokens: ${maxTokens} for ${questionCount} questions (existing nodes: ${existingNodeCount})`);
  return maxTokens;
}

function extractJsonFromResponse(response: string): any {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");
    if (arrayStart === -1 || arrayEnd === -1) {
      throw new Error("No JSON object or array found in response");
    }
    cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
  } else {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  cleaned = cleaned
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\t+/g, " ")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");

    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      console.error("Failed to parse JSON even after fixes. First 500 chars:", cleaned.substring(0, 500));
      console.error("Last 500 chars:", cleaned.substring(cleaned.length - 500));

      if (isLikelyTruncatedJson(cleaned)) {
        const repaired = attemptJsonRepair(cleaned);
        if (repaired) {
          console.log("[IPA/LTA] Successfully recovered partial response");
          return repaired;
        }
        throw new Error(
          "AI response appears truncated (incomplete JSON). Try reducing the number of questions or splitting them into smaller batches."
        );
      }

      throw new Error(`Failed to parse AI response as JSON: ${(secondError as Error).message}`);
    }
  }
}

interface ExistingNode {
  id: string;
  name: string;
  tier?: string;
  description?: string;
}

function transitiveReduce(edges: { from: string; to: string; [k: string]: unknown }[]): typeof edges {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    adj.get(e.from)!.add(e.to);
  }

  function isReachableWithout(start: string, target: string): boolean {
    const visited = new Set<string>();
    const queue = [start];
    visited.add(start);
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const neighbor of adj.get(node) || []) {
        if (node === start && neighbor === target) continue;
        if (neighbor === target) return true;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return false;
  }

  const reduced = edges.filter(e => {
    if (isReachableWithout(e.from, e.to)) {
      console.warn(`[IPA/LTA] Transitive reduction: removed ${e.from} -> ${e.to}`);
      adj.get(e.from)?.delete(e.to);
      return false;
    }
    return true;
  });

  console.log(`[IPA/LTA] Transitive reduction: ${edges.length} -> ${reduced.length} edges`);
  return reduced;
}

function breakCycles(edges: { from: string; to: string; [k: string]: unknown }[]): typeof edges {
  let currentEdges = [...edges];
  let iteration = 0;
  const maxIterations = 100;

  while (iteration < maxIterations) {
    iteration++;
    const allNodes = new Set<string>();
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const e of currentEdges) {
      allNodes.add(e.from);
      allNodes.add(e.to);
      inDegree.set(e.from, inDegree.get(e.from) || 0);
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e.to);
    }

    const queue: string[] = [];
    for (const node of allNodes) {
      if ((inDegree.get(node) || 0) === 0) queue.push(node);
    }

    const processed = new Set<string>();
    while (queue.length > 0) {
      const node = queue.shift()!;
      processed.add(node);
      for (const neighbor of adj.get(node) || []) {
        const deg = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) queue.push(neighbor);
      }
    }

    if (processed.size === allNodes.size) break;

    const cycleEdges = currentEdges.filter(e => !processed.has(e.from) && !processed.has(e.to));
    if (cycleEdges.length === 0) break;

    const removed = cycleEdges[cycleEdges.length - 1];
    console.warn(`[IPA/LTA] Cycle breaking: removed ${removed.from} -> ${removed.to}`);
    currentEdges = currentEdges.filter(e => !(e.from === removed.from && e.to === removed.to));
  }

  if (currentEdges.length < edges.length) {
    console.log(`[IPA/LTA] Cycle breaking: ${edges.length} -> ${currentEdges.length} edges`);
  }
  return currentEdges;
}

function recomputeLevels(nodes: { id: string; level: number; [k: string]: unknown }[], edges: { from: string; to: string }[]): void {
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    if (!incoming.has(e.to)) incoming.set(e.to, []);
    incoming.get(e.to)!.push(e.from);
  }

  const levelMap = new Map<string, number>();
  const nodeIds = new Set(nodes.map(n => n.id));

  function getLevel(id: string, visited: Set<string>): number {
    if (levelMap.has(id)) return levelMap.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    
    const prereqs = (incoming.get(id) || []).filter(p => nodeIds.has(p));
    const level = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map(p => getLevel(p, visited)));
    levelMap.set(id, level);
    return level;
  }

  for (const node of nodes) {
    node.level = getLevel(node.id, new Set());
  }
  
  console.log(`[IPA/LTA] Recomputed levels: max depth = ${Math.max(0, ...nodes.map(n => n.level))}`);
}

function injectMandatoryEdges(
  nodes: Array<{ id: string; [k: string]: unknown }>,
  edges: Array<{ from: string; to: string; [k: string]: unknown }>,
  config: DomainConfig
): typeof edges {
  const nodeIds = new Set(nodes.map(n => n.id));
  const edgeSet = new Set(edges.map(e => `${e.from}->${e.to}`));
  let injected = 0;

  for (const me of config.mandatoryEdges) {
    if (nodeIds.has(me.from) && nodeIds.has(me.to)) {
      const key = `${me.from}->${me.to}`;
      if (!edgeSet.has(key)) {
        edges.push({ from: me.from, to: me.to, reason: me.reason, relationshipType: 'requires' });
        edgeSet.add(key);
        injected++;
        console.log(`[IPA/LTA] Injected mandatory edge: ${me.from} -> ${me.to}`);
      }
    }
  }

  if (injected > 0) {
    console.log(`[IPA/LTA] Injected ${injected} mandatory edges`);
  }
  return edges;
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: { questions?: string[]; existingNodes?: ExistingNode[]; topicMap?: Record<string, string>; domain?: string };
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        return new Response(
          JSON.stringify({ error: "Request body is empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      body = JSON.parse(text);
    } catch (parseErr) {
      console.error("[IPA/LTA] Failed to parse request body:", parseErr);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { questions, existingNodes, topicMap, domain } = body;
    const config = getDomainConfig(domain || 'python');
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No questions provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const isIncremental = existingNodes && existingNodes.length > 0;
    console.log(`[IPA/LTA] Generating knowledge graph for ${questions.length} questions (domain: ${domain || 'python'}, incremental: ${isIncremental}, existing skills: ${existingNodes?.length || 0})`);

    // Build the prompt based on mode and domain
    let fullSystemPrompt = buildSystemPrompt(config);
    
    if (isIncremental) {
      const nodeList = existingNodes!
        .map(n => `- ${n.id}: "${n.name}"${n.tier ? ` [${n.tier}]` : ''}${n.description ? ` - ${n.description.substring(0, 60)}...` : ''}`)
        .join('\n');
      fullSystemPrompt += incrementalPromptAddition + nodeList;
    }

    const targetMinSkills = Math.ceil(questions.length / 15);
    const targetMaxSkills = Math.ceil(questions.length / 5);

    // Format questions with topic context if topicMap is provided
    let questionsBlock: string;
    if (topicMap && Object.keys(topicMap).length > 0) {
      let currentTopic = '';
      const lines: string[] = [];
      questions.forEach((q: string, i: number) => {
        const topic = topicMap[String(i)] || 'General';
        if (topic !== currentTopic) {
          currentTopic = topic;
          const pos = getCurriculumPosition(topic, config);
          lines.push(`\n--- Topic: ${topic}${pos > 0 ? ` (Position ${pos} in curriculum)` : ''} ---`);
        }
        lines.push(`${i + 1}. ${q}`);
      });
      questionsBlock = lines.join('\n');
    } else {
      questionsBlock = questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n');
    }

    const userPrompt = `Questions to analyze using IPA/LTA methodology:
${questionsBlock}

=== ANALYSIS INSTRUCTIONS ===

1. For EACH question, perform IPA internally (trace cognitive algorithm)
2. For EACH IPA step, perform LTA (identify knowledge requirements)
3. NORMALIZE the extracted knowledge into unified skill nodes
4. BUILD the DAG with necessity-tested prerequisite edges

=== TARGET METRICS ===

- Expected skill count: ${targetMinSkills} to ${targetMaxSkills} skills for ${questions.length} questions
- Apply the "WITHOUT X?" test for EVERY edge
- Ensure 60%+ skill reuse across questions
${isIncremental ? '- REUSE existing skill IDs when IPA/LTA maps to same capability\n- Return ONLY new skills, but include all necessary edges' : ''}

CRITICAL: Do NOT include "ipaByQuestion" in your output. Output ONLY: globalNodes, edges, questionPaths, courses.

Generate the knowledge graph JSON.`;

    const model = "deepseek/deepseek-v3.2";
    const maxTokens = calculateMaxTokens(questions.length, isIncremental ?? false, existingNodes?.length || 0);
    
    const MAX_RETRIES = 3;
    let lastError: string = "AI processing failed";
    let data: any = null;
    let content: string | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: fullSystemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = errorData.error?.message || `AI error (${response.status})`;
          console.error(`[IPA/LTA] AI attempt ${attempt}/${MAX_RETRIES} failed:`, response.status, JSON.stringify(errorData));

          if (response.status === 429) {
            if (attempt < MAX_RETRIES) {
              const retryAfter = response.headers.get('Retry-After');
              const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 10000;
              console.log(`[IPA/LTA] Rate limited (429). Waiting ${waitMs / 1000}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
              await new Promise(r => setTimeout(r, waitMs));
              continue;
            }
            return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
              status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to your Lovable workspace." }), {
              status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 401) {
            return new Response(JSON.stringify({ error: "AI authentication failed. Please contact support." }), {
              status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          if (response.status >= 500 && attempt < MAX_RETRIES) {
            const delay = attempt * 2000;
            console.log(`[IPA/LTA] Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }

          return new Response(JSON.stringify({ error: lastError }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const rawText = await response.text();
        if (!rawText || rawText.trim().length === 0) {
          console.warn(`[IPA/LTA] Empty response body on attempt ${attempt}/${MAX_RETRIES}`);
          lastError = "AI returned an empty response";
          if (attempt < MAX_RETRIES) {
            const delay = attempt * 2000;
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          return new Response(
            JSON.stringify({ error: "AI returned an empty response after multiple attempts. Please try again." }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        data = JSON.parse(rawText);
        
        const finishReason = data.choices?.[0]?.finish_reason;
        console.log(`[IPA/LTA] Lovable AI finish reason: ${finishReason}`);
        if (finishReason === 'length') {
          console.warn('[IPA/LTA] Response was truncated due to max tokens limit');
        }

        content = data.choices?.[0]?.message?.content;

        const choiceError = data.choices?.[0]?.error;
        if ((!content || content.trim() === '') && choiceError) {
          const providerMsg = choiceError.message || 'Unknown provider error';
          console.warn(`[IPA/LTA] Upstream provider error on attempt ${attempt}/${MAX_RETRIES}: ${providerMsg}`);
          lastError = `AI service temporarily unavailable (${providerMsg})`;
          if (attempt < MAX_RETRIES) {
            const delay = attempt * 2000;
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          return new Response(
            JSON.stringify({ error: `${lastError}. Please try again.` }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!content || content.trim() === '') {
          console.warn(`[IPA/LTA] No content on attempt ${attempt}/${MAX_RETRIES}. Response: ${JSON.stringify(data).substring(0, 200)}`);
          lastError = "AI returned an empty response";
          if (attempt < MAX_RETRIES) {
            const delay = attempt * 2000;
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          return new Response(
            JSON.stringify({ error: "AI returned an empty response after multiple attempts. Please try again." }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        break;

      } catch (fetchErr) {
        console.error(`[IPA/LTA] Fetch/parse error on attempt ${attempt}/${MAX_RETRIES}:`, fetchErr);
        lastError = fetchErr instanceof Error ? fetchErr.message : "AI request failed";
        if (attempt < MAX_RETRIES) {
          const delay = attempt * 2000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        return new Response(
          JSON.stringify({ error: "AI returned an invalid response after multiple attempts. Please try again." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Retry the entire AI call if JSON parsing fails (model sometimes outputs malformed JSON)
    const JSON_PARSE_RETRIES = 3;
    let graphData;
    
    for (let parseAttempt = 1; parseAttempt <= JSON_PARSE_RETRIES; parseAttempt++) {
      try {
        graphData = extractJsonFromResponse(content);
        break; // success
      } catch (parseError) {
        console.error(`[IPA/LTA] JSON extraction error (attempt ${parseAttempt}/${JSON_PARSE_RETRIES}):`, parseError);
        
        if (parseAttempt >= JSON_PARSE_RETRIES) {
          return new Response(
            JSON.stringify({ error: "AI returned malformed JSON after multiple attempts. Please try again." }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Re-call the AI to get a fresh response
        console.log(`[IPA/LTA] Re-requesting AI response due to malformed JSON...`);
        const retryResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: fullSystemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature: 0.2,
          }),
        });
        
        if (!retryResponse.ok) {
          console.error(`[IPA/LTA] Retry AI call failed: ${retryResponse.status}`);
          continue;
        }
        
        const retryData = await retryResponse.json();
        content = retryData.choices?.[0]?.message?.content;
        if (!content || content.trim() === '') {
          console.warn(`[IPA/LTA] Retry returned empty content`);
          continue;
        }
      }
    }

    // === PROGRAMMATIC POST-GENERATION NODE FILTER ===
    // Only apply topic filtering if the domain has a skill topic map
    if (graphData.globalNodes && Array.isArray(graphData.globalNodes) && topicMap && Object.keys(topicMap).length > 0 && Object.keys(config.skillTopicMap).length > 0) {
      let maxTopicPosition = 0;
      for (const topic of Object.values(topicMap)) {
        const pos = getCurriculumPosition(topic as string, config);
        if (pos > maxTopicPosition) maxTopicPosition = pos;
      }
      
      if (maxTopicPosition > 0) {
        const removedNodes = new Set<string>();
        graphData.globalNodes = graphData.globalNodes.filter((node: { id: string }) => {
          const allowedTopic = config.skillTopicMap[node.id];
          if (allowedTopic !== undefined && allowedTopic > maxTopicPosition) {
            console.warn(`[IPA/LTA] Topic filter: removed node "${node.id}" (topic ${allowedTopic}) — exceeds max topic position ${maxTopicPosition}`);
            removedNodes.add(node.id);
            return false;
          }
          return true;
        });
        
        if (removedNodes.size > 0 && graphData.edges && Array.isArray(graphData.edges)) {
          graphData.edges = graphData.edges.filter((e: { from: string; to: string }) => {
            if (removedNodes.has(e.from) || removedNodes.has(e.to)) {
              console.warn(`[IPA/LTA] Topic filter: removed edge ${e.from} -> ${e.to}`);
              return false;
            }
            return true;
          });
        }
        
        if (removedNodes.size > 0 && graphData.questionPaths) {
          for (const [question, path] of Object.entries(graphData.questionPaths)) {
            if (Array.isArray(path)) {
              graphData.questionPaths[question] = (path as string[]).filter((id: string) => !removedNodes.has(id));
            } else {
              const p = path as any;
              if (p.requiredNodes) p.requiredNodes = p.requiredNodes.filter((id: string) => !removedNodes.has(id));
              if (p.executionOrder) p.executionOrder = p.executionOrder.filter((id: string) => !removedNodes.has(id));
              if (p.skillWeights) {
                for (const id of removedNodes) delete p.skillWeights[id];
              }
              if (p.primarySkills) p.primarySkills = p.primarySkills.filter((id: string) => !removedNodes.has(id));
            }
          }
        }
        
        console.log(`[IPA/LTA] Topic filter: removed ${removedNodes.size} out-of-sequence nodes (max topic: ${maxTopicPosition})`);
      }
    }
    
    // === INDEPENDENCE RULE ENFORCEMENT ===
    if (graphData.edges && Array.isArray(graphData.edges)) {
      const beforeIndep = graphData.edges.length;
      graphData.edges = graphData.edges.filter((e: { from: string; to: string }) => {
        if (config.independentFoundational.has(e.to)) {
          console.warn(`[IPA/LTA] Independence rule: removed edge ${e.from} -> ${e.to} (target is foundational)`);
          return false;
        }
        return true;
      });
      if (graphData.edges.length < beforeIndep) {
        console.log(`[IPA/LTA] Independence rule: removed ${beforeIndep - graphData.edges.length} edges pointing into foundational skills`);
      }
    }
    
    // Inject mandatory edges
    if (graphData.globalNodes && Array.isArray(graphData.globalNodes) && graphData.edges && Array.isArray(graphData.edges)) {
      const allNodesForInjection = [...graphData.globalNodes];
      if (existingNodes) {
        for (const en of existingNodes) {
          if (!allNodesForInjection.some((n: { id: string }) => n.id === en.id)) {
            allNodesForInjection.push(en as any);
          }
        }
      }
      graphData.edges = injectMandatoryEdges(allNodesForInjection, graphData.edges, config);
    }

    // Post-processing: strip bidirectional edges to enforce DAG
    if (graphData.edges && Array.isArray(graphData.edges)) {
      const edgeSet = new Set<string>();
      graphData.edges = graphData.edges.filter((edge: { from: string; to: string }) => {
        const key = `${edge.from}:${edge.to}`;
        const reverseKey = `${edge.to}:${edge.from}`;
        if (edgeSet.has(key) || edgeSet.has(reverseKey) || edge.from === edge.to) {
          console.warn(`[IPA/LTA] Stripped cycle/duplicate edge: ${edge.from} -> ${edge.to}`);
          return false;
        }
        edgeSet.add(key);
        return true;
      });

      graphData.edges = transitiveReduce(graphData.edges);
      graphData.edges = breakCycles(graphData.edges);

      if (graphData.globalNodes && Array.isArray(graphData.globalNodes)) {
        const nodeIds = new Set(graphData.globalNodes.map((n: { id: string }) => n.id));
        if (existingNodes) {
          for (const en of existingNodes) nodeIds.add(en.id);
        }
        const beforeOrphan = graphData.edges.length;
        graphData.edges = graphData.edges.filter((e: { from: string; to: string }) => 
          nodeIds.has(e.from) && nodeIds.has(e.to)
        );
        if (graphData.edges.length < beforeOrphan) {
          console.warn(`[IPA/LTA] Orphan cleanup: removed ${beforeOrphan - graphData.edges.length} dangling edges`);
        }

        recomputeLevels(graphData.globalNodes, graphData.edges);
      }
    }

    const nodeCount = graphData.globalNodes?.length || 0;
    const edgeCount = graphData.edges?.length || 0;
    const questionCount = Object.keys(graphData.questionPaths || {}).length;
    const ipaCount = Object.keys(graphData.ipaByQuestion || {}).length;
    const edgeDensity = nodeCount > 0 ? (edgeCount / nodeCount).toFixed(2) : 0;
    
    console.log(`[IPA/LTA] Generated knowledge graph:`);
    console.log(`  - Skills: ${nodeCount} (target: ${targetMinSkills}-${targetMaxSkills})`);
    console.log(`  - Edges: ${edgeCount} (density: ${edgeDensity} per node)`);
    console.log(`  - Question mappings: ${questionCount}`);
    console.log(`  - IPA traces: ${ipaCount}`);

    return new Response(JSON.stringify(graphData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[IPA/LTA] generate-graph error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
