import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Python Curriculum ───

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

const PYTHON_SKILL_TOPIC_MAP: Record<string, number> = {
  variable_assignment: 1, type_recognition: 1,
  basic_output: 2, basic_input: 2, type_conversion: 2, string_concatenation: 2,
  string_indexing: 2, string_slicing: 2, string_repetition: 2, sequence_length_retrieval: 2,
  arithmetic_operations: 3, comparison_operators: 3, boolean_logic: 3,
  conditional_branching: 3, conditional_expression: 3, numeric_rounding: 3,
  nested_conditions: 4,
  loop_iteration: 5, accumulator_pattern: 5, search_pattern: 5, filter_pattern: 5,
  transform_pattern: 5, input_parsing: 5, nested_iteration: 5,
  geometric_pattern_generation: 5, integer_digit_extraction: 5,
  loop_control_statements: 6,
  string_methods: 7, formatted_output: 7, output_formatting: 7, character_encoding_conversion: 7,
  list_operations: 8, list_comprehension: 8, list_aggregation: 8, list_sorting: 8, sequence_rotation: 8,
  function_definition: 9, function_calls: 9,
  recursion: 10,
  tuple_operations: 11, set_operations: 11,
  matrix_operations: 12, matrix_construction: 12, matrix_element_access: 12,
  matrix_transposition: 12, matrix_rotation: 12, matrix_diagonal_traversal: 12,
  dictionary_operations: 13,
  class_definition: 14, object_methods: 14, encapsulation_concepts: 14,
  abstraction: 15, polymorphism: 15, inheritance: 15, class_inheritance: 15,
  abstract_class_interaction: 15, method_overriding: 15,
  file_io: 16, exception_handling: 16, datetime_manipulation: 16,
  problem_solving: 17, algorithmic_thinking: 17, debugging: 17,
  backtracking_pattern: 17, deferred_modification_pattern: 17,
  stateful_computation_simulation: 17, subproblem_enumeration_pattern: 17,
};

// ─── Web Curriculum ───

const WEB_TOPICS = ["HTML", "CSS", "JS", "JS Coding", "React"];

// All 36 subtopics in display order
const WEB_SUBTOPICS = [
  // HTML (indices 0-3)
  "Introduction to HTML", "HTML Elements", "HTML Forms and Tables", "HTML Attributes and General",
  // CSS (indices 4-12)
  "Introduction To CSS And CSS Selectors", "CSS Properties", "CSS Display And Position",
  "CSS Layouts And Box Model", "CSS Selectors", "CSS Flexbox", "CSS Grid", "CSS Media Queries", "CSS General",
  // JS (indices 13-19)
  "Introduction to JavaScript", "DOM And Events", "Schedulers and Callback Functions",
  "Storage Mechanisms", "Network and HTTP Requests", "Asynchronous JS and Error Handling", "JS General",
  // JS Coding (indices 20-26)
  "Variables", "Data Types", "Operators", "Conditional Statements", "Functions", "Loops", "Recursion",
  // React (indices 27-35)
  "Introduction to React", "React Components and Props", "useState Hook", "useEffect Hook",
  "More React Hooks", "React Router", "Authentication and Authorisation", "React Lists and Forms", "React General",
];

// Subtopic index -> topic index (1-based to match topic creation order)
const WEB_SUBTOPIC_TOPIC: Record<number, number> = {
  0: 1, 1: 1, 2: 1, 3: 1,
  4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2,
  13: 3, 14: 3, 15: 3, 16: 3, 17: 3, 18: 3, 19: 3,
  20: 4, 21: 4, 22: 4, 23: 4, 24: 4, 25: 4, 26: 4,
  27: 5, 28: 5, 29: 5, 30: 5, 31: 5, 32: 5, 33: 5, 34: 5, 35: 5,
};

