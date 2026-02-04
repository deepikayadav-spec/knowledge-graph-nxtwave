import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Regenerate weights edge function
 * Re-analyzes existing questions to identify up to 2 primary knowledge points
 * and populate skill_weights
 */

const systemPrompt = `You are a Knowledge Graph Weight Analyzer. Your task is to analyze questions and their associated skills to:
1. Identify 1-2 PRIMARY knowledge points (the main cognitive challenge)
2. Generate accurate skill weights for mastery tracking

=== WEIGHT ASSIGNMENT RULES ===

1. IDENTIFY PRIMARY SKILLS (1-2 max):
   - The skill(s) that represent the main differentiator/challenge
   - Use 2 primaries ONLY when question has TWO equally-important cognitive focuses
   - Most questions should have just 1 primary

2. ASSIGN WEIGHTS (must sum to 1.0):
   - If 1 primary: PRIMARY = 0.6, SECONDARY skills split 0.4 equally
   - If 2 primaries: Each PRIMARY = 0.3 (0.6 total), SECONDARY skills split 0.4

3. CONSIDER:
   - Which skill would a student struggle with most?
   - Which skill is being actively practiced vs passively applied?
   - Higher-level/strategic skills are usually primary

=== OUTPUT FORMAT ===

Return a JSON object where keys are question IDs and values contain:
{
  "question_id_1": {
    "primarySkills": ["skill_a"],
    "skillWeights": {"skill_a": 0.6, "skill_b": 0.2, "skill_c": 0.2}
  },
  "question_id_2": {
    "primarySkills": ["skill_x", "skill_y"],
    "skillWeights": {"skill_x": 0.3, "skill_y": 0.3, "skill_z": 0.4}
  }
}

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
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[regenerate-weights] Analyzing ${questions.length} questions for primary skills and weights`);

    // Build user prompt with questions
    const questionsList = questions.map((q, i) => 
      `${i + 1}. ID: ${q.id}\n   Question: ${q.questionText.substring(0, 200)}${q.questionText.length > 200 ? '...' : ''}\n   Skills: [${q.skills.join(', ')}]`
    ).join('\n\n');

    const userPrompt = `Analyze these questions and generate primary skills (1-2 max) and weights for each:

${questionsList}

For each question, identify:
1. Primary skill(s) - the main cognitive challenge (1-2 skills max)
2. Skill weights - how cognitive load is distributed (must sum to 1.0)

Return JSON with question IDs as keys.`;

    const model = "google/gemini-2.5-flash";
    const maxTokens = Math.min(4000 + questions.length * 200, 16000);
    
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
      console.error("Lovable AI error:", response.status, JSON.stringify(errorData));
      
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

    const weightData = extractJsonFromResponse(content);
    
    console.log(`[regenerate-weights] Generated weights for ${Object.keys(weightData).length} questions`);

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
