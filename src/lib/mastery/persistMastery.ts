// Helper to calculate and persist mastery after bulk operations

import { supabase } from '@/integrations/supabase/client';
import { processAttemptsBatch, createEmptyMastery } from './calculateMastery';
import type { StudentAttempt, QuestionWithWeights, KPMastery } from '@/types/mastery';

/**
 * Calculate mastery for a student and persist to database.
 * 
 * IMPORTANT: maxPoints for each KP is set to the TOTAL number of questions
 * in the graph that map to that KP, not just the attempted ones.
 * This ensures unattempted questions count as 0 (incorrect).
 */
export async function calculateAndPersistMastery(
  graphId: string,
  studentId: string,
  attempts: StudentAttempt[],
  questionsMap: Map<string, QuestionWithWeights>
): Promise<void> {
  if (attempts.length === 0) return;

  // 1. Load existing mastery for this student
  const { data: existingMastery } = await supabase
    .from('student_kp_mastery')
    .select('*')
    .eq('graph_id', graphId)
    .eq('student_id', studentId);

  // Convert to Map<skillId, KPMastery>
  const masteryMap = new Map<string, KPMastery>();
  (existingMastery || []).forEach(m => {
    masteryMap.set(m.skill_id, {
      id: m.id,
      graphId: m.graph_id,
      studentId: m.student_id,
      skillId: m.skill_id,
      earnedPoints: Number(m.earned_points),
      maxPoints: Number(m.max_points),
      rawMastery: Number(m.raw_mastery),
      lastReviewedAt: m.last_reviewed_at ? new Date(m.last_reviewed_at) : null,
      stability: Number(m.stability),
      retrievalCount: m.retrieval_count,
    });
  });

  // 2. Process all attempts through the mastery calculation
  const updatedMastery = processAttemptsBatch(attempts, questionsMap, masteryMap);

  // 3. Fix maxPoints: for each KP, set maxPoints = total questions in graph mapped to that KP
  // Build a map: skillId -> count of questions that include it
  const skillQuestionCount = new Map<string, number>();
  for (const question of questionsMap.values()) {
    for (const skillId of question.skills) {
      skillQuestionCount.set(skillId, (skillQuestionCount.get(skillId) || 0) + 1);
    }
  }

  // Apply the correct maxPoints and recalculate rawMastery
  for (const [skillId, mastery] of updatedMastery) {
    const totalQuestions = skillQuestionCount.get(skillId) || mastery.maxPoints;
    mastery.maxPoints = totalQuestions;
    mastery.rawMastery = totalQuestions > 0
      ? mastery.earnedPoints / totalQuestions
      : 0;
  }

  // Also create mastery records for KPs that have questions but no attempts
  for (const [skillId, count] of skillQuestionCount) {
    if (!updatedMastery.has(skillId)) {
      const empty = createEmptyMastery(graphId, studentId, skillId);
      empty.maxPoints = count;
      empty.rawMastery = 0;
      updatedMastery.set(skillId, empty);
    }
  }

  // 4. Upsert each mastery record to database
  for (const [skillId, mastery] of updatedMastery) {
    await supabase
      .from('student_kp_mastery')
      .upsert({
        graph_id: graphId,
        student_id: studentId,
        skill_id: skillId,
        earned_points: mastery.earnedPoints,
        max_points: mastery.maxPoints,
        raw_mastery: mastery.rawMastery,
        last_reviewed_at: mastery.lastReviewedAt?.toISOString() || null,
        stability: 14.0,
        retrieval_count: mastery.retrievalCount,
      }, {
        onConflict: 'graph_id,student_id,skill_id',
      });
  }
}

/**
 * Build a questions map from database records
 */
export function buildQuestionsMap(
  questionsData: Array<{
    id: string;
    graph_id: string;
    question_text: string;
    skills: string[];
    primary_skills: string[];
    skill_weights: unknown;
    cognitive_complexity?: number | null;
    task_structure?: number | null;
    algorithmic_demands?: number | null;
    scope_integration?: number | null;
    weightage_multiplier?: number | null;
  }>
): Map<string, QuestionWithWeights> {
  const map = new Map<string, QuestionWithWeights>();
  
  for (const q of questionsData) {
    map.set(q.id, {
      id: q.id,
      graphId: q.graph_id,
      questionText: q.question_text,
      skills: q.skills || [],
      primarySkills: q.primary_skills || [],
      skillWeights: (q.skill_weights as Record<string, number>) || {},
      cognitiveComplexity: q.cognitive_complexity ?? undefined,
      taskStructure: q.task_structure ?? undefined,
      algorithmicDemands: q.algorithmic_demands ?? undefined,
      scopeIntegration: q.scope_integration ?? undefined,
      weightageMultiplier: q.weightage_multiplier ?? 1.0,
    });
  }
  
  return map;
}
