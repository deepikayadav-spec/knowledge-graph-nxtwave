import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CURRICULUM_TOPICS = [
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

const SKILL_TOPIC_MAP: Record<string, number> = {
  variable_assignment: 1,
  type_recognition: 1,
  basic_output: 2,
  basic_input: 2,
  type_conversion: 2,
  string_concatenation: 2,
  string_indexing: 2,
  string_slicing: 2,
  string_repetition: 2,
  sequence_length_retrieval: 2,
  arithmetic_operations: 3,
  comparison_operators: 3,
  boolean_logic: 3,
  conditional_branching: 3,
  conditional_expression: 3,
  numeric_rounding: 3,
  nested_conditions: 4,
  loop_iteration: 5,
  accumulator_pattern: 5,
  search_pattern: 5,
  filter_pattern: 5,
  transform_pattern: 5,
  input_parsing: 5,
  nested_iteration: 5,
  geometric_pattern_generation: 5,
  integer_digit_extraction: 5,
  loop_control_statements: 6,
  string_methods: 7,
  formatted_output: 7,
  output_formatting: 7,
  character_encoding_conversion: 7,
  list_operations: 8,
  list_comprehension: 8,
  list_aggregation: 8,
  list_sorting: 8,
  sequence_rotation: 8,
  function_definition: 9,
  function_calls: 9,
  recursion: 10,
  tuple_operations: 11,
  set_operations: 11,
  matrix_operations: 12,
  matrix_construction: 12,
  matrix_element_access: 12,
  matrix_transposition: 12,
  matrix_rotation: 12,
  matrix_diagonal_traversal: 12,
  dictionary_operations: 13,
  class_definition: 14,
  object_methods: 14,
  encapsulation_concepts: 14,
  abstraction: 15,
  polymorphism: 15,
  inheritance: 15,
  class_inheritance: 15,
  abstract_class_interaction: 15,
  method_overriding: 15,
  file_io: 16,
  exception_handling: 16,
  datetime_manipulation: 16,
  problem_solving: 17,
  algorithmic_thinking: 17,
  debugging: 17,
  backtracking_pattern: 17,
  deferred_modification_pattern: 17,
  stateful_computation_simulation: 17,
  subproblem_enumeration_pattern: 17,
};

const GROUPING_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#a855f7', '#d946ef', '#0ea5e9', '#84cc16', '#f59e0b',
  '#ef4444', '#10b981',
];

// --- AI Subtopic Generation ---

interface SubtopicCluster {
  name: string;
  skill_ids: string[];
}