// skill_id -> subtopic index (deterministic, no AI needed)
const WEB_SKILL_SUBTOPIC_MAP: Record<string, number> = {
  // HTML
  html_semantic_elements: 0, html_elements: 1, html_forms: 2, html_attributes: 3,
  html_basics: 0,
  // CSS
  css_selectors: 4, css_properties: 5, css_positioning: 6, css_box_model: 7,
  css_specificity: 8, css_flexbox: 9, css_grid: 10,
  css_media_queries: 11, css_responsive_design: 11,
  css_transforms: 12, css_utility_frameworks: 12,
  css_transform: 12, css_z_index: 6, css_grid_alignment: 10, css_flexbox_layout: 9, css_basics: 4,
  css_styling_and_layout: 7, tailwind_css_utility_classes: 12,
  // JS
  js_closures: 13, js_console_output: 13,
  js_dom_manipulation: 14, js_event_handling: 14,
  js_timed_events: 15, js_timers: 15, js_browser_storage: 16, js_local_storage_api: 16, js_fetch_api: 17, api_http_requests: 17, rss_feed_integration: 17,
  js_async_await: 18, js_promises: 18, js_error_handling: 18,
  js_modules: 19, js_classes: 19, js_constructor_functions: 19, js_date_object_manipulation: 19,
  exception_handling: 18, js_spread_rest_operators: 19, class_definition: 19, object_methods: 19,
  js_date_object: 19, js_core_logic: 19, date_fns_usage: 19,
  google_sheets_api_integration: 19, ai_api_integration: 19, ai_prompt_engineering: 19,
  ai_workflow_design: 19, n8n_workflow_design: 19, n8n_ai_workflow_automation: 19,
  n8n_ai_agent_usage: 19, n8n_expression_language: 19, n8n_trigger_node_usage: 19,
  // JS Coding
  js_variables: 20,
  js_string_methods: 21, js_arrays: 21, js_objects: 21, js_in_place_manipulation: 21, js_data_structures_set: 21, regex_basics: 21,
  js_operators: 22, js_conditionals: 23, input_validation: 23, js_functions: 24, algorithm_two_sum_hash_map: 24,
  js_loops: 25, js_loop_control_statements: 25, nested_iteration: 25,
  accumulator_pattern: 25, algorithm_intersection: 25, algorithm_prime_check: 25,
  algorithm_set_difference: 25, algorithm_sorting: 25, algorithm_two_pointers: 25,
  js_recursion: 26, algorithm_recursion: 26,
  variable_assignment: 20, basic_output: 20, basic_input: 20, input_parsing: 20, formatted_output: 20, input_output_formatting: 20,
  type_conversion: 21, type_recognition: 21, string_indexing: 21, list_operations: 21, dictionary_operations: 21,
  comparison_operators: 22, arithmetic_operations: 22, boolean_logic: 22,
  conditional_branching: 23,
  function_definition: 24, function_calls: 24,
  loop_iteration: 25, search_pattern: 25, loop_control_statements: 25, iterative_control_flow: 25,
  // React
  react_jsx: 27,
  react_components: 28, react_props: 28,
  react_state: 29, react_context_api: 31,
  react_routing: 32, react_protected_routes: 33, react_lists_keys: 34,
  react_component_data_flow: 28, react_component_fundamentals: 27, react_conditional_rendering: 34,
  react_effects: 30,
  html_document_structure: 0,
};

const GROUPING_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#a855f7', '#d946ef', '#0ea5e9', '#84cc16', '#f59e0b',
  '#ef4444', '#10b981',
];

// ─── AI Subtopic Generation (Python path) ───

interface SubtopicCluster { name: string; skill_ids: string[]; }

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
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek/deepseek-v3.2",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });
    if (!response.ok) { console.error(`AI failed for "${topicName}": ${response.status}`); return null; }
    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(content);
    const subtopics: SubtopicCluster[] = parsed.subtopics;
    const allSkillIds = new Set(skills.map(s => s.skill_id));
    const assignedIds = new Set(subtopics.flatMap(st => st.skill_ids));
    if (allSkillIds.size !== assignedIds.size) return null;
    for (const id of allSkillIds) { if (!assignedIds.has(id)) return null; }
    return subtopics;
  } catch (err) {
    console.error(`AI subtopic generation failed for "${topicName}":`, err);
    return null;
  }
}

