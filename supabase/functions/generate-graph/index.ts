import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * IPA/LTA Knowledge Graph Generation System Prompt
 * 
 * Implements the 4-phase pipeline:
 * Phase 1: IPA (Information Processing Analysis) - Trace cognitive algorithm
 * Phase 2: LTA (Learning Task Analysis) - Extract knowledge requirements
 * Phase 3: Normalization - Unify, atomize, assign tiers
 * Phase 4: Build DAG - Construct prerequisite edges
 */
const systemPrompt = `You are a Knowledge Graph Engineer using the IPA/LTA methodology to build cognitive skill maps.

=== INPUT FORMAT ===

Questions are provided in a simple structured format with these sections:
- Question: The task description
- Input: Expected input format/types
- Output: Expected output format/types  
- Explanation: Solution approach, algorithm description, or hints

Multiple questions are separated by new "Question:" sections.

Use ALL sections when performing IPA analysis:
- Explanation informs the DECIDE and EXECUTE steps with solution strategy
- Input/Output sections clarify data type handling requirements

=== OVERVIEW ===

You will analyze questions through a structured 4-phase pipeline:
1. IPA: Trace the cognitive algorithm for each question
2. LTA: Extract knowledge requirements from each cognitive step
3. Normalize: Unify synonyms, ensure atomicity, assign tiers
4. Build DAG: Construct prerequisite edges with strict necessity criteria

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
a student would have encountered BY that point in the curriculum.

=== PHASE 1: INFORMATION PROCESSING ANALYSIS (IPA) ===

For EACH question, trace the cognitive algorithm a competent student uses:

| Step Type | Description | Example |
|-----------|-------------|---------|
| PERCEIVE | Notice relevant features in input | "See that input has multiple lines" |
| ENCODE | Transform input into mental representation | "Parse as list of integers" |
| RETRIEVE | Recall knowledge from long-term memory | "Recall dictionary syntax" |
| DECIDE | Choose strategy or branch | "If count needed, use accumulator pattern" |
| EXECUTE | Perform computational action | "Initialize empty dict, iterate, update" |
| MONITOR | Check correctness, handle edge cases | "Verify no KeyError, handle empty input" |

Output IPA traces for each question to show your reasoning.

=== PHASE 2: LEARNING TASK ANALYSIS (LTA) ===

For each IPA step, identify the specific knowledge required:

| Category | Description | Example |
|----------|-------------|---------|
| declarative | Facts, definitions, syntax knowledge | "dict[key] = value syntax" |
| procedural | How-to sequences, step-by-step methods | "Steps to iterate with enumerate" |
| conditional | When to apply what (decision rules) | "Use .get() when key might not exist" |
| strategic | High-level planning and patterns | "Accumulator pattern for counting" |

=== THE "WITHOUT X?" TEST ===

For each candidate skill, ask: "Can a student RELIABLY perform this step WITHOUT having mastered X?"
- If NO → X is a prerequisite (add edge)
- If YES → X is NOT required (don't add edge)

This prevents spurious edges and keeps the graph minimal.

=== PHASE 3: NORMALIZATION ===

Convert raw LTA outputs into a unified skill vocabulary:

1. SYNONYM UNIFICATION: Merge nodes with identical observable behavior
   - "Initialize empty dict" + "Create new dictionary" → dictionary_operations
   
2. ATOMICITY SPLIT: Break compound skills until single-testable
   - "Use dictionary for counting" → dictionary_operations + loop_iteration + accumulator_pattern

3. TIER ASSIGNMENT: Classify by complexity level
   | Tier | Description | Examples |
   |------|-------------|----------|
   | foundational | Language primitives | Variables, Operators, Basic Types |
   | core | Control structures | Loops, Conditionals, Functions |
   | applied | Patterns & combinations | Accumulator, Search, String Processing |
   | advanced | Complex algorithms | Recursion, Dynamic Programming |

4. TRANSFERABILITY CHECK: Ensure skill applies across 5+ contexts
   - If skill is context-specific, generalize or merge with similar

5. CATALOG MAPPING: Check REFERENCE SKILL CATALOG first
   - Only create new skills if no catalog match exists

=== CONSOLIDATION RULES (STRICT - MUST FOLLOW) ===

RULE 1: ONE SKILL PER CONCEPT
- "Initialize empty dictionary" → dictionary_operations
- "Add key to dictionary" → dictionary_operations  
- "Check if key exists" → dictionary_operations
- ALL dictionary work = ONE node: dictionary_operations

RULE 2: PATTERN OVER CONTEXT
- "Count words" → accumulator_pattern
- "Sum numbers" → accumulator_pattern
- "Collect unique items" → accumulator_pattern
- ALL accumulation = ONE node: accumulator_pattern

RULE 3: NO CONTEXT-SPECIFIC NODES
WRONG: "nested_loop_for_pyramid", "nested_loop_for_matrix"
RIGHT: "nested_iteration" (applies to ALL 2D traversal)

RULE 4: MAXIMUM NODE COUNT
For N questions, create AT MOST N/5 skill nodes.
If you have more, you MUST consolidate further.

RULE 5: PRE-MERGE CHECK
Before finalizing, ask for EACH node:
"Could this be merged with another node without losing testable distinction?"
If YES → merge them

=== PHASE 4: BUILD DAG ===

Construct prerequisite edges using strict COGNITIVE DEPENDENCY criteria:

PREREQUISITE means COGNITIVE DEPENDENCY, not execution order:
- Ask: "Can a student LEARN skill B without ever having been taught skill A?"
- If YES -> no edge needed  
- If NO -> add edge A -> B

MANDATORY PREREQUISITE EDGES -- You MUST include these edges whenever 
both the source and target nodes exist in your output:
- variable_assignment -> basic_input (input() requires storing the result)
- variable_assignment -> type_conversion (you convert values stored in variables)
- variable_assignment -> string_concatenation (you concatenate values in variables)
- variable_assignment -> string_indexing (indexing requires a string stored in a variable)
- variable_assignment -> string_repetition (repetition operates on strings in variables)
- variable_assignment -> sequence_length_retrieval (len() operates on values stored in variables)
- type_recognition -> type_conversion (must recognize types before converting)
- arithmetic_operations -> comparison_operators (comparisons often involve computed values)
- comparison_operators -> conditional_branching (conditions use comparisons)
- conditional_branching -> nested_conditions (nesting requires understanding single conditions)
- variable_assignment -> loop_iteration (loops operate on variables)
- loop_iteration -> accumulator_pattern (accumulating requires looping)
- loop_iteration -> search_pattern (searching requires iterating)
- string_indexing -> string_slicing (slicing builds on indexing concepts)
- conditional_branching -> filter_pattern (filtering requires if/else)
- basic_output -> formatted_output (if formatted_output exists)

If both nodes in a pair above appear in your output, the edge MUST 
be present. Omitting it is an error.

WRONG edges (execution order, not learning dependency):
- string_concatenation -> basic_output (you don't need concat to learn print())
- basic_output -> variable_assignment (you don't need print to learn x = 5)
- arithmetic_operations -> basic_output (you don't need math to learn print())

INDEPENDENCE RULE: These specific foundational skills are independent 
entry points and should NOT require each other as prerequisites:
  variable_assignment, basic_output, arithmetic_operations, type_recognition
However, skills that BUILD on these foundations (like basic_input, 
type_conversion, string_concatenation) SHOULD have appropriate prerequisite 
edges pointing back to the foundational skills they depend on.

MINIMUM CONNECTIVITY: Every non-foundational node MUST have at least 
one incoming prerequisite edge. If a skill has no prerequisites, it 
should be at level 0 (foundational). Aim for 1.5-2.5 edges per node.

1. NECESSITY TEST: Only add edge A → B if:
   - Performance on B is UNRELIABLE without A
   - A provides ESSENTIAL cognitive knowledge for B (not just helpful)

2. DIRECTION FLOW: Edges follow learning hierarchy:
   Declarative → Procedural → Conditional → Strategic
   Concept → Procedure → Strategy → Performance

3. TRANSITIVITY REDUCTION: Remove redundant edges
   - If A → B and B → C, do NOT add direct A → C

4. LEVEL COMPUTATION:
   level(node) = 0 if no prerequisites
   level(node) = 1 + max(level(prereq) for prereq in prerequisites)

=== TARGET METRICS ===

- Skill count: 1 per 5-15 questions
- Edge density: 1.5-2.5 edges per node average
- Reuse rate: Each skill in 10%+ of questions
- Max depth: 5-7 levels for typical curriculum

=== OUTPUT FORMAT (strict JSON) ===

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

SELF-CHECK BEFORE RETURNING (mandatory):
1. Count your edges and nodes. Compute edges/nodes ratio.
   If ratio < 1.5, you are UNDER-CONNECTED. Go back and add 
   missing edges from the MANDATORY list above.
2. List every node with zero incoming edges. Each one MUST be 
   one of these foundational skills: variable_assignment, basic_output, 
   arithmetic_operations, type_recognition.
   If any non-foundational node has zero incoming edges, add the 
   appropriate prerequisite edge.
3. Verify every MANDATORY edge pair: if both nodes exist, the 
   edge must exist.

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
   
4. EXAMPLE (1 primary):
   Question testing: [loop_iteration, dictionary_operations, accumulator_pattern]
   Primary skills: ["accumulator_pattern"] (the strategic challenge)
   Weights: { "accumulator_pattern": 0.6, "loop_iteration": 0.2, "dictionary_operations": 0.2 }

5. EXAMPLE (2 primaries):
   Question testing: [loop_iteration, dictionary_operations, accumulator_pattern, conditional_branching]
   Primary skills: ["accumulator_pattern", "dictionary_operations"] (both are core challenges)
   Weights: { "accumulator_pattern": 0.3, "dictionary_operations": 0.3, "loop_iteration": 0.2, "conditional_branching": 0.2 }
   
6. ALWAYS output primarySkills as an ARRAY in questionPaths (e.g., ["skill1"] or ["skill1", "skill2"])

=== QUALITY VALIDATION (MANDATORY - FAIL = REDO) ===

Before outputting, you MUST verify and FIX if any check fails:

1. COUNT CHECK: nodes.length <= questions.length / 5
   If FAIL → go back and merge more aggressively
   
2. REUSE CHECK: Every node appears in >= 2 questions
   If FAIL → node is too specific, generalize it
   
3. DUPLICATE CHECK: No two nodes test the same underlying capability
   If FAIL → merge them into one
   
4. CATALOG CHECK: Every new node (not in catalog) must be justified
   Ask: "Why couldn't this map to an existing catalog skill?"

5. Edge Density: Aim for 1.5-2.5 edges per node. Every non-foundational 
   node should have at least one incoming edge.
6. DAG Property: No cycles in edge graph
7. Level Distribution: Nodes spread across 4-6 levels
8. Necessity: Every edge passes the "WITHOUT X?" test

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
- accumulator_pattern (applied, strategic)

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
OR when the repetition count is variable/large.

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
12. Dictionaries
13. Introduction to Object Oriented Programming
14. Miscellaneous Topics

Output ONLY valid JSON, no explanation.`;

