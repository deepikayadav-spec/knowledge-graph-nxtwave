import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Exact same logic as src/lib/question/extractCore.ts */
function extractCoreQuestion(fullBlock: string): string {
  let cleaned = fullBlock.replace(/<br\s*\/?>/gi, "\n");
  cleaned = cleaned.replace(/<[^>]+>/gi, " ");
  cleaned = cleaned.replace(/&nbsp;/gi, " ");
  cleaned = cleaned.replace(/&amp;/gi, "&");
  cleaned = cleaned.replace(/&lt;/gi, "<");
  cleaned = cleaned.replace(/&gt;/gi, ">");
  cleaned = cleaned.replace(/&quot;/gi, '"');
  cleaned = cleaned.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

  const contentLines: string[] = [];

  for (let line of lines) {
    line = line.replace(/^\d+\.\s+/, "");
    line = line.replace(/^#+\s+/, "");
    // Strip markdown bold **text**
    line = line.replace(/\*\*(.+?)\*\*/g, "$1");
    // Strip inline code backticks
    line = line.replace(/`([^`]+)`/g, "$1");
    if (/^```/.test(line)) continue;
    // Skip horizontal rules
    if (/^[-=*]{3,}$/.test(line)) continue;
    line = line.replace(/\s{2,}/g, " ");
    if (/^Topic\s*:\s*/i.test(line)) continue;
    if (/^Question\s*:?\s*$/i.test(line)) continue;
    const inlineMatch = line.match(/^Question\s*:\s*(.+)/i);
    if (inlineMatch) {
      contentLines.push(inlineMatch[1]);
      continue;
    }
    // Stop at section headers (expanded, prefix-based match)
    if (
      /^(Input|Output|Explanation|Test Cases|Resources|Sample Input|Sample Output|Expected Output|Input Format|Output Format|Constraints|Example|Note|Approach|Hint)\s*:?\s*/i.test(line)
    )
      break;
    contentLines.push(line);
  }

  if (contentLines.length > 0) {
    return contentLines.join(" ").toLowerCase().substring(0, 500);
  }
  return fullBlock.trim().toLowerCase().substring(0, 500);
}

/** Same parser as QuickQuestionInput.tsx */
function parseQuestionsFromText(text: string): string[] {
  if (text.includes("<<<QUESTION_START>>>")) {
    const blocks = text.split("<<<QUESTION_START>>>");
    return blocks
      .map((block) => {
        const contentMatch = block.match(
          /<<<QUESTION_CONTENT>>>([\s\S]*?)(?=<<<TEST_CASES>>>|<<<QUESTION_END>>>)/
        );
        if (!contentMatch) return "";
        let content = contentMatch[1].trim();
        content = content.replace(/^QUESTION_ID:\s*.+\n*/i, "").trim();
        return content;
      })
      .filter((q) => q.length > 10);
  }

  if (/^={5,}/m.test(text)) {
    return text
      .split(/^={5,}\s*$/m)
      .map((block) => {
        let cleaned = block.trim();
        cleaned = cleaned.replace(/^QUESTION ID:\s*.+\n*/i, "");
        cleaned = cleaned.replace(/^QUESTION CONTENT:\s*\n*/i, "");
        return cleaned.trim();
      })
      .filter((q) => q.length > 10);
  }

  const hasQuestionHeaders = /^Question\s*:?\s*$/im.test(text);
  if (hasQuestionHeaders) {
    const parts = text.split(/(?=^Question\s*:?\s*$)/im);
    return parts
      .map((q, i) => {
        const trimmed = q.trim();
        if (
          i < parts.length - 1 &&
          !/^Question\s*:?\s*$/im.test(trimmed)
        ) {
          parts[i + 1] = trimmed + "\n\n" + parts[i + 1];
          return "";
        }
        return trimmed;
      })
      .filter((q) => q.length > 0);
  }

  return text
    .split(/\n\s*\n/)
    .map((q) => q.trim())
    .filter((q) => q.length > 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_content, graph_id } = await req.json();
    if (!file_content || !graph_id) {
      return new Response(
        JSON.stringify({ error: "file_content and graph_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse file questions
    const fileQuestions = parseQuestionsFromText(file_content);
    const fileFingerprints = fileQuestions.map((q, i) => ({
      index: i,
      fingerprint: extractCoreQuestion(q),
      preview: q.substring(0, 120),
    }));

    // Fetch ALL DB questions (handle pagination)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const allDbQuestions: { question_text: string }[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("questions")
        .select("question_text")
        .eq("graph_id", graph_id)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allDbQuestions.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    // Fingerprint DB questions
    const dbFingerprints = new Set(
      allDbQuestions.map((q) => extractCoreQuestion(q.question_text))
    );

    // Compare
    const matched: typeof fileFingerprints = [];
    const missing: typeof fileFingerprints = [];

    for (const fq of fileFingerprints) {
      if (dbFingerprints.has(fq.fingerprint)) {
        matched.push(fq);
      } else {
        missing.push(fq);
      }
    }

    // For missing questions, include the full content
    const missingWithContent = missing.map((m) => ({
      ...m,
      full_content: fileQuestions[m.index],
    }));

    return new Response(
      JSON.stringify({
        file_question_count: fileQuestions.length,
        db_question_count: allDbQuestions.length,
        db_unique_fingerprints: dbFingerprints.size,
        matched_count: matched.length,
        missing_count: missing.length,
        // First 5 missing for diagnostics
        missing_sample: missingWithContent.slice(0, 5).map((m) => ({
          preview: m.preview,
          fingerprint: m.fingerprint.substring(0, 100),
        })),
        // Full missing content
        missing_questions: missingWithContent.map((m) => m.full_content),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