async function generateSubtopicsWithAI(
  topicName: string,
  skills: { skill_id: string; name: string }[],
  apiKey: string
): Promise<SubtopicCluster[] | null> {
  const skillList = skills.map(s => `- ${s.skill_id} ("${s.name}")`).join("\n");

  const prompt = `You are a computer science curriculum designer. Given a topic and its skills, group the skills into 2-4 meaningful subtopics.

Topic: "${topicName}"
Skills:
${skillList}

Rules:
- Every skill must appear in exactly one subtopic. Do not drop any skill.
- Each subtopic should have a short, descriptive name (2-4 words).
- Return 2-4 subtopics. If there are only 3 skills, 2 subtopics is fine.

Return ONLY valid JSON, no markdown:
{"subtopics": [{"name": "Subtopic Name", "skill_ids": ["skill_id_1", "skill_id_2"]}]}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`AI call failed for topic "${topicName}": ${response.status}`);
      return null;
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Strip markdown fences if present
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    const parsed = JSON.parse(content);
    const subtopics: SubtopicCluster[] = parsed.subtopics;

    // Validate: every skill must be accounted for
    const allSkillIds = new Set(skills.map(s => s.skill_id));
    const assignedIds = new Set(subtopics.flatMap(st => st.skill_ids));

    if (allSkillIds.size !== assignedIds.size) {
      console.warn(`AI dropped/added skills for "${topicName}", falling back`);
      return null;
    }
    for (const id of allSkillIds) {
      if (!assignedIds.has(id)) {
        console.warn(`AI missed skill "${id}" for "${topicName}", falling back`);
        return null;
      }
    }

    return subtopics;
  } catch (err) {
    console.error(`AI subtopic generation failed for "${topicName}":`, err);
    return null;
  }
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { graph_id } = await req.json();
    if (!graph_id) {
      return new Response(JSON.stringify({ error: "graph_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clear existing groupings
    await supabase.from("skills").update({ subtopic_id: null }).eq("graph_id", graph_id);
    await supabase.from("skill_subtopics").delete().eq("graph_id", graph_id);
    await supabase.from("skill_topics").delete().eq("graph_id", graph_id);

    // Fetch all skills
    const { data: skills, error: skillsError } = await supabase
      .from("skills")
      .select("id, skill_id, name")
      .eq("graph_id", graph_id);

    if (skillsError) throw skillsError;
    if (!skills || skills.length === 0) {
      return new Response(JSON.stringify({ message: "No skills found", skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Phase 1: Group skills by topic
    const topicGroups = new Map<number, typeof skills>();
    const unmappedSkills: typeof skills = [];

    for (const skill of skills) {
      const topicNum = SKILL_TOPIC_MAP[skill.skill_id];
      if (topicNum !== undefined) {
        if (!topicGroups.has(topicNum)) topicGroups.set(topicNum, []);
        topicGroups.get(topicNum)!.push(skill);
      } else {
        unmappedSkills.push(skill);
      }
    }

    const sortedTopicNums = [...topicGroups.keys()].sort((a, b) => a - b);
    let displayOrder = 0;
    let subtopicDisplayOrder = 0;

    // Phase 2: Create topics, then use AI to split into subtopics
    // First create all topic rows
    const topicRows: { topicNum: number; topicId: string; color: string; groupSkills: typeof skills }[] = [];

    for (const topicNum of sortedTopicNums) {
      const topicName = CURRICULUM_TOPICS[topicNum - 1] || `Topic ${topicNum}`;
      const color = GROUPING_COLORS[(topicNum - 1) % GROUPING_COLORS.length];
      const groupSkills = topicGroups.get(topicNum)!;

      const { data: topic, error: topicError } = await supabase
        .from("skill_topics")
        .insert({ graph_id, name: topicName, color, display_order: displayOrder })
        .select()
        .single();

      if (topicError) throw topicError;
      topicRows.push({ topicNum, topicId: topic.id, color, groupSkills });
      displayOrder++;
    }

    // Run AI subtopic generation in parallel for all topics with 3+ skills
    const aiResults = await Promise.all(
      topicRows.map(async ({ topicNum, topicId, color, groupSkills }) => {
        const topicName = CURRICULUM_TOPICS[topicNum - 1] || `Topic ${topicNum}`;

        if (groupSkills.length < 3) {
          // Small topic: single subtopic = topic name
          return { topicId, topicName, color, clusters: [{ name: topicName, skill_ids: groupSkills.map(s => s.skill_id) }] };
        }

        const aiClusters = await generateSubtopicsWithAI(topicName, groupSkills, apiKey);
        if (aiClusters) {
          return { topicId, topicName, color, clusters: aiClusters };
        }
        // Fallback: single subtopic
        return { topicId, topicName, color, clusters: [{ name: topicName, skill_ids: groupSkills.map(s => s.skill_id) }] };
      })
    );

    // Create subtopic rows and link skills
    for (const { topicId, color, clusters } of aiResults) {
      for (const cluster of clusters) {
        const subtopicColor = clusters.length === 1 ? color : GROUPING_COLORS[subtopicDisplayOrder % GROUPING_COLORS.length];

        const { data: subtopic, error: subtopicError } = await supabase
          .from("skill_subtopics")
          .insert({
            graph_id,
            topic_id: topicId,
            name: cluster.name,
            color: subtopicColor,
            display_order: subtopicDisplayOrder,
          })
          .select()
          .single();

        if (subtopicError) throw subtopicError;

        await supabase
          .from("skills")
          .update({ subtopic_id: subtopic.id })
          .eq("graph_id", graph_id)
          .in("skill_id", cluster.skill_ids);

        subtopicDisplayOrder++;
      }
    }

    // Handle unmapped skills
    if (unmappedSkills.length > 0) {
      const color = GROUPING_COLORS[displayOrder % GROUPING_COLORS.length];

      const { data: miscTopic, error: miscTopicError } = await supabase
        .from("skill_topics")
        .insert({ graph_id, name: "Other Skills", color, display_order: displayOrder })
        .select()
        .single();
      if (miscTopicError) throw miscTopicError;

      const { data: miscSubtopic, error: miscSubtopicError } = await supabase
        .from("skill_subtopics")
        .insert({ graph_id, topic_id: miscTopic.id, name: "Other Skills", color, display_order: subtopicDisplayOrder })
        .select()
        .single();
      if (miscSubtopicError) throw miscSubtopicError;

      await supabase
        .from("skills")
        .update({ subtopic_id: miscSubtopic.id })
        .eq("graph_id", graph_id)
        .in("skill_id", unmappedSkills.map(s => s.skill_id));
    }

    return new Response(
      JSON.stringify({
        message: "Groupings created with AI subtopics",
        topicsCreated: sortedTopicNums.length + (unmappedSkills.length > 0 ? 1 : 0),
        skillsMapped: skills.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in auto-group-skills:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
