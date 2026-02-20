// Calculate and persist topic score ranges (min/max)

import { supabase } from '@/integrations/supabase/client';
import type { TopicScoreRange } from '@/types/grouping';

/**
 * Calculate topic score ranges and upsert to database.
 * 
 * For each topic:
 * 1. Find subtopics in that topic
 * 2. Find skills in those subtopics
 * 3. Find questions that contain any of those skills
 * 4. Count unique questions → max_score (binary scoring, full independence = 1.0)
 * 5. min_score = 0 always
 */
export async function calculateAndPersistTopicScoreRanges(
  graphId: string
): Promise<TopicScoreRange[]> {
  // 1. Load topics
  const { data: topics, error: topicsErr } = await supabase
    .from('skill_topics')
    .select('id, name')
    .eq('graph_id', graphId);

  if (topicsErr) throw topicsErr;
  if (!topics || topics.length === 0) return [];

  // 2. Load subtopics with topic_id
  const { data: subtopics, error: subtopicsErr } = await supabase
    .from('skill_subtopics')
    .select('id, topic_id')
    .eq('graph_id', graphId)
    .not('topic_id', 'is', null);

  if (subtopicsErr) throw subtopicsErr;

  // 3. Load skills with subtopic_id
  const { data: skills, error: skillsErr } = await supabase
    .from('skills')
    .select('skill_id, subtopic_id')
    .eq('graph_id', graphId)
    .not('subtopic_id', 'is', null);

  if (skillsErr) throw skillsErr;

  // 4. Load all questions
  const { data: questions, error: questionsErr } = await supabase
    .from('questions')
    .select('id, skills')
    .eq('graph_id', graphId);

  if (questionsErr) throw questionsErr;

  // Build maps: subtopic -> topic, skill -> subtopic
  const subtopicToTopic = new Map<string, string>();
  (subtopics || []).forEach(st => {
    if (st.topic_id) subtopicToTopic.set(st.id, st.topic_id);
  });

  const skillToTopic = new Map<string, string>();
  (skills || []).forEach(s => {
    if (s.subtopic_id) {
      const topicId = subtopicToTopic.get(s.subtopic_id);
      if (topicId) skillToTopic.set(s.skill_id, topicId);
    }
  });

  // For each topic, find unique questions
  const topicQuestions = new Map<string, Set<string>>();
  (topics || []).forEach(t => topicQuestions.set(t.id, new Set()));

  (questions || []).forEach(q => {
    const qSkills = q.skills || [];
    for (const skillId of qSkills) {
      const topicId = skillToTopic.get(skillId);
      if (topicId) {
        topicQuestions.get(topicId)?.add(q.id);
      }
    }
  });

  // Build ranges and upsert
  const ranges: TopicScoreRange[] = [];
  for (const topic of topics) {
    const uniqueQs = topicQuestions.get(topic.id) || new Set();
    const range: TopicScoreRange = {
      id: '', // will be set by DB
      graphId,
      topicId: topic.id,
      topicName: topic.name,
      minScore: 0,
      maxScore: uniqueQs.size,
      uniqueQuestions: uniqueQs.size,
    };

    const { data, error } = await supabase
      .from('topic_score_ranges')
      .upsert({
        graph_id: graphId,
        topic_id: topic.id,
        topic_name: topic.name,
        min_score: 0,
        max_score: uniqueQs.size,
        unique_questions: uniqueQs.size,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'graph_id,topic_id',
      })
      .select()
      .single();

    if (!error && data) {
      range.id = data.id;
    }
    ranges.push(range);
  }

  return ranges;
}

/**
 * Load topic score ranges from database
 */
export async function loadTopicScoreRanges(
  graphId: string
): Promise<TopicScoreRange[]> {
  const { data, error } = await supabase
    .from('topic_score_ranges')
    .select('*')
    .eq('graph_id', graphId);

  if (error) throw error;

  return (data || []).map(r => ({
    id: r.id,
    graphId: r.graph_id,
    topicId: r.topic_id,
    topicName: r.topic_name,
    minScore: Number(r.min_score),
    maxScore: Number(r.max_score),
    uniqueQuestions: r.unique_questions,
    updatedAt: r.updated_at,
  }));
}
