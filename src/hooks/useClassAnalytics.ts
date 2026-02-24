// Hook for cohort-level analytics

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateOverallMastery } from '@/lib/mastery';
import type { 
  KPMastery, 
  ClassAnalytics, 
  StudentMasterySummary,
  StudentClass,
  ClassStudent
} from '@/types/mastery';

interface UseClassAnalyticsOptions {
  classId: string;
  autoLoad?: boolean;
}

interface UseClassAnalyticsReturn {
  classInfo: StudentClass | null;
  students: ClassStudent[];
  analytics: ClassAnalytics | null;
  studentSummaries: StudentMasterySummary[];
  loading: boolean;
  error: string | null;
  loadAnalytics: () => Promise<void>;
  getSkillAnalytics: (skillId: string) => {
    averageMastery: number;
    studentsAbove80: number;
    studentsBelow50: number;
  };
}

export function useClassAnalytics({
  classId,
  autoLoad = true,
}: UseClassAnalyticsOptions): UseClassAnalyticsReturn {
  const [classInfo, setClassInfo] = useState<StudentClass | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [studentSummaries, setStudentSummaries] = useState<StudentMasterySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all analytics data
  const loadAnalytics = useCallback(async () => {
    if (!classId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load class info
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();
      
      if (classError) throw classError;
      
      const classRecord: StudentClass = {
        id: classData.id,
        graphId: classData.graph_id,
        name: classData.name,
        teacherId: classData.teacher_id,
        createdAt: new Date(classData.created_at),
      };
      setClassInfo(classRecord);
      
      // Load students in class
      const { data: studentsData, error: studentsError } = await supabase
        .from('class_students')
        .select('*')
        .eq('class_id', classId);
      
      if (studentsError) throw studentsError;
      
      const studentRecords: ClassStudent[] = (studentsData || []).map(s => ({
        id: s.id,
        classId: s.class_id,
        studentId: s.student_id,
        studentName: s.student_name,
        enrolledAt: new Date(s.enrolled_at),
      }));
      setStudents(studentRecords);
      
      // Load mastery data for all students in this graph
      const studentIds = studentRecords.map(s => s.studentId);
      
      if (studentIds.length === 0) {
        setAnalytics({
          classId,
          className: classRecord.name,
          totalStudents: 0,
          averageMasteryBySkill: {},
          atRiskStudents: [],
          weakSpots: [],
        });
        setStudentSummaries([]);
        return;
      }
      
      const { data: masteryData, error: masteryError } = await supabase
        .from('student_kp_mastery')
        .select('*')
        .eq('graph_id', classRecord.graphId)
        .in('student_id', studentIds);
      
      if (masteryError) throw masteryError;
      
      // Group mastery by student
      const masteryByStudent = new Map<string, KPMastery[]>();
      (masteryData || []).forEach(m => {
        const record: KPMastery = {
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
        };
        
        const existing = masteryByStudent.get(m.student_id) || [];
        existing.push(record);
        masteryByStudent.set(m.student_id, existing);
      });
      
      // Compute summaries using rawMastery directly (no retention decay)
      const summaries: StudentMasterySummary[] = [];
      const allRecords: KPMastery[] = [];
      
      for (const student of studentRecords) {
        const records = masteryByStudent.get(student.studentId) || [];
        allRecords.push(...records);
        
        summaries.push({
          studentId: student.studentId,
          studentName: student.studentName,
          overallMastery: calculateOverallMastery(records),
          masteredKPs: records.filter(m => m.rawMastery >= 0.8).length,
          agingKPs: 0,
          expiredKPs: 0,
          totalKPs: records.length,
        });
      }
      
      setStudentSummaries(summaries);
      
      // Calculate class-level analytics
      const skillMastery = new Map<string, number[]>();
      allRecords.forEach(m => {
        const existing = skillMastery.get(m.skillId) || [];
        existing.push(m.rawMastery);
        skillMastery.set(m.skillId, existing);
      });
      
      const averageMasteryBySkill: Record<string, number> = {};
      const weakSpots: ClassAnalytics['weakSpots'] = [];
      
      for (const [skillId, values] of skillMastery) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        averageMasteryBySkill[skillId] = avg;
        
        const below50 = values.filter(v => v < 0.5).length;
        if (avg < 0.6) {
          weakSpots.push({
            skillId,
            skillName: skillId, // Would need skill names from graph
            averageMastery: avg,
            studentsBelow50: below50,
          });
        }
      }
      
      // Identify at-risk students (below 50% overall)
      const atRiskStudents = summaries
        .filter(s => s.overallMastery < 0.5)
        .map(s => ({
          studentId: s.studentId,
          studentName: s.studentName,
          averageMastery: s.overallMastery,
        }));
      
      setAnalytics({
        classId,
        className: classRecord.name,
        totalStudents: studentRecords.length,
        averageMasteryBySkill,
        atRiskStudents,
        weakSpots: weakSpots.sort((a, b) => a.averageMastery - b.averageMastery),
      });
      
    } catch (err) {
      console.error('Error loading class analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  // Get analytics for a specific skill
  const getSkillAnalytics = useCallback((skillId: string) => {
    if (!analytics) {
      return { averageMastery: 0, studentsAbove80: 0, studentsBelow50: 0 };
    }
    
    const avg = analytics.averageMasteryBySkill[skillId] ?? 0;
    const weakSpot = analytics.weakSpots.find(w => w.skillId === skillId);
    
    return {
      averageMastery: avg,
      studentsAbove80: analytics.totalStudents - (weakSpot?.studentsBelow50 ?? 0),
      studentsBelow50: weakSpot?.studentsBelow50 ?? 0,
    };
  }, [analytics]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && classId) {
      loadAnalytics();
    }
  }, [autoLoad, classId, loadAnalytics]);

  return {
    classInfo,
    students,
    analytics,
    studentSummaries,
    loading,
    error,
    loadAnalytics,
    getSkillAnalytics,
  };
}
