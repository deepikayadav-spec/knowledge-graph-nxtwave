import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Analyze Difficulty Edge Function
 * Uses AI to analyze coding questions and assign difficulty scores based on a rubric.
 * 
 * Rubric Dimensions:
 * - Cognitive Complexity (1-4): Bloom's taxonomy level
 * - Task Structure (1-3): Problem definition clarity
 * - Algorithmic Demands (1-3): Efficiency requirements
 * - Scope & Integration (1-3): Concept integration level
 * 
 * Multiplier Mapping:
 * - 4-6 points: 1.0x (Basic/Novice)
 * - 7-9 points: 1.5x (Intermediate)
 * - 10-11 points: 2.0x (Advanced)
 * - 12-13 points: 3.0x (Expert)
 */

const systemPrompt = `You are a Coding Question Difficulty Analyzer. Your task is to analyze coding questions and assign difficulty scores based on a standardized rubric.

=== RUBRIC DIMENSIONS ===

**1. COGNITIVE COMPLEXITY (1-4 points)**
Based on Bloom's Revised Taxonomy:
- 1 = Remember/Understand: Recall facts, explain concepts, match patterns
- 2 = Apply: Use procedures, solve routine problems with known algorithms
- 3 = Analyze: Break down problems, compare approaches, identify patterns
- 4 = Evaluate/Create: Design solutions, optimize, synthesize multiple concepts

**2. TASK STRUCTURE (1-3 points)**
How well-defined is the problem:
- 1 = Well-defined: Clear inputs/outputs, single correct approach
- 2 = Partially defined: Multiple valid approaches, some ambiguity
- 3 = Ill-defined: Open-ended, requires problem decomposition, design decisions

**3. ALGORITHMIC DEMANDS (1-3 points)**
Performance/efficiency requirements:
- 1 = Any correct solution: Brute force acceptable
- 2 = Efficient solution: Must optimize time/space, avoid naive approaches
- 3 = Optimal solution: Specific complexity required, advanced algorithms needed

**4. SCOPE & INTEGRATION (1-3 points)**
How many concepts are integrated:
- 1 = Single concept: One core skill being tested
- 2 = Multiple concepts: 2-3 skills must work together
- 3 = System-level: Full application thinking, many moving parts

=== SCORING ===

Calculate total points (4-13) and map to multiplier:
- 4-6 points → 1.0x (Basic/Novice)
- 7-9 points → 1.5x (Intermediate)
- 10-11 points → 2.0x (Advanced)
- 12-13 points → 3.0x (Expert)

=== EXAMPLES ===

Q: "Write a function to check if a number is even"
- Cognitive: 1 (Remember: simple modulo)
- Structure: 1 (Well-defined)
- Algorithmic: 1 (Any solution)
- Scope: 1 (Single concept)
- Total: 4 → 1.0x Basic

Q: "Implement a LRU cache with O(1) get/put operations"
- Cognitive: 4 (Create: design data structure)
- Structure: 2 (Partially defined: design choices)
- Algorithmic: 3 (Optimal: specific complexity)
- Scope: 3 (System: multiple data structures)
- Total: 12 → 3.0x Expert

=== OUTPUT FORMAT ===

Return a JSON object where keys are question IDs:
{
  "question_id_1": {
    "cognitiveComplexity": 2,
    "taskStructure": 1,
    "algorithmicDemands": 2,
    "scopeIntegration": 1,
    "rawPoints": 6,
    "weightageMultiplier": 1.0
  }
}

Output ONLY valid JSON, no explanation.`;

interface QuestionInput {
  id: string;
  questionText: string;
}

interface DifficultyResult {
  cognitiveComplexity: number;
  taskStructure: number;
  algorithmicDemands: number;
  scopeIntegration: number;
  rawPoints: number;
  weightageMultiplier: number;
}

function calculateMultiplier(rawPoints: number): number {
  if (rawPoints <= 6) return 1.0;
  if (rawPoints <= 9) return 1.5;
  if (rawPoints <= 11) return 2.0;
  return 3.0;
}

// ============= ROBUST JSON PARSING UTILITIES =============

/**
 * Sanitize question text to prevent JSON corruption
 */
function sanitizeQuestionText(text: string): string {
  return text
    // Remove control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect if JSON is likely truncated (unbalanced brackets)
 */
function isLikelyTruncatedJson(text: string): boolean {
  const openCurly = (text.match(/\{/g) || []).length;
  const closeCurly = (text.match(/\}/g) || []).length;
  const openSquare = (text.match(/\[/g) || []).length;
  const closeSquare = (text.match(/\]/g) || []).length;
  return openCurly !== closeCurly || openSquare !== closeSquare;
}

/**
 * Attempt to repair truncated JSON by finding last valid position and closing brackets
 */
function attemptJsonRepair(text: string): any | null {
  let repaired = text.trim();
  let openCurly = 0;
  let openSquare = 0;
  let lastValidPos = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      openCurly++;
    } else if (char === '}') {
      openCurly--;
      if (openCurly >= 0 && openSquare >= 0) {
        lastValidPos = i + 1;
      }
    } else if (char === '[') {
      openSquare++;
    } else if (char === ']') {
      openSquare--;
      if (openCurly >= 0 && openSquare >= 0) {
        lastValidPos = i + 1;
      }
    }
  }

  // If we found a valid position before the end, truncate there
  if (lastValidPos > 0 && lastValidPos < repaired.length) {
    repaired = repaired.substring(0, lastValidPos);
  }

  // Recount brackets after potential truncation
  openCurly = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
  openSquare = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;

  // Close any remaining open brackets
  while (openSquare > 0) {
    repaired += ']';
    openSquare--;
  }
  while (openCurly > 0) {
    repaired += '}';
    openCurly--;
  }

  // Clean up trailing commas
  repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

