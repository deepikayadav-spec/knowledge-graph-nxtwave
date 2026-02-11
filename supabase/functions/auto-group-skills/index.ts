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
  nested_conditions: 4,
  loop_iteration: 5,
  accumulator_pattern: 5,
  search_pattern: 5,
  filter_pattern: 5,
  transform_pattern: 5,
  input_parsing: 5,
  nested_iteration: 5,
  loop_control_statements: 6,
  string_methods: 7,
  formatted_output: 7,
  output_formatting: 7,
  list_operations: 8,
  list_comprehension: 8,
  function_definition: 9,
  function_calls: 9,
  recursion: 10,
  tuple_operations: 11,
  set_operations: 11,
  matrix_operations: 12,
  dictionary_operations: 13,
  class_definition: 14,
  object_methods: 14,
  abstraction: 15,
  polymorphism: 15,
  inheritance: 15,
  file_io: 16,
  exception_handling: 16,
  problem_solving: 17,
  algorithmic_thinking: 17,
  debugging: 17,
};

const GROUPING_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#a855f7', '#d946ef', '#0ea5e9', '#84cc16', '#f59e0b',
  '#ef4444', '#10b981',
];

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if groupings already exist
    const { data: existingTopics } = await supabase
      .from("skill_topics")
      .select("id")
      .eq("graph_id", graph_id)
      .limit(1);

    if (existingTopics && existingTopics.length > 0) {
      return new Response(JSON.stringify({ message: "Groupings already exist", skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all skills for this graph
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

    // Group skills by topic number
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

    // Create topics and subtopics for each group
    const sortedTopicNums = [...topicGroups.keys()].sort((a, b) => a - b);
    let displayOrder = 0;

    for (const topicNum of sortedTopicNums) {
      const topicName = CURRICULUM_TOPICS[topicNum - 1] || `Topic ${topicNum}`;
      const color = GROUPING_COLORS[(topicNum - 1) % GROUPING_COLORS.length];
      const groupSkills = topicGroups.get(topicNum)!;

      // Create topic
      const { data: topic, error: topicError } = await supabase
        .from("skill_topics")
        .insert({
          graph_id,
          name: topicName,
          color,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (topicError) throw topicError;

      // Create subtopic (same as topic for now — 1:1 mapping)
      const { data: subtopic, error: subtopicError } = await supabase
        .from("skill_subtopics")
        .insert({
          graph_id,
          topic_id: topic.id,
          name: topicName,
          color,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (subtopicError) throw subtopicError;

      // Link skills to this subtopic
      const skillIds = groupSkills.map(s => s.skill_id);
      const { error: updateError } = await supabase
        .from("skills")
        .update({ subtopic_id: subtopic.id })
        .eq("graph_id", graph_id)
        .in("skill_id", skillIds);

      if (updateError) throw updateError;

      displayOrder++;
    }

    // Handle unmapped skills — create a "Miscellaneous" topic if any
    if (unmappedSkills.length > 0) {
      const color = GROUPING_COLORS[displayOrder % GROUPING_COLORS.length];
      
      const { data: miscTopic, error: miscTopicError } = await supabase
        .from("skill_topics")
        .insert({
          graph_id,
          name: "Other Skills",
          color,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (miscTopicError) throw miscTopicError;

      const { data: miscSubtopic, error: miscSubtopicError } = await supabase
        .from("skill_subtopics")
        .insert({
          graph_id,
          topic_id: miscTopic.id,
          name: "Other Skills",
          color,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (miscSubtopicError) throw miscSubtopicError;

      const unmappedIds = unmappedSkills.map(s => s.skill_id);
      await supabase
        .from("skills")
        .update({ subtopic_id: miscSubtopic.id })
        .eq("graph_id", graph_id)
        .in("skill_id", unmappedIds);
    }

    return new Response(
      JSON.stringify({
        message: "Groupings created successfully",
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