// ─── Web Domain: Deterministic grouping ───

async function handleWebDomain(
  supabase: any,
  graph_id: string,
  skills: { id: string; skill_id: string; name: string }[]
) {
  // Phase 1: Create topics
  const topicIdMap: Record<number, string> = {}; // 1-based topic index -> db id
  for (let i = 0; i < WEB_TOPICS.length; i++) {
    const { data: topic, error } = await supabase
      .from("skill_topics")
      .insert({ graph_id, name: WEB_TOPICS[i], color: GROUPING_COLORS[i % GROUPING_COLORS.length], display_order: i })
      .select().single();
    if (error) throw error;
    topicIdMap[i + 1] = topic.id;
  }

  // Phase 2: Create all 36 subtopics
  const subtopicIdMap: Record<number, string> = {}; // subtopic index -> db id
  for (let i = 0; i < WEB_SUBTOPICS.length; i++) {
    const topicNum = WEB_SUBTOPIC_TOPIC[i];
    const topicDbId = topicIdMap[topicNum];
    const color = GROUPING_COLORS[i % GROUPING_COLORS.length];
    const { data: subtopic, error } = await supabase
      .from("skill_subtopics")
      .insert({ graph_id, topic_id: topicDbId, name: WEB_SUBTOPICS[i], color, display_order: i })
      .select().single();
    if (error) throw error;
    subtopicIdMap[i] = subtopic.id;
  }

  // Phase 3: Assign skills to subtopics
  const unmappedSkills: typeof skills = [];
  for (const skill of skills) {
    const subtopicIdx = WEB_SKILL_SUBTOPIC_MAP[skill.skill_id];
    if (subtopicIdx !== undefined) {
      await supabase
        .from("skills")
        .update({ subtopic_id: subtopicIdMap[subtopicIdx] })
        .eq("id", skill.id);
    } else {
      unmappedSkills.push(skill);
    }
  }

  // Handle unmapped
  if (unmappedSkills.length > 0) {
    const otherOrder = WEB_TOPICS.length;
    const color = GROUPING_COLORS[otherOrder % GROUPING_COLORS.length];
    const { data: miscTopic, error: te } = await supabase
      .from("skill_topics")
      .insert({ graph_id, name: "Other Skills", color, display_order: otherOrder })
      .select().single();
    if (te) throw te;
    const { data: miscSub, error: se } = await supabase
      .from("skill_subtopics")
      .insert({ graph_id, topic_id: miscTopic.id, name: "Other Skills", color, display_order: WEB_SUBTOPICS.length })
      .select().single();
    if (se) throw se;
    await supabase
      .from("skills")
      .update({ subtopic_id: miscSub.id })
      .eq("graph_id", graph_id)
      .in("skill_id", unmappedSkills.map(s => s.skill_id));
  }

  return {
    topicsCreated: WEB_TOPICS.length + (unmappedSkills.length > 0 ? 1 : 0),
    subtopicsCreated: WEB_SUBTOPICS.length + (unmappedSkills.length > 0 ? 1 : 0),
    skillsMapped: skills.length,
  };
}

// ─── Python Domain: AI-assisted grouping (existing logic) ───

