// Types for skill grouping hierarchy: Topic > Subtopic > KP

export interface SkillTopic {
  id: string;
  graphId: string;
  name: string;
  color: string;
  displayOrder: number;
  createdAt?: string;
}

export interface SkillSubtopic {
  id: string;
  graphId: string;
  topicId: string | null;
  name: string;
  color: string;
  displayOrder: number;
  createdAt?: string;
}

export interface GroupingEditState {
  isEditMode: boolean;
  selectedNodeIds: Set<string>;
  lassoStart: { x: number; y: number } | null;
  lassoEnd: { x: number; y: number } | null;
}

export interface AggregatedMastery {
  mastery: number;
  skillCount: number;
  masteredCount: number;
  totalMaxPoints: number;
  totalEarnedPoints: number;
}

export interface TopicScoreRange {
  id: string;
  graphId: string;
  topicId: string;
  topicName: string;
  minScore: number;
  maxScore: number;
  uniqueQuestions: number;
  updatedAt?: string;
}

// Color palette for subtopics/topics
export const GROUPING_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
] as const;
