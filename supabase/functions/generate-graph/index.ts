import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are a Learning Knowledge-Graph Engine that analyzes coding questions to build cognitive capability graphs.

You receive a course name and a list of coding questions. You must output a valid JSON knowledge graph.

CRITICAL RULES:
- Nodes are COGNITIVE CAPABILITIES, not topics (e.g., "Checking whether a key exists" NOT "Dictionaries")
- Nodes must be teachable, assessable, and reusable
- Structure comes from IPA (mental steps to solve) + LTA (prerequisites)
- Level(node) = 0 if no prerequisites, else 1 + max(level of all prerequisites)

PROCESS:
1. For each question, identify the mental steps (IPA) needed to solve it
2. Normalize and merge identical operations across questions
3. Create concept nodes for each cognitive capability
4. Define prerequisite edges with reasons
5. Compute levels based on prerequisites
6. Assign realistic CME (Concept Mastery Evidence) and LE (Learning Effort) metrics

OUTPUT FORMAT (strict JSON only, no markdown):
{
  "globalNodes": [
    {
      "id": "snake_case_id",
      "name": "Cognitive capability name",
      "level": 0,
      "description": "Brief explanation of what this capability is",
      "cme": {
        "highestConceptLevel": 4,
        "levelLabels": ["Recognition", "Recall (simple)", "Recall (complex)", "Direct application", "Complex application", "Transfer", "Articulation"],
        "independence": "Independent",
        "retention": "Current",
        "evidenceByLevel": { "1": 100, "2": 85, "3": 70, "4": 50 }
      },
      "le": {
        "passiveTime": 10,
        "activeTime": 20,
        "weightedEngagementTime": 25,
        "persistenceSignals": { "reattemptAfterWrong": true, "returnAfterExit": false },
        "persistenceFactor": 0.25,
        "finalLE": 31.25
      }
    }
  ],
  "edges": [
    { "from": "prerequisite_node_id", "to": "dependent_node_id", "reason": "Why this prerequisite is needed" }
  ],
  "courses": {
    "Course Name": {
      "nodes": [
        { "id": "node_id", "inCourse": true }
      ]
    }
  },
  "questionPaths": {
    "Question 1 title": ["node1", "node2", "node3"]
  }
}

Independence values: "Independent", "Lightly Scaffolded", "Heavily Assisted"
Retention values: "Current", "Aging", "Expired"
Concept Levels 1-7: Recognition, Recall (simple), Recall (complex), Direct application, Complex application, Transfer, Articulation

Generate 5-15 nodes with meaningful prerequisite relationships. Output ONLY valid JSON, no explanation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseName, questions } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const userPrompt = `Course: ${courseName}

Questions:
${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

Analyze these questions and generate the knowledge graph JSON.`;

    // Use gemini-1.5-flash by default (can switch to gemini-1.5-pro or gemini-2.0-flash)
    const model = "gemini-1.5-flash";
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

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response, handling potential markdown code blocks
    let graphData;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      graphData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      throw new Error("Failed to parse AI response as JSON");
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