/**
 * Get default difficulty result for questions that fail to parse
 */
function getDefaultDifficultyResult(): DifficultyResult {
  return {
    cognitiveComplexity: 2,  // Apply level
    taskStructure: 1,        // Well-defined
    algorithmicDemands: 1,   // Any solution
    scopeIntegration: 1,     // Single concept
    rawPoints: 5,
    weightageMultiplier: 1.0, // Basic default
  };
}

/**
 * Extract and parse JSON from AI response with multiple fallback strategies
 */
function extractJsonFromResponse(response: string): any {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in response");
  }
  
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  cleaned = cleaned
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\t+/g, " ")
    .trim();

  // First attempt: direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.log("[analyze-difficulty] First parse failed, attempting cleanup...");
    
    // Second attempt: cleanup trailing commas and control chars
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");

    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      // Debug logging for troubleshooting
      console.error("[analyze-difficulty] Parse failed. First 500 chars:", 
        cleaned.substring(0, 500));
      console.error("[analyze-difficulty] Last 500 chars:", 
        cleaned.substring(Math.max(0, cleaned.length - 500)));

      // Third attempt: repair truncated JSON
      if (isLikelyTruncatedJson(cleaned)) {
        console.log("[analyze-difficulty] Detected truncated JSON, attempting repair...");
        const repaired = attemptJsonRepair(cleaned);
        if (repaired) {
          console.log("[analyze-difficulty] JSON repair successful");
          return repaired;
        }
        throw new Error("AI response truncated - try smaller batch size");
      }

      throw new Error(`JSON parse failed: ${(secondError as Error).message}`);
    }
  }
}

function validateAndNormalize(result: any, questionId: string): DifficultyResult {
  // If result is invalid or missing, return default
  if (!result || typeof result !== 'object') {
    console.warn(`[analyze-difficulty] Invalid result for ${questionId}, using default`);
    return getDefaultDifficultyResult();
  }
  
  // Ensure values are within valid ranges
  const cognitiveComplexity = Math.min(4, Math.max(1, Math.round(result.cognitiveComplexity || 1)));
  const taskStructure = Math.min(3, Math.max(1, Math.round(result.taskStructure || 1)));
  const algorithmicDemands = Math.min(3, Math.max(1, Math.round(result.algorithmicDemands || 1)));
  const scopeIntegration = Math.min(3, Math.max(1, Math.round(result.scopeIntegration || 1)));
  
  const rawPoints = cognitiveComplexity + taskStructure + algorithmicDemands + scopeIntegration;
  const weightageMultiplier = calculateMultiplier(rawPoints);
  
  return {
    cognitiveComplexity,
    taskStructure,
    algorithmicDemands,
    scopeIntegration,
    rawPoints,
    weightageMultiplier,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: { questions?: QuestionInput[] };
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
      console.error("[analyze-difficulty] Failed to parse request body:", parseErr);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { questions } = body;
    
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

    console.log(`[analyze-difficulty] Analyzing ${questions.length} questions for difficulty`);

    // Sanitize question text before sending to AI
    const sanitizedQuestions = questions.map(q => ({
      id: q.id,
      questionText: sanitizeQuestionText(q.questionText),
    }));

    // Build user prompt with sanitized questions
    const questionsList = sanitizedQuestions.map((q, i) => 
      `${i + 1}. ID: ${q.id}\n   Question: ${q.questionText.substring(0, 500)}${q.questionText.length > 500 ? '...' : ''}`
    ).join('\n\n');

    const userPrompt = `Analyze these coding questions and score each on the 4 rubric dimensions:

${questionsList}

For each question:
1. Score Cognitive Complexity (1-4)
2. Score Task Structure (1-3)
3. Score Algorithmic Demands (1-3)
4. Score Scope & Integration (1-3)
5. Calculate total rawPoints
6. Map to weightageMultiplier (4-6→1.0, 7-9→1.5, 10-11→2.0, 12-13→3.0)

Return JSON with question IDs as keys.`;

    const model = "google/gemini-2.5-flash";
    const maxTokens = Math.min(4000 + questions.length * 150, 16000);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[analyze-difficulty] AI error:", response.status, JSON.stringify(errorData));
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: errorData.error?.message || "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    let rawResults: Record<string, any>;
    let usedFallbacks = 0;
    
    try {
      rawResults = extractJsonFromResponse(content);
    } catch (parseError) {
      // If complete parsing fails, return defaults for all questions
      console.error("[analyze-difficulty] Complete parse failure, using defaults for all questions:", parseError);
      rawResults = {};
      for (const q of questions) {
        rawResults[q.id] = null; // Will trigger default in validateAndNormalize
      }
      usedFallbacks = questions.length;
    }
    
    // Validate and normalize all results, filling in missing questions with defaults
    const normalizedResults: Record<string, DifficultyResult> = {};
    for (const q of questions) {
      const result = rawResults[q.id];
      if (!result) {
        console.warn(`[analyze-difficulty] No result for question ${q.id}, using default`);
        usedFallbacks++;
      }
      normalizedResults[q.id] = validateAndNormalize(result, q.id);
    }
    
    console.log(`[analyze-difficulty] Generated difficulty scores for ${Object.keys(normalizedResults).length} questions (${usedFallbacks} used fallback defaults)`);

    return new Response(JSON.stringify(normalizedResults), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[analyze-difficulty] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