const CURRICULUM_TOPICS = [
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
  "Dictionaries",
  "Introduction to Object Oriented Programming",
  "Miscellaneous Topics",
];

function getCurriculumPosition(topic: string): number {
  const lower = topic.toLowerCase();
  const idx = CURRICULUM_TOPICS.findIndex(t => t.toLowerCase() === lower || lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower));
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

/**
 * Attempt to repair truncated JSON by completing partial structures
 */
function attemptJsonRepair(text: string): any | null {
  console.log("[IPA/LTA] Attempting JSON repair for truncated response...");
  
  // Find the last complete object or array
  let repaired = text.trim();
  
  // Count and balance braces/brackets
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
  
  // Truncate to last valid position and try to close
  if (lastValidPos > 0 && lastValidPos < repaired.length) {
    repaired = repaired.substring(0, lastValidPos);
  }
  
  // Add closing brackets/braces as needed
  while (openSquare > 0) {
    repaired += ']';
    openSquare--;
  }
  while (openCurly > 0) {
    repaired += '}';
    openCurly--;
  }
  
  // Clean up trailing commas
  repaired = repaired
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');
  
  try {
    const parsed = JSON.parse(repaired);
    console.log("[IPA/LTA] JSON repair successful!");
    return parsed;
  } catch (e) {
    console.error("[IPA/LTA] JSON repair failed:", (e as Error).message);
    return null;
  }
}

