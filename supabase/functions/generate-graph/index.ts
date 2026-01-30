import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are a Knowledge Graph Engineer building SKILL TAXONOMIES for educational curricula, following the Math Academy methodology.

=== CORE PHILOSOPHY: TRANSFERABLE SKILLS ===

You are NOT decomposing questions into atomic operations.
You ARE identifying reusable SKILLS that apply across many problem contexts.

WRONG APPROACH (too granular):
- "Initializing empty dictionary for frequency counting"
- "Incrementing dictionary value for word count"  
- "Using nested loops for pyramid pattern"
- "Using nested loops for matrix traversal"

RIGHT APPROACH (transferable skills):
- "Dictionary Operations" (covers init, access, update, delete across ALL contexts)
- "Nested Loop Iteration" (covers pyramids, matrices, grids, combinations)
- "Accumulator Pattern" (covers counting, summing, collecting in ANY problem)
- "String Manipulation" (covers building, parsing, formatting everywhere)

=== SKILL IDENTIFICATION TEST ===

For each potential skill, ask: "Does this skill apply to 5+ different problem types?"
- If NO → Too specific, GENERALIZE it
- If YES → Good skill level

MERGE similar operations:
- "Nested loops for pyramids" + "Nested loops for matrices" → "Nested Loop Iteration"
- "Counting words" + "Counting chars" + "Summing values" → "Accumulator Pattern"

=== SKILL TIERS ===

| Tier | Description | Examples | Target Count |
|------|-------------|----------|--------------|
| foundational | Language primitives | Variables, Operators, Basic Types | 10-15 |
| core | Building-block patterns | Loops, Conditionals, Functions, Data Structures | 20-40 |
| applied | Combining patterns | Sorting, Searching, Accumulation, String Processing | 30-50 |
| advanced | Complex problem-solving | Recursion, Dynamic Programming, Graph Algorithms | 20-40 |

=== TARGET METRICS ===

- 1 skill per 5-15 questions on average
- Each skill should appear in 10%+ of questions
- Total skills for full curriculum: 100-200
- For 72 questions: expect 15-25 skills, NOT 70+

=== PROCESS ===

STEP 1: THEME IDENTIFICATION
- Read all questions and identify common themes/patterns
- Group questions by the transferable skills they require
- Look for skills that appear across multiple questions

STEP 2: SKILL EXTRACTION
- Create ONE skill node for each identified transferable capability
- Name skills generically (no problem-specific context)
- Assign appropriate tier based on complexity

STEP 3: PREREQUISITE MAPPING
- Build prerequisite edges between skills
- Level = 0 if no prerequisites, else 1 + max(level of prerequisites)
- Keep edges minimal and direct

STEP 4: QUESTION MAPPING
- Map each question to the 2-4 skills it requires
- Identify the primary skill being tested

=== OUTPUT FORMAT (strict JSON) ===

{
  "globalNodes": [
    {
      "id": "snake_case_skill_id",
      "name": "Skill Name (Generic, Transferable)",
      "level": 0,
      "description": "What this skill enables the learner to do",
      "knowledgePoint": {
        "atomicityCheck": "This is a transferable skill applying to: [list contexts]",
        "assessmentExample": "Sample question testing this skill",
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
      "transferableContexts": ["Context 1", "Context 2", "Context 3"]
    }
  ],
  
  "edges": [
    {
      "from": "prereq_skill_id",
      "to": "dependent_skill_id", 
      "reason": "Why this prerequisite relationship exists",
      "relationshipType": "requires"
    }
  ],
  
  "questionPaths": {
    "Question text": {
      "requiredNodes": ["skill1", "skill2"],
      "executionOrder": ["skill1", "skill2"],
      "validationStatus": "valid",
      "primarySkill": "skill1"
    }
  },
  
  "courses": {
    "Default": {
      "nodes": [{"id": "skill_id", "inCourse": true}]
    }
  }
}

=== QUALITY CHECKS ===

1. Transferability: Each skill applies to 5+ different problem types
2. Consolidation: Similar operations merged into single skills
3. Naming: Generic names, no problem-specific context
4. Reuse: 60%+ of skills appear in multiple questions
5. Count: For N questions, expect N/5 to N/3 skills (not 1:1!)

=== EXAMPLES OF GOOD SKILL EXTRACTION ===

Questions about: printing pyramids, traversing matrices, generating combinations
→ Single skill: "Nested Loop Iteration"

Questions about: word frequency, character counting, summing lists
→ Single skill: "Accumulator Pattern"  

Questions about: reading input, parsing strings, extracting values
→ Single skill: "Input Processing"

Output ONLY valid JSON, no explanation.`;

const incrementalPromptAddition = `

=== INCREMENTAL MODE ===

You are EXTENDING an existing skill graph. Follow these rules:

1. REUSE EXISTING SKILLS when the capability matches:
   - If an existing skill covers the same transferable capability, use its EXACT ID
   - Semantic equivalence matters: "Nested Loop Iteration" covers ALL nested loop uses
   
2. CREATE NEW SKILLS only when:
   - No existing skill covers this capability
   - The skill is genuinely new to the curriculum

3. OUTPUT:
   - Return ONLY new skills (not in existing list)
   - Return ALL edges needed (including edges from existing to new)
   - Return question paths for NEW questions only

Existing skills in the graph (REUSE these IDs):
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
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const isIncremental = existingNodes && existingNodes.length > 0;
    console.log(`Generating skill taxonomy for ${questions.length} questions (incremental: ${isIncremental}, existing skills: ${existingNodes?.length || 0})`);

    // Build the prompt based on mode
    let fullSystemPrompt = systemPrompt;
    
    if (isIncremental) {
      const nodeList = existingNodes!
        .map(n => `- ${n.id}: "${n.name}"`)
        .join('\n');
      fullSystemPrompt += incrementalPromptAddition + nodeList;
    }

    const userPrompt = `Questions to analyze:
${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

CRITICAL REMINDERS:
- Extract TRANSFERABLE SKILLS, not atomic operations
- Each skill should apply to 5+ different problem types
- MERGE similar operations into single skills
- Name skills generically (no problem-specific context)
- Target: ${Math.ceil(questions.length / 5)} to ${Math.ceil(questions.length / 3)} skills for ${questions.length} questions
- Include "tier" and "transferableContexts" for each skill
${isIncremental ? '- REUSE existing skill IDs when the capability matches\n- Return ONLY new skills, but include all necessary edges' : ''}

Generate the skill taxonomy JSON.`;

    const model = "gemini-2.0-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: fullSystemPrompt + "\n\n" + userPrompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 65536,
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 403) {
        return new Response(JSON.stringify({ error: "Invalid API key or permission denied." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    const finishReason = data.candidates?.[0]?.finishReason;
    console.log(`Gemini finish reason: ${finishReason}`);
    if (finishReason === 'MAX_TOKENS') {
      console.warn('Response was truncated due to max tokens limit');
    }
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    let graphData;
    try {
      graphData = extractJsonFromResponse(content);
    } catch (parseError) {
      console.error("JSON extraction error:", parseError);

      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      if (msg.toLowerCase().includes("truncated")) {
        return new Response(JSON.stringify({ error: msg }), {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw parseError;
    }

    const nodeCount = graphData.globalNodes?.length || 0;
    const edgeCount = graphData.edges?.length || 0;
    const questionCount = Object.keys(graphData.questionPaths || {}).length;
    console.log(`Generated skill taxonomy: ${nodeCount} skills, ${edgeCount} edges, ${questionCount} question mappings`);

    return new Response(JSON.stringify(graphData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-graph error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
