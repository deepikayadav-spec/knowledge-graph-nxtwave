import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are a Knowledge Graph Engineer that analyzes coding questions to build cognitive capability graphs following the Math Academy methodology.

=== CRITICAL PRINCIPLES ===

1. ATOMIC KNOWLEDGE POINTS
   Each node must represent ONE cognitive operation that can be:
   - Taught in isolation (with prerequisites)
   - Assessed with a single question
   - Described in one sentence starting with a verb

   WRONG: "Working with dictionaries" (topic, not skill)
   WRONG: "Counting word frequencies" (composite operation)
   RIGHT: "Initializing an empty dictionary"
   RIGHT: "Checking if a key exists in a dictionary"
   RIGHT: "Incrementing a numeric value at a key"

2. GRANULARITY TEST
   For each proposed node, ask: "Can I split this further?"
   If yes, split it. If you reach operations like "using the + operator",
   you've gone too fine - those are language primitives, not teachable skills.

   TOO COARSE (BAD):
   - "Dictionary operations" - Topic, not skill
   - "Counting frequencies" - Composite of 5+ skills
   - "Data manipulation" - Vague category

   JUST RIGHT (GOOD):
   - "Initializing an empty dictionary" - One action
   - "Checking if key exists in dictionary" - One decision
   - "Appending to a list value in a dictionary" - One operation
   - "Retrieving value with default fallback" - One operation

   TOO FINE (BAD):
   - "Using the [] operator" - Language primitive
   - "Typing a variable name" - Too mechanical
   - "Understanding what = means" - Too basic

3. PREREQUISITE PRECISION
   A prerequisite edge means: "You CANNOT learn B without knowing A"
   NOT: "A is related to B" or "A is commonly used with B"
   
   Prerequisite Criteria:
   - NECESSARY: Cannot learn B without knowing A
   - DIRECT: A is immediately used in B, not transitively
   - MINIMAL: Don't include A if A's prerequisites also cover it

=== PROCESS (Follow these 4 steps) ===

STEP 1: IPA (Information Processing Analysis)
For each question, list every cognitive step in execution order:
- What must be RECOGNIZED? (patterns, problem types)
- What must be RECALLED? (syntax, methods, concepts)
- What must be APPLIED? (combining knowledge to write code)
- What DECISIONS are made? (conditionals, edge cases)

STEP 2: NORMALIZE
- Group identical operations across questions
- Create ONE knowledge point for each unique operation
- Verify atomicity: can this be split further? If yes, split it.

STEP 3: BUILD PREREQUISITES
- For each knowledge point, list what must be known BEFORE
- Include ONLY direct prerequisites (not transitive)
- Write specific reasons for each edge
- Level(node) = 0 if no prerequisites, else 1 + max(level of all prerequisites)

STEP 4: VALIDATE
- Trace each question through its knowledge points
- Verify prerequisites are satisfied in order
- Flag any missing nodes or broken paths

=== DECOMPOSITION EXAMPLE ===

Original: "Counting word frequencies in text"

Decomposed into atomic nodes:
1. "Recognizing frequency-counting pattern" (RECOGNIZE)
2. "Splitting string into word list" (APPLY)
3. "Initializing empty frequency dictionary" (APPLY)
4. "Iterating through a list" (APPLY - reused)
5. "Checking key existence in dictionary" (APPLY - reused)
6. "Incrementing numeric value at key" (APPLY)
7. "Inserting new key with initial value" (APPLY)

Nodes 4, 5, 6, 7 are REUSABLE across many questions.

=== OUTPUT FORMAT (strict JSON only, no markdown) ===

