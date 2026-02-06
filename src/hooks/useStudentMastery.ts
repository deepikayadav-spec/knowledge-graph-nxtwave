// Hook for managing individual student mastery data

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  processAttempt, 
  computeEffectiveMastery, 
  calculateOverallMastery,
  getKPsNeedingReview,
  createEmptyMastery,
  generateDemoMasteryForGraph,
} from '@/lib/mastery';
import type { 
  KPMastery, 
  StudentAttempt, 
  IndependenceLevel,
  QuestionWithWeights,
  StudentMasterySummary
} from '@/types/mastery';

interface UseStudentMasteryOptions {
  graphId: string;
  studentId: string;
  skillIds?: string[];      // For demo data generation
  useDemoData?: boolean;    // Force demo data mode
  autoLoad?: boolean;
}

interface UseStudentMasteryReturn {
  mastery: Map<string, KPMastery>;
  loading: boolean;
  error: string | null;
  loadMastery: () => Promise<void>;
  recordAttempt: (
    questionId: string,
    isCorrect: boolean,
    independenceLevel: IndependenceLevel
  ) => Promise<void>;
  getMastery: (skillId: string) => KPMastery | undefined;
  getOverallMastery: () => number;
  getAgingKPs: () => KPMastery[];
  getSummary: () => StudentMasterySummary;
  refreshWithDecay: () => void;
}