/**
 * Calculate appropriate max_tokens based on input size
 * Generous allocation to prevent truncation
 */
function calculateMaxTokens(questionCount: number, isIncremental: boolean, existingNodeCount: number = 0): number {
  // Each question needs ~1200 tokens for complete output (nodes + edges + paths + descriptions)
  // Complex multi-line questions with OOP concepts need more space
  const tokensPerQuestion = 1500;
  
  // Base overhead for JSON structure
  const baseOverhead = 6000;
  
  // Extra for incremental mode - scales with existing node count
  // Each existing node adds context that needs to be processed
  const incrementalOverhead = isIncremental ? 3000 + (existingNodeCount * 50) : 0;
  
  const estimated = baseOverhead + incrementalOverhead + (questionCount * tokensPerQuestion);
  
  // Use generous limits - minimum 16000, cap at 40000 (model supports up to 65k)
  const maxTokens = Math.min(Math.max(estimated, 16000), 40000);
  
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

      // Try JSON repair for truncated responses
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

/**
 * Transitive reduction: for each edge A->C, check if C is reachable
 * from A via other edges. If yes, A->C is redundant and removed.
 */
function transitiveReduce(edges: { from: string; to: string; [k: string]: unknown }[]): typeof edges {
  // Build adjacency list
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    adj.get(e.from)!.add(e.to);
  }

  // BFS reachability check excluding the direct edge
  function isReachableWithout(start: string, target: string): boolean {
    const visited = new Set<string>();
    const queue = [start];
    visited.add(start);
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const neighbor of adj.get(node) || []) {
        // Skip the direct edge we're testing
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
      // Also remove from adjacency so subsequent checks use reduced graph
      adj.get(e.from)?.delete(e.to);
      return false;
    }
    return true;
  });

  console.log(`[IPA/LTA] Transitive reduction: ${edges.length} -> ${reduced.length} edges`);
  return reduced;
}