async function handlePythonDomain(
  supabase: any,
  graph_id: string,
  skills: { id: string; skill_id: string; name: string }[],
  apiKey: string
) {
  const topicGroups = new Map<number, typeof skills>();
  const unmappedSkills: typeof skills = [];

  for (const skill of skills) {
    const topicNum = PYTHON_SKILL_TOPIC_MAP[skill.skill_id];
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

  const topicRows: { topicNum: number; topicId: string; color: string; groupSkills: typeof skills }[] = [];
  for (const topicNum of sortedTopicNums) {
    const topicName = PYTHON_TOPICS[topicNum - 1] || `Topic ${topicNum}`;
    const color = GROUPING_COLORS[(topicNum - 1) % GROUPING_COLORS.length];
    const groupSkills = topicGroups.get(topicNum)!;
    const { data: topic, error } = await supabase
      .from("skill_topics")
      .insert({ graph_id, name: topicName, color, display_order: displayOrder })
      .select().single();
    if (error) throw error;
    topicRows.push({ topicNum, topicId: topic.id, color, groupSkills });
    displayOrder++;
  }

  const aiResults = await Promise.all(
    topicRows.map(async ({ topicNum, topicId, color, groupSkills }) => {
      const topicName = PYTHON_TOPICS[topicNum - 1] || `Topic ${topicNum}`;
      if (groupSkills.length < 3) {
        return { topicId, color, clusters: [{ name: topicName, skill_ids: groupSkills.map(s => s.skill_id) }] };
      }
      const aiClusters = await generateSubtopicsWithAI(topicName, groupSkills, apiKey);
      if (aiClusters) return { topicId, color, clusters: aiClusters };
      return { topicId, color, clusters: [{ name: topicName, skill_ids: groupSkills.map(s => s.skill_id) }] };
    })
  );

  for (const { topicId, color, clusters } of aiResults) {
    for (const cluster of clusters) {
      const subtopicColor = clusters.length === 1 ? color : GROUPING_COLORS[subtopicDisplayOrder % GROUPING_COLORS.length];
      const { data: subtopic, error } = await supabase
        .from("skill_subtopics")
        .insert({ graph_id, topic_id: topicId, name: cluster.name, color: subtopicColor, display_order: subtopicDisplayOrder })
        .select().single();
      if (error) throw error;
      await supabase.from("skills").update({ subtopic_id: subtopic.id }).eq("graph_id", graph_id).in("skill_id", cluster.skill_ids);
      subtopicDisplayOrder++;
    }
  }

  if (unmappedSkills.length > 0) {
    const color = GROUPING_COLORS[displayOrder % GROUPING_COLORS.length];
    const { data: miscTopic, error: te } = await supabase
      .from("skill_topics")
      .insert({ graph_id, name: "Other Skills", color, display_order: displayOrder })
      .select().single();
    if (te) throw te;
    const { data: miscSub, error: se } = await supabase
      .from("skill_subtopics")
      .insert({ graph_id, topic_id: miscTopic.id, name: "Other Skills", color, display_order: subtopicDisplayOrder })
      .select().single();
    if (se) throw se;
    await supabase.from("skills").update({ subtopic_id: miscSub.id }).eq("graph_id", graph_id).in("skill_id", unmappedSkills.map(s => s.skill_id));
  }

  return {
    topicsCreated: sortedTopicNums.length + (unmappedSkills.length > 0 ? 1 : 0),
    skillsMapped: skills.length,
  };
}

// ─── Main handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { graph_id } = await req.json();
    if (!graph_id) {
      return new Response(JSON.stringify({ error: "graph_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("OPENROUTER_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clear existing groupings
    await supabase.from("skills").update({ subtopic_id: null }).eq("graph_id", graph_id);
    await supabase.from("skill_subtopics").delete().eq("graph_id", graph_id);
    await supabase.from("skill_topics").delete().eq("graph_id", graph_id);

    // Fetch all skills
    const { data: skills, error: skillsError } = await supabase
      .from("skills").select("id, skill_id, name").eq("graph_id", graph_id);
    if (skillsError) throw skillsError;
    if (!skills || skills.length === 0) {
      return new Response(JSON.stringify({ message: "No skills found", skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Domain detection: count matches for each map
    const pythonMatches = skills.filter(s => PYTHON_SKILL_TOPIC_MAP[s.skill_id] !== undefined).length;
    const webMatches = skills.filter(s => WEB_SKILL_SUBTOPIC_MAP[s.skill_id] !== undefined).length;
    const isWeb = webMatches > pythonMatches;

    console.log(`Domain detection: python=${pythonMatches}, web=${webMatches}, using=${isWeb ? 'web' : 'python'}`);

    let result;
    if (isWeb) {
      result = await handleWebDomain(supabase, graph_id, skills);
    } else {
      result = await handlePythonDomain(supabase, graph_id, skills, apiKey);
    }

    return new Response(
      JSON.stringify({ message: `Groupings created (${isWeb ? 'web' : 'python'} domain)`, ...result }),
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