export function useStudentMastery({
  graphId,
  studentId,
  skillIds = [],
  useDemoData = false,
  autoLoad = true,
}: UseStudentMasteryOptions): UseStudentMasteryReturn {
  const [mastery, setMastery] = useState<Map<string, KPMastery>>(new Map());
  const [questionsMap, setQuestionsMap] = useState<Map<string, QuestionWithWeights>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load mastery data from database (or generate demo data)
  const loadMastery = useCallback(async () => {
    if (!graphId || !studentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // If useDemoData is true and we have skillIds, generate demo data directly
      if (useDemoData && skillIds.length > 0) {
        const demoMastery = generateDemoMasteryForGraph(graphId, studentId, skillIds);
        setMastery(demoMastery);
        setLoading(false);
        return;
      }
      
      // Load questions for this graph
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, graph_id, question_text, skills, primary_skills, skill_weights, weightage_multiplier')
        .eq('graph_id', graphId);
      
      if (questionsError) throw questionsError;
      
      // Build questions map
      const qMap = new Map<string, QuestionWithWeights>();
      (questionsData || []).forEach(q => {
        qMap.set(q.id, {
          id: q.id,
          graphId: q.graph_id,
          questionText: q.question_text,
          skills: q.skills || [],
          primarySkills: q.primary_skills || [],
          skillWeights: (q.skill_weights as Record<string, number>) || {},
          weightageMultiplier: q.weightage_multiplier ?? 1.0,
        });
      });
      setQuestionsMap(qMap);
      
      // Load existing mastery records
      const { data: masteryData, error: masteryError } = await supabase
        .from('student_kp_mastery')
        .select('*')
        .eq('graph_id', graphId)
        .eq('student_id', studentId);
      
      if (masteryError) throw masteryError;
      
      // Convert to map and compute effective mastery
      const masteryMap = new Map<string, KPMastery>();
      const records = (masteryData || []).map(m => ({
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
      }));
      
      // Apply retention decay
      const withDecay = computeEffectiveMastery(records);
      withDecay.forEach(m => masteryMap.set(m.skillId, m));
      
      // If no real data exists and skillIds are provided, fill with demo data
      if (masteryMap.size === 0 && skillIds.length > 0) {
        const demoMastery = generateDemoMasteryForGraph(graphId, studentId, skillIds);
        setMastery(demoMastery);
      } else {
        setMastery(masteryMap);
      }
    } catch (err) {
      console.error('Error loading mastery:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mastery data');
    } finally {
      setLoading(false);
    }
  }, [graphId, studentId, skillIds, useDemoData]);

  // Record a new attempt
  const recordAttempt = useCallback(async (
    questionId: string,
    isCorrect: boolean,
    independenceLevel: IndependenceLevel
  ) => {
    if (!graphId || !studentId) return;
    
    const question = questionsMap.get(questionId);
    if (!question) {
      console.error('Question not found:', questionId);
      return;
    }
    
    const attempt: StudentAttempt = {
      id: crypto.randomUUID(),
      graphId,
      studentId,
      questionId,
      isCorrect,
      independenceLevel,
      attemptedAt: new Date(),
    };
    
    try {
      // Insert attempt record
      const { error: attemptError } = await supabase
        .from('student_attempts')
        .insert({
          graph_id: graphId,
          student_id: studentId,
          question_id: questionId,
          is_correct: isCorrect,
          independence_level: independenceLevel,
          attempted_at: attempt.attemptedAt.toISOString(),
        });
      
      if (attemptError) throw attemptError;
      
      // Update local mastery state
      const updatedMastery = processAttempt(attempt, question, new Map(mastery));
      
      // Upsert mastery records to database
      for (const [skillId, m] of updatedMastery) {
        const { error: upsertError } = await supabase
          .from('student_kp_mastery')
          .upsert({
            graph_id: graphId,
            student_id: studentId,
            skill_id: skillId,
            earned_points: m.earnedPoints,
            max_points: m.maxPoints,
            raw_mastery: m.rawMastery,
            last_reviewed_at: m.lastReviewedAt?.toISOString(),
            stability: m.stability,
            retrieval_count: m.retrievalCount,
          }, {
            onConflict: 'graph_id,student_id,skill_id',
          });
        
        if (upsertError) throw upsertError;
      }
      
      // Refresh with decay
      const withDecay = computeEffectiveMastery(Array.from(updatedMastery.values()));
      const newMap = new Map<string, KPMastery>();
      withDecay.forEach(m => newMap.set(m.skillId, m));
      setMastery(newMap);
      
    } catch (err) {
      console.error('Error recording attempt:', err);
      setError(err instanceof Error ? err.message : 'Failed to record attempt');
    }
  }, [graphId, studentId, mastery, questionsMap]);

  // Get mastery for a specific skill
  const getMastery = useCallback((skillId: string) => {
    return mastery.get(skillId);
  }, [mastery]);

  // Get overall mastery (average across all KPs)
  const getOverallMastery = useCallback(() => {
    return calculateOverallMastery(Array.from(mastery.values()));
  }, [mastery]);

  // Get KPs that need review
  const getAgingKPs = useCallback(() => {
    return getKPsNeedingReview(Array.from(mastery.values()));
  }, [mastery]);

  // Get summary for this student
  const getSummary = useCallback((): StudentMasterySummary => {
    const records = Array.from(mastery.values());
    return {
      studentId,
      studentName: '', // Would need to be passed in or fetched
      overallMastery: calculateOverallMastery(records),
      masteredKPs: records.filter(m => (m.effectiveMastery ?? 0) >= 0.8).length,
      agingKPs: records.filter(m => m.retentionStatus === 'aging').length,
      expiredKPs: records.filter(m => m.retentionStatus === 'expired').length,
      totalKPs: records.length,
    };
  }, [mastery, studentId]);

  // Refresh mastery with current retention decay
  const refreshWithDecay = useCallback(() => {
    const records = Array.from(mastery.values());
    const withDecay = computeEffectiveMastery(records);
    const newMap = new Map<string, KPMastery>();
    withDecay.forEach(m => newMap.set(m.skillId, m));
    setMastery(newMap);
  }, [mastery]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && graphId && studentId) {
      loadMastery();
    }
  }, [autoLoad, graphId, studentId, loadMastery]);

  return {
    mastery,
    loading,
    error,
    loadMastery,
    recordAttempt,
    getMastery,
    getOverallMastery,
    getAgingKPs,
    getSummary,
    refreshWithDecay,
  };
}