{
  "ipaByQuestion": {
    "Question text": [
      {"step": 1, "type": "RECOGNIZE", "operation": "Need to track frequencies"},
      {"step": 2, "type": "RECALL", "operation": "Dictionary is appropriate for key-value mapping"}
    ]
  },
  
  "globalNodes": [
    {
      "id": "snake_case_id",
      "name": "Verb-phrase describing the cognitive operation",
      "level": 0,
      "description": "One sentence explanation",
      "knowledgePoint": {
        "atomicityCheck": "Why this cannot be split further",
        "assessmentExample": "Sample question testing ONLY this skill",
        "targetAssessmentLevel": 3,
        "appearsInQuestions": ["Question 1", "Question 3"]
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
      }
    }
  ],
  
  "edges": [
    {
      "from": "prereq_id",
      "to": "dependent_id",
      "reason": "Specific reason why from must come before to",
      "relationshipType": "requires"
    }
  ],
  
  "questionPaths": {
    "Question text": {
      "requiredNodes": ["node1", "node2"],
      "executionOrder": ["node1", "node2"],
      "validationStatus": "valid"
    }
  },
  
  "courses": {
    "Course Name": {
      "nodes": [
        {"id": "node_id", "inCourse": true}
      ]
    }
  }
}

=== QUALITY CHECKS (Perform before output) ===

1. Atomicity: For each node, verify it can't be split further
2. Assessment: Verify the assessment example tests ONLY that skill
3. Prerequisites: Verify no circular dependencies
4. Path: Verify each question's path follows valid prerequisite order
5. Coverage: Verify all IPA steps map to nodes
6. Reuse: Aim for 60%+ node reuse across questions

Target: 5-8 atomic nodes per question, with high reuse across questions.

relationshipType values: "requires" | "builds_on" | "extends"
targetAssessmentLevel: 1-4 (1=Recognition, 2=Recall simple, 3=Recall complex, 4=Direct application)

Output ONLY valid JSON, no explanation.`;

// Maximum questions to process at once to avoid truncated responses
const MAX_QUESTIONS = 15;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseName, questions: rawQuestions } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Limit questions to prevent response truncation
    const questions = rawQuestions.slice(0, MAX_QUESTIONS);
    const wasLimited = rawQuestions.length > MAX_QUESTIONS;
    
    console.log(`Generating graph for course: ${courseName} with ${questions.length} questions${wasLimited ? ` (limited from ${rawQuestions.length})` : ''}`);

    const userPrompt = `Course: ${courseName}

Questions to analyze:
${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

IMPORTANT CONSTRAINTS:
- Keep output concise - aim for 15-25 total nodes maximum
- Each node = ONE atomic cognitive operation
- Apply the granularity test: "Can I split this further?"
- IPA first, then normalize, then prerequisites, then validate
- Target 3-5 nodes per question with HIGH REUSE across questions
- CME.measured = false and LE.estimated = true (no student data yet)
- For ipaByQuestion, include only 3-5 key steps per question (not every micro-step)

Generate the knowledge graph JSON following all steps.`;

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
              parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192, // Limit output to prevent truncation
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const finishReason = data.candidates?.[0]?.finishReason;

    if (!content) {
      console.error("No content in AI response. Full response:", JSON.stringify(data));
      throw new Error("No content in AI response");
    }

    // Check if response was truncated
    if (finishReason === "MAX_TOKENS") {
      console.warn("Response was truncated due to max tokens limit");
    }

    // Parse the JSON from the response
    let graphData;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      graphData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Content length:", content.length);
      console.error("Content preview (first 500 chars):", content.substring(0, 500));
      console.error("Content end (last 200 chars):", content.substring(content.length - 200));
      
      // Check if it looks like truncated JSON
      if (content.length > 5000 && !content.trim().endsWith('}')) {
        throw new Error("AI response was truncated. Please try with fewer questions (max 15 recommended).");
      }
      throw new Error("Failed to parse AI response as JSON. The response may be malformed.");
    }

    // Log analysis stats
    const nodeCount = graphData.globalNodes?.length || 0;
    const edgeCount = graphData.edges?.length || 0;
    const questionCount = Object.keys(graphData.questionPaths || {}).length;
    console.log(`Generated: ${nodeCount} nodes, ${edgeCount} edges, ${questionCount} question paths`);

    // Add warning if questions were limited
    if (wasLimited) {
      graphData._warning = `Only first ${MAX_QUESTIONS} questions were processed. Original count: ${rawQuestions.length}`;
    }

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