/**
 * Break cycles using Kahn's algorithm (topological sort).
 * Any edges remaining after all processable nodes are removed form cycles.
 */
function breakCycles(edges: { from: string; to: string; [k: string]: unknown }[]): typeof edges {
  let currentEdges = [...edges];
  let iteration = 0;
  const maxIterations = 100;

  while (iteration < maxIterations) {
    iteration++;
    // Build in-degree map
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

    // Kahn's: queue nodes with in-degree 0
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

    // If all nodes processed, no cycles
    if (processed.size === allNodes.size) break;

    // Find cycle-forming edges (both endpoints unprocessed)
    const cycleEdges = currentEdges.filter(e => !processed.has(e.from) && !processed.has(e.to));
    
    if (cycleEdges.length === 0) break;

    // Remove the last cycle edge (heuristic: least important)
    const removed = cycleEdges[cycleEdges.length - 1];
    console.warn(`[IPA/LTA] Cycle breaking: removed ${removed.from} -> ${removed.to}`);
    currentEdges = currentEdges.filter(e => !(e.from === removed.from && e.to === removed.to));
  }

  if (currentEdges.length < edges.length) {
    console.log(`[IPA/LTA] Cycle breaking: ${edges.length} -> ${currentEdges.length} edges`);
  }
  return currentEdges;
}

/**
 * Recompute node levels from the final edge structure.
 * level = 0 if no incoming edges, else 1 + max(level of prerequisites)
 */
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
    if (visited.has(id)) return 0; // safety: break infinite recursion
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

/**
 * Mandatory prerequisite edges - injected as safety net after AI response parsing.
 * If both nodes exist in the graph but the edge is missing, it gets added.
 */
const MANDATORY_EDGES: Array<{ from: string; to: string; reason: string }> = [
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
];

