// Per-student topic grade calculation with sqrt-weighted rollup

import { supabase } from '@/integrations/supabase/client';
import { getGradeForPercent, type GradeDefinition } from './gradeScale';

export interface KPGrade {
  skillId: string;
  skillName: string;
  correct: number;
  total: number;
  mastery: number;
}

export interface SubtopicGrade {
  subtopicId: string;
  subtopicName: string;
  masteryPercent: number;
  kps: KPGrade[];
}

export interface TopicGrade {
  topicId: string;
  topicName: string;
  masteryPercent: number;
  grade: string;
  gradeColor: string;
  subtopics: SubtopicGrade[];
}

/**
 * Calculate per-student topic grades using sqrt-weighted rollup.
 * 
 * KP mastery = correct / total questions mapped to KP
 * Subtopic mastery = sqrt-weighted avg of KP masteries
 * Topic mastery = sqrt-weighted avg of subtopic masteries
 */
export async function calculateStudentTopicGrades(
  studentId: string,
  graphId: string
): Promise<TopicGrade[]> {
  // Fetch all needed data in parallel
  const [attemptsRes, questionsRes, skillsRes, subtopicsRes, topicsRes] = await Promise.all([
    supabase
      .from('student_attempts')
      .select('question_id, is_correct')
      .eq('graph_id', graphId)
      .eq('student_id', studentId),
    supabase
      .from('questions')
      .select('id, skills')
      .eq('graph_id', graphId),
    supabase
      .from('skills')
      .select('skill_id, name, subtopic_id')
      .eq('graph_id', graphId),
    supabase
      .from('skill_subtopics')
      .select('id, name, topic_id')
      .eq('graph_id', graphId),
    supabase
      .from('skill_topics')
      .select('id, name, display_order')
      .eq('graph_id', graphId),
  ]);

  const attempts = attemptsRes.data || [];
  const questions = questionsRes.data || [];
  const skills = skillsRes.data || [];
  const subtopics = subtopicsRes.data || [];
  const topics = topicsRes.data || [];

  // Build question -> skills mapping
  const questionSkillsMap = new Map<string, string[]>();
  for (const q of questions) {
    questionSkillsMap.set(q.id, q.skills || []);
  }

  // Build skill metadata maps
  const skillNameMap = new Map<string, string>();
  const skillSubtopicMap = new Map<string, string>();
  for (const s of skills) {
    skillNameMap.set(s.skill_id, s.name);
    if (s.subtopic_id) skillSubtopicMap.set(s.skill_id, s.subtopic_id);
  }

  // Build subtopic -> topic mapping
  const subtopicTopicMap = new Map<string, string>();
  const subtopicNameMap = new Map<string, string>();
  for (const st of subtopics) {
    subtopicNameMap.set(st.id, st.name);
    if (st.topic_id) subtopicTopicMap.set(st.id, st.topic_id);
  }

  // Count correct and total per KP
  // Use a Set to track unique questions per KP for max, and correct answers
  const kpQuestionCorrect = new Map<string, Set<string>>(); // skillId -> set of correctly answered question IDs
  const kpQuestionTotal = new Map<string, Set<string>>();   // skillId -> set of all question IDs attempted

  for (const attempt of attempts) {
    const questionSkills = questionSkillsMap.get(attempt.question_id);
    if (!questionSkills) continue;

    for (const skillId of questionSkills) {
      if (!kpQuestionTotal.has(skillId)) kpQuestionTotal.set(skillId, new Set());
      kpQuestionTotal.get(skillId)!.add(attempt.question_id);

      if (attempt.is_correct) {
        if (!kpQuestionCorrect.has(skillId)) kpQuestionCorrect.set(skillId, new Set());
        kpQuestionCorrect.get(skillId)!.add(attempt.question_id);
      }
    }
  }

  // Also count total questions mapped (not just attempted) for max
  const kpTotalMapped = new Map<string, number>();
  for (const q of questions) {
    for (const skillId of (q.skills || [])) {
      kpTotalMapped.set(skillId, (kpTotalMapped.get(skillId) || 0) + 1);
    }
  }

  // Build KP grades
  const kpGrades = new Map<string, KPGrade>();
  const allKpIds = new Set([...kpTotalMapped.keys()]);
  
  for (const skillId of allKpIds) {
    const total = kpTotalMapped.get(skillId) || 0;
    const correct = kpQuestionCorrect.get(skillId)?.size || 0;
    kpGrades.set(skillId, {
      skillId,
      skillName: skillNameMap.get(skillId) || skillId,
      correct,
      total,
      mastery: total > 0 ? correct / total : 0,
    });
  }

  // Group KPs by subtopic
  const subtopicKPs = new Map<string, KPGrade[]>();
  for (const [skillId, grade] of kpGrades) {
    const subtopicId = skillSubtopicMap.get(skillId);
    if (!subtopicId) continue;
    if (!subtopicKPs.has(subtopicId)) subtopicKPs.set(subtopicId, []);
    subtopicKPs.get(subtopicId)!.push(grade);
  }

  // Calculate subtopic grades with sqrt weighting
  const subtopicGrades = new Map<string, SubtopicGrade>();
  for (const [subtopicId, kps] of subtopicKPs) {
    let sqrtWeightSum = 0;
    let weightedMastery = 0;
    for (const kp of kps) {
      if (kp.total > 0) {
        const w = Math.sqrt(kp.total);
        sqrtWeightSum += w;
        weightedMastery += kp.mastery * w;
      }
    }
    subtopicGrades.set(subtopicId, {
      subtopicId,
      subtopicName: subtopicNameMap.get(subtopicId) || subtopicId,
      masteryPercent: sqrtWeightSum > 0 ? weightedMastery / sqrtWeightSum : 0,
      kps,
    });
  }

  // Group subtopics by topic
  const topicSubtopics = new Map<string, SubtopicGrade[]>();
  for (const [subtopicId, grade] of subtopicGrades) {
    const topicId = subtopicTopicMap.get(subtopicId);
    if (!topicId) continue;
    if (!topicSubtopics.has(topicId)) topicSubtopics.set(topicId, []);
    topicSubtopics.get(topicId)!.push(grade);
  }

  // Calculate topic grades with sqrt weighting on subtopic total questions
  const result: TopicGrade[] = [];
  const sortedTopics = [...topics].sort((a, b) => a.display_order - b.display_order);

  for (const topic of sortedTopics) {
    const subs = topicSubtopics.get(topic.id) || [];
    let sqrtWeightSum = 0;
    let weightedMastery = 0;

    for (const sub of subs) {
      const totalQs = sub.kps.reduce((sum, kp) => sum + kp.total, 0);
      if (totalQs > 0) {
        const w = Math.sqrt(totalQs);
        sqrtWeightSum += w;
        weightedMastery += sub.masteryPercent * w;
      }
    }

    const masteryPercent = sqrtWeightSum > 0 ? weightedMastery / sqrtWeightSum : 0;
    const gradeInfo = getGradeForPercent(masteryPercent);

    result.push({
      topicId: topic.id,
      topicName: topic.name,
      masteryPercent,
      grade: gradeInfo.grade,
      gradeColor: gradeInfo.color,
      subtopics: subs,
    });
  }

  return result;
}
