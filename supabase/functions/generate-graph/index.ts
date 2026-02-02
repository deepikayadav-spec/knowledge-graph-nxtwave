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

Construct prerequisite edges using strict necessity criteria:

1. NECESSITY TEST: Only add edge A → B if:
   - Performance on B is UNRELIABLE without A
   - A provides ESSENTIAL knowledge for B (not just helpful)

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

{
  "ipaByQuestion": {
    "Question text here": [
      {"step": 1, "type": "PERCEIVE", "operation": "Description of what is perceived"},
      {"step": 2, "type": "ENCODE", "operation": "Description of encoding"},
      {"step": 3, "type": "RETRIEVE", "operation": "Description of retrieval"},
      {"step": 4, "type": "DECIDE", "operation": "Description of decision"},
      {"step": 5, "type": "EXECUTE", "operation": "Description of execution"},
      {"step": 6, "type": "MONITOR", "operation": "Description of monitoring"}
    ]
  },
  
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
      "cme": {
        "measured": false,
        "highestConceptLevel": 0,
        "levelLabels": ["Recognition", "Recall (simple)", "Recall (complex)", "Direct application"],
        "independence": "Unknown",
        "retention": "Unknown",
        "evidenceByLevel": {}
      },
      "le": {
        "estimated": true,
        "estimatedMinutes": 15
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
      "primarySkill": "skill2"
    }
  },
  
  "courses": {
    "Default": {
      "nodes": [{"id": "skill_id", "inCourse": true}]
    }
  }
}

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

5. Edge Density: 1.5-2.5 edges per node average
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

Output ONLY valid JSON, no explanation.`;

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
    } catch (finalError) {
      console.error("Failed to parse JSON even after fixes. First 500 chars:", cleaned.substring(0, 500));
      console.error("Last 500 chars:", cleaned.substring(cleaned.length - 500));

      if (isLikelyTruncatedJson(cleaned)) {
        throw new Error(
          "AI response appears truncated (incomplete JSON). Try reducing the number of questions or splitting them into smaller batches."
        );
      }

      throw new Error(`Failed to parse AI response as JSON: ${(finalError as Error).message}`);
    }
  }
}

interface ExistingNode {
  id: string;
  name: string;
  tier?: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions, existingNodes } = await req.json() as {
      questions: string[];
      existingNodes?: ExistingNode[];
    };
    
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

    const userPrompt = `Questions to analyze using IPA/LTA methodology:
${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

=== ANALYSIS INSTRUCTIONS ===

1. For EACH question, perform IPA (trace cognitive algorithm with PERCEIVE/ENCODE/RETRIEVE/DECIDE/EXECUTE/MONITOR)
2. For EACH IPA step, perform LTA (identify declarative/procedural/conditional/strategic knowledge)
3. NORMALIZE the extracted knowledge into unified skill nodes
4. BUILD the DAG with necessity-tested prerequisite edges

=== TARGET METRICS ===

- Expected skill count: ${targetMinSkills} to ${targetMaxSkills} skills for ${questions.length} questions
- Apply the "WITHOUT X?" test for EVERY edge
- Ensure 60%+ skill reuse across questions
- Include "ipaByQuestion" showing your cognitive analysis
${isIncremental ? '- REUSE existing skill IDs when IPA/LTA maps to same capability\n- Return ONLY new skills, but include all necessary edges' : ''}

Generate the IPA/LTA knowledge graph JSON.`;

    const model = "google/gemini-2.5-pro";
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        max_tokens: 16384,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Lovable AI error:", response.status, JSON.stringify(errorData));
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to your Lovable workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "AI authentication failed. Please contact support." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: errorData.error?.message || "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    const finishReason = data.choices?.[0]?.finish_reason;
    console.log(`[IPA/LTA] Lovable AI finish reason: ${finishReason}`);
    if (finishReason === 'length') {
      console.warn('[IPA/LTA] Response was truncated due to max tokens limit');
    }
    
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[IPA/LTA] No content in response. Full response:", JSON.stringify(data));
      throw new Error("No content in AI response");
    }

    let graphData;
    try {
      graphData = extractJsonFromResponse(content);
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
