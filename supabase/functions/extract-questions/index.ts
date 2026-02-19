import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are a question extraction assistant. Your job is to identify individual coding questions from raw, unformatted text (typically extracted from PDFs).

RULES:
1. Identify each distinct question/problem/task in the text
2. Strip metadata: course IDs, timestamps, page numbers, headers/footers, table formatting artifacts
3. Preserve the actual question content including any code snippets, examples, input/output specifications
4. Each question should be a self-contained block of text
5. If questions have structured parts (Question, Input, Output, Explanation), preserve that structure
6. If questions are just free-form text descriptions, keep them as-is
7. Remove duplicate questions (same content, different formatting)
8. Order questions as they appear in the original text

OUTPUT: Return a JSON array of strings, where each string is one complete question.
Example: ["Question 1 text here", "Question 2 text here"]

IMPORTANT: Return ONLY the JSON array, no other text.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: { text?: string; domain?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, domain } = body;

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[extract-questions] Processing ${text.length} chars of text (domain: ${domain || 'auto'})`);

    const domainHint = domain === 'web'
      ? "\nThese are web development questions (HTML, CSS, JavaScript, React, Gen AI). Questions may be free-form task descriptions rather than structured Input/Output format."
      : domain === 'python'
      ? "\nThese are Python programming questions. They may follow a structured format with Question/Input/Output/Explanation sections."
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt + domainHint },
          { role: "user", content: `Extract individual questions from this text:\n\n${text.substring(0, 50000)}` },
        ],
        max_tokens: 16000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("[extract-questions] AI error:", response.status, errText);
      throw new Error(`AI service error (${response.status})`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI returned empty response");
    }

    // Parse the JSON array from response
    let cleaned = content.trim()
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");
    if (arrayStart === -1 || arrayEnd === -1) {
      throw new Error("Could not find question array in AI response");
    }
    cleaned = cleaned.substring(arrayStart, arrayEnd + 1);

    let questions: string[];
    try {
      questions = JSON.parse(cleaned);
    } catch {
      // Try fixing trailing commas
      cleaned = cleaned.replace(/,\s*]/g, "]");
      questions = JSON.parse(cleaned);
    }

    if (!Array.isArray(questions)) {
      throw new Error("AI response is not an array");
    }

    // Filter empty entries
    questions = questions.filter(q => typeof q === 'string' && q.trim().length > 0);

    console.log(`[extract-questions] Extracted ${questions.length} questions`);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[extract-questions] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
