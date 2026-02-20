import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Analyze Difficulty Edge Function
 * Uses AI to analyze coding questions and assign difficulty scores.
 * 
 * IMPORTANT: Uses numeric indices (1, 2, 3...) instead of UUIDs in prompts
 * to prevent the AI from fabricating IDs. Results are remapped back to real
 * UUIDs before returning.
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

=== OUTPUT FORMAT ===

Return a JSON object where keys are the NUMERIC INDICES (1, 2, 3, etc.) matching the question numbers:
{
  "1": {
    "cognitiveComplexity": 2,
    "taskStructure": 1,
    "algorithmicDemands": 2,
    "scopeIntegration": 1,
    "rawPoints": 6,
    "weightageMultiplier": 1.0
  }
}

CRITICAL: Use the EXACT numeric index (1, 2, 3...) as keys. Do NOT invent or modify identifiers.

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

function sanitizeQuestionText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyTruncatedJson(text: string): boolean {
  const openCurly = (text.match(/\{/g) || []).length;
  const closeCurly = (text.match(/\}/g) || []).length;
  const openSquare = (text.match(/\[/g) || []).length;
  const closeSquare = (text.match(/\]/g) || []).length;
  return openCurly !== closeCurly || openSquare !== closeSquare;
}

function attemptJsonRepair(text: string): any | null {
  let repaired = text.trim();
  let openCurly = 0;
  let openSquare = 0;
  let lastValidPos = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (char === '\\') { escapeNext = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (char === '{') openCurly++;
    else if (char === '}') {
      openCurly--;
      if (openCurly >= 0 && openSquare >= 0) lastValidPos = i + 1;
    } else if (char === '[') openSquare++;
    else if (char === ']') {
      openSquare--;
      if (openCurly >= 0 && openSquare >= 0) lastValidPos = i + 1;
    }
  }

  if (lastValidPos > 0 && lastValidPos < repaired.length) {
    repaired = repaired.substring(0, lastValidPos);
  }

  openCurly = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
  openSquare = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;

  while (openSquare > 0) { repaired += ']'; openSquare--; }
  while (openCurly > 0) { repaired += '}'; openCurly--; }

  repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  try { return JSON.parse(repaired); } catch { return null; }
}

function getDefaultDifficultyResult(): DifficultyResult {
  return {
    cognitiveComplexity: 2,
    taskStructure: 1,
    algorithmicDemands: 1,
    scopeIntegration: 1,
    rawPoints: 5,
    weightageMultiplier: 1.0,
  };
}

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

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.log("[analyze-difficulty] First parse failed, attempting cleanup...");
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");

    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      console.error("[analyze-difficulty] Parse failed. First 500 chars:", cleaned.substring(0, 500));
      console.error("[analyze-difficulty] Last 500 chars:", cleaned.substring(Math.max(0, cleaned.length - 500)));

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

function validateAndNormalize(result: any): DifficultyResult {
  if (!result || typeof result !== 'object') {
    return getDefaultDifficultyResult();
  }
  
  const cognitiveComplexity = Math.min(4, Math.max(1, Math.round(result.cognitiveComplexity || 1)));
  const taskStructure = Math.min(3, Math.max(1, Math.round(result.taskStructure || 1)));
  const algorithmicDemands = Math.min(3, Math.max(1, Math.round(result.algorithmicDemands || 1)));
  const scopeIntegration = Math.min(3, Math.max(1, Math.round(result.scopeIntegration || 1)));
  
  const rawPoints = cognitiveComplexity + taskStructure + algorithmicDemands + scopeIntegration;
  const weightageMultiplier = calculateMultiplier(rawPoints);
  
  return { cognitiveComplexity, taskStructure, algorithmicDemands, scopeIntegration, rawPoints, weightageMultiplier };
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
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log(`[analyze-difficulty] Analyzing ${questions.length} questions for difficulty`);

    // Build index-to-UUID mapping
    const indexToId: Record<number, string> = {};
    questions.forEach((q, i) => {
      indexToId[i + 1] = q.id;
    });

    // Sanitize and build prompt with NUMERIC INDICES only (no UUIDs)
    const sanitizedQuestions = questions.map(q => ({
      questionText: sanitizeQuestionText(q.questionText),
    }));

    const questionsList = sanitizedQuestions.map((q, i) => 
      `${i + 1}. Question: ${q.questionText.substring(0, 500)}${q.questionText.length > 500 ? '...' : ''}`
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

Return JSON with the NUMERIC INDEX (1, 2, 3, etc.) as keys. Do NOT use any other identifiers.`;

    const model = "gemini-2.5-flash";
    const maxTokens = Math.min(4000 + questions.length * 150, 16000);
    
    const MAX_RETRIES = 3;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GEMINI_API_KEY}`,
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

      if (response.ok) break;

      const errorData = await response.json().catch(() => ({}));
      console.error(`[analyze-difficulty] AI error (attempt ${attempt}/${MAX_RETRIES}):`, response.status, JSON.stringify(errorData));

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Retry on 5xx errors (transient)
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        const delay = attempt * 2000; // 2s, 4s
        console.log(`[analyze-difficulty] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return new Response(JSON.stringify({ error: errorData.error?.message || "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response || !response.ok) {
      return new Response(JSON.stringify({ error: "AI processing failed after retries" }), {
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
      console.error("[analyze-difficulty] Complete parse failure, using defaults for all questions:", parseError);
      rawResults = {};
      usedFallbacks = questions.length;
    }
    
    // Remap numeric indices back to real UUIDs and validate/normalize
    const normalizedResults: Record<string, DifficultyResult> = {};
    let mapped = 0;

    for (let i = 0; i < questions.length; i++) {
      const numericKey = String(i + 1);
      const realId = questions[i].id;
      const rawResult = rawResults[numericKey];
      
      if (!rawResult) {
        console.warn(`[analyze-difficulty] No result for index ${numericKey} (question ${realId}), using default`);
        usedFallbacks++;
      }
      
      normalizedResults[realId] = validateAndNormalize(rawResult);
      mapped++;
    }
    
    console.log(`[analyze-difficulty] Remapped ${mapped} results to real UUIDs (${usedFallbacks} used fallback defaults)`);

    // Add version marker
    normalizedResults._version = "2026-02-09-v3-numeric-index" as any;

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