function injectMandatoryEdges(
  nodes: Array<{ id: string; [k: string]: unknown }>,
  edges: Array<{ from: string; to: string; [k: string]: unknown }>
): typeof edges {
  const nodeIds = new Set(nodes.map(n => n.id));
  const edgeSet = new Set(edges.map(e => `${e.from}->${e.to}`));
  let injected = 0;

  for (const me of MANDATORY_EDGES) {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Safely parse request body with error handling
    let body: { questions?: string[]; existingNodes?: ExistingNode[]; topicMap?: Record<string, string> };
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
    
    const { questions, existingNodes, topicMap } = body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No questions provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isIncremental = existingNodes && existingNodes.length > 0;
    console.log(`[IPA/LTA] Generating knowledge graph for ${questions.length} questions (incremental: ${isIncremental}, existing skills: ${existingNodes?.length || 0})`);

    // Build the prompt based on mode
    let fullSystemPrompt = systemPrompt;
    
    if (isIncremental) {
      // Build richer node context with tier and description for better semantic matching
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
      // Group questions by topic for clearer prompt
      let currentTopic = '';
      const lines: string[] = [];
      questions.forEach((q: string, i: number) => {
        const topic = topicMap[String(i)] || 'General';
        if (topic !== currentTopic) {
          currentTopic = topic;
          const pos = getCurriculumPosition(topic);
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

    const model = "google/gemini-2.5-pro";
    const maxTokens = calculateMaxTokens(questions.length, isIncremental ?? false, existingNodes?.length || 0);
    
    const MAX_RETRIES = 3;
    let response: Response | null = null;
    let lastError: string = "AI processing failed";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
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

      if (response.ok) break;

      const errorData = await response.json().catch(() => ({}));
      lastError = errorData.error?.message || `AI error (${response.status})`;
      console.error(`[IPA/LTA] AI attempt ${attempt}/${MAX_RETRIES} failed:`, response.status, JSON.stringify(errorData));

      // Non-retryable errors
      if (response.status === 429) {
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

      // Retryable 5xx — wait before retrying
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        const delay = attempt * 2000;
        console.log(`[IPA/LTA] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }

    if (!response || !response.ok) {
      return new Response(JSON.stringify({ error: lastError }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data: any;
    try {
      const rawText = await response.text();
      if (!rawText || rawText.trim().length === 0) {
        throw new Error("Empty response body from AI gateway");
      }
      data = JSON.parse(rawText);
    } catch (jsonErr) {
      console.error("[IPA/LTA] Failed to parse AI gateway response:", jsonErr);
      return new Response(
        JSON.stringify({ error: "AI returned an invalid response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const finishReason = data.choices?.[0]?.finish_reason;
    console.log(`[IPA/LTA] Lovable AI finish reason: ${finishReason}`);
    if (finishReason === 'length') {
      console.warn('[IPA/LTA] Response was truncated due to max tokens limit');
    }
    
    let content = data.choices?.[0]?.message?.content;

    // Handle upstream provider errors wrapped in a 200 response (e.g., 502 "Network connection lost")
    const choiceError = data.choices?.[0]?.error;
    if ((!content || content.trim() === '') && choiceError) {
      const providerCode = choiceError.code || 'unknown';
      const providerMsg = choiceError.message || 'Unknown provider error';
      console.error(`[IPA/LTA] Upstream provider error (code ${providerCode}): ${providerMsg}`);
      return new Response(
        JSON.stringify({ error: `AI service temporarily unavailable (${providerMsg}). Please try again.` }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content || content.trim() === '') {
      console.error("[IPA/LTA] No content in response. Full response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "AI returned an empty response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let graphData;
    try {
      graphData = extractJsonFromResponse(content);
      
      // Inject mandatory edges as safety net (combine new + existing nodes for incremental mode)
      if (graphData.globalNodes && Array.isArray(graphData.globalNodes) && graphData.edges && Array.isArray(graphData.edges)) {
        const allNodesForInjection = [...graphData.globalNodes];
        if (existingNodes) {
          for (const en of existingNodes) {
            if (!allNodesForInjection.some((n: { id: string }) => n.id === en.id)) {
              allNodesForInjection.push(en as any);
            }
          }
        }
        graphData.edges = injectMandatoryEdges(allNodesForInjection, graphData.edges);
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

        // Transitive reduction: remove edge A->C if path A->...->C exists
        graphData.edges = transitiveReduce(graphData.edges);

        // Cycle breaking: remove back-edges to enforce true DAG
        graphData.edges = breakCycles(graphData.edges);

        // Orphan edge cleanup: remove edges referencing non-existent nodes
        if (graphData.globalNodes && Array.isArray(graphData.globalNodes)) {
          const nodeIds = new Set(graphData.globalNodes.map((n: { id: string }) => n.id));
          // Include existing nodes so injected edges between them aren't removed
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

          // Recompute levels from final edge structure
          recomputeLevels(graphData.globalNodes, graphData.edges);
        }
      }
    } catch (parseError) {
      console.error("[IPA/LTA] JSON extraction error:", parseError);

      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      if (msg.toLowerCase().includes("truncated")) {
        return new Response(JSON.stringify({ error: msg }), {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw parseError;
    }

    // Log IPA/LTA specific metrics
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
