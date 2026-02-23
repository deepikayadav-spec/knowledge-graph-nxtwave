import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Regenerate weights edge function
 * Re-analyzes existing questions to identify up to 2 primary knowledge points
 * and populate skill_weights.
 * 
 * IMPORTANT: Uses numeric indices (1, 2, 3...) instead of UUIDs in prompts
 * to prevent the AI from fabricating IDs. Results are remapped back to real
 * UUIDs before returning.
 */

const systemPrompt = `You are a Knowledge Graph Weight Analyzer. Your task is to analyze questions and assign skill weights for mastery tracking.

=== WEIGHT ASSIGNMENT RULES ===

All skills mapped to a question get EQUAL weight: weight = 1 / number_of_skills.

For example:
- 1 skill: {"skill_a": 1.0}
- 2 skills: {"skill_a": 0.5, "skill_b": 0.5}
- 3 skills: {"skill_a": 0.333, "skill_b": 0.333, "skill_c": 0.334}

=== OUTPUT FORMAT ===

Return a JSON object where keys are the NUMERIC INDICES (1, 2, 3, etc.) matching the question numbers in the input:
{
  "1": {
    "skillWeights": {"skill_a": 0.5, "skill_b": 0.5}
  },
  "2": {
    "skillWeights": {"skill_x": 0.333, "skill_y": 0.333, "skill_z": 0.334}
  }
}

CRITICAL: Use the EXACT numeric index (1, 2, 3...) as keys. Do NOT invent or modify identifiers.
Weights MUST sum to 1.0.

Output ONLY valid JSON, no explanation.`;

interface QuestionInput {
  id: string;
  questionText: string;
  skills: string[];
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
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
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
      console.error("[regenerate-weights] Failed to parse request body:", parseErr);
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
    
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    console.log(`[regenerate-weights] Analyzing ${questions.length} questions for primary skills and weights`);

    // Build index-to-UUID mapping
    const indexToId: Record<number, string> = {};
    questions.forEach((q, i) => {
      indexToId[i + 1] = q.id;
    });

    // Build user prompt with NUMERIC INDICES only (no UUIDs exposed to AI)
    const questionsList = questions.map((q, i) => 
      `${i + 1}. Question: ${q.questionText.substring(0, 200)}${q.questionText.length > 200 ? '...' : ''}\n   Skills: [${q.skills.join(', ')}]`
    ).join('\n\n');

    const userPrompt = `Assign equal weights to all skills for each question.

${questionsList}

For each question, distribute weight equally among all skills (1/n each, summing to 1.0).

Return JSON with the NUMERIC INDEX (1, 2, 3, etc.) as keys. Do NOT use any other identifiers.`;

    const model = "deepseek/deepseek-v3.2";
    const maxTokens = Math.min(4000 + questions.length * 200, 16000);
    
    const MAX_RETRIES = 3;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
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
      console.error(`[regenerate-weights] AI error (attempt ${attempt}/${MAX_RETRIES}):`, response.status, JSON.stringify(errorData));

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Retry on 5xx errors (transient)
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        const delay = attempt * 2000;
        console.log(`[regenerate-weights] Retrying in ${delay}ms...`);
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

    const rawData = extractJsonFromResponse(content);
    
    // Remap numeric indices back to real UUIDs
    const weightData: Record<string, any> = {};
    let mapped = 0;
    let unmapped = 0;

    for (const [key, value] of Object.entries(rawData)) {
      const numericIndex = parseInt(key, 10);
      const realId = indexToId[numericIndex];
      
      if (realId) {
        weightData[realId] = value;
        mapped++;
      } else {
        console.warn(`[regenerate-weights] No mapping for key "${key}" (parsed as ${numericIndex})`);
        unmapped++;
      }
    }

    console.log(`[regenerate-weights] Remapped ${mapped} results to real UUIDs (${unmapped} unmapped keys)`);

    // Add version marker
    weightData._version = "2026-02-09-v3-numeric-index";

    return new Response(JSON.stringify(weightData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[regenerate-weights] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
