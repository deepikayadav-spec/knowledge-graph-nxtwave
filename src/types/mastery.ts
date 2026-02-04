// Student Mastery Tracking Types

// Independence levels for attempts
export type IndependenceLevel = 'independent' | 'lightly_scaffolded' | 'heavily_assisted';

// Retention status based on decay
export type RetentionStatus = 'current' | 'aging' | 'expired';

// Student attempt record
export interface StudentAttempt {
  id: string;
  graphId: string;
  classId?: string;
  studentId: string;
  questionId: string;
  isCorrect: boolean;
  independenceLevel: IndependenceLevel;
  attemptedAt: Date;
}

// Knowledge Point mastery for a student
export interface KPMastery {
  id?: string;
  graphId: string;
  studentId: string;
  skillId: string;
  earnedPoints: number;
  maxPoints: number;
  rawMastery: number;           // earned/max (0-1)
  lastReviewedAt: Date | null;
  stability: number;            // Memory strength (starts at 1.0)
  retrievalCount: number;       // Successful recalls
  // Computed fields (not stored in DB)
  retentionFactor?: number;     // Current decay (0-1)
  effectiveMastery?: number;    // rawMastery * retention
  retentionStatus?: RetentionStatus;
}

// Class/cohort for grouping students
export interface StudentClass {
  id: string;
  graphId: string;
  name: string;
  teacherId?: string;
  createdAt: Date;
}

// Student enrollment in a class
export interface ClassStudent {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  enrolledAt: Date;
}

// Question with skill weights
export interface QuestionWithWeights {
  id: string;
  graphId: string;
  questionText: string;
  skills: string[];
  primarySkills: string[];  // Up to 2 primary knowledge points
  skillWeights: Record<string, number>;
}

// Bulk upload row from CSV
export interface BulkUploadRow {
  studentId: string;
  studentName: string;
  questionText: string;
  isCorrect: boolean;
  independenceLevel: IndependenceLevel;
  attemptedAt: Date;
}

// Validation result for bulk upload
export interface BulkUploadValidation {
  valid: boolean;
  rows: BulkUploadRow[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
}

// Class analytics aggregate
export interface ClassAnalytics {
  classId: string;
  className: string;
  totalStudents: number;
  averageMasteryBySkill: Record<string, number>;
  atRiskStudents: Array<{
    studentId: string;
    studentName: string;
    averageMastery: number;
  }>;
  weakSpots: Array<{
    skillId: string;
    skillName: string;
    averageMastery: number;
    studentsBelow50: number;
  }>;
}

// Student mastery summary
export interface StudentMasterySummary {
  studentId: string;
  studentName: string;
  overallMastery: number;
  masteredKPs: number;        // >= 80% effective mastery
  agingKPs: number;           // 50-80% retention
  expiredKPs: number;         // < 50% retention
  totalKPs: number;
}
