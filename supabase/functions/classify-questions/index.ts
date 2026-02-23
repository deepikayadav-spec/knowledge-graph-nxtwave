import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEB_TOPICS = [
  "Introduction to HTML",
  "HTML Elements",
  "HTML Forms and Tables",
  "HTML Attributes and General",
  "Introduction To CSS And CSS Selectors",
  "CSS Properties",
  "CSS Display And Position",
  "CSS Layouts And Box Model",
  "CSS Selectors",
  "CSS Flexbox",
  "CSS Grid",
  "CSS Media Queries",
  "CSS General",
  "Introduction to JavaScript",
  "DOM And Events",
  "Schedulers & Callback Functions",
  "Storage Mechanisms",
  "Network & HTTP Requests",
  "Asynchronous JS and Error Handling",
  "JS General",
  "Variables",
  "Data Types",
  "Operators",
  "Conditional Statements",
  "Functions",
  "Loops",
  "Recursion",
  "Introduction to React",
  "React Components & Props",
  "useState Hook",
  "useEffect Hook",
  "More React Hooks",
  "React Router",
  "Authentication & Authorisation",
  "React Lists & Forms",
  "React General",
];

const PYTHON_TOPICS = [
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
  "Intro to Matrices & Shorthand Expressions",
  "Dictionaries",
  "Introduction to Object Oriented Programming",
  "Abstraction and Polymorphism",
  "Miscellaneous Topics",
  "Problem Solving",
];

function getTopicsForDomain(domain: string): string[] {
  return domain === 'web' ? WEB_TOPICS : PYTHON_TOPICS;
}

async function classifyChunk(
  questions: { index: number; summary: string }[],
  topics: string[],
  apiKey: string
): Promise<Record<number, string>> {
  const topicList = topics.map((t, i) => `${i + 1}. ${t}`).join('\n');
  
  const questionList = questions
    .map((q, i) => `[${i}] ${q.summary}`)
    .join('\n');

  const prompt = `Classify each question below into exactly ONE of these curriculum topics.

TOPICS:
${topicList}

QUESTIONS:
${questionList}

Return a JSON array where each element is: {"idx": <question array index 0-based>, "topic": "<exact topic name from list>"}

Rules:
- Use the EXACT topic name from the list above
- Every question must be classified
- Pick the BEST matching topic based on what skills the question tests
- Return ONLY the JSON array, no other text`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-v3.2",
      messages: [
        { role: "system", content: "You are a curriculum classifier. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Classification API error:", response.status, text);
    throw new Error(`Classification failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  // Extract JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("No JSON array found in classification response:", content);
    throw new Error("Classification returned invalid format");
  }

  const classifications = JSON.parse(jsonMatch[0]) as Array<{ idx: number; topic: string }>;
  
  const result: Record<number, string> = {};
  for (const c of classifications) {
    const originalIndex = questions[c.idx]?.index;
    if (originalIndex !== undefined) {
      // Validate topic name exists
      const validTopic = topics.find(t => t === c.topic);
      result[originalIndex] = validTopic || topics[0];
    }
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions, domain = "python" } = await req.json();
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "questions array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const topics = getTopicsForDomain(domain);
    
    // Create summaries (first 200 chars of each question)
    const summaries = questions.map((q: string, i: number) => ({
      index: i,
      summary: q.substring(0, 200).replace(/\n/g, ' '),
    }));

    // Process in chunks of 30
    const CHUNK_SIZE = 30;
    const topicMap: Record<number, string> = {};
    
    for (let i = 0; i < summaries.length; i += CHUNK_SIZE) {
      const chunk = summaries.slice(i, i + CHUNK_SIZE);
      
      let retries = 0;
      while (retries < 3) {
        try {
          const chunkResult = await classifyChunk(chunk, topics, apiKey);
          Object.assign(topicMap, chunkResult);
          break;
        } catch (err) {
          retries++;
          if (retries >= 3) {
            // Fallback: assign "General" for failed chunks
            console.error(`Classification chunk ${i} failed after 3 retries:`, err);
            for (const item of chunk) {
              if (!(item.index in topicMap)) {
                topicMap[item.index] = "General";
              }
            }
          } else {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }
    }

    // Ensure every question has a topic
    for (let i = 0; i < questions.length; i++) {
      if (!(i in topicMap)) {
        topicMap[i] = "General";
      }
    }

    return new Response(
      JSON.stringify({ topicMap }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("classify-questions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Classification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
