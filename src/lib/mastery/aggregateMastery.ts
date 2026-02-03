// Utility functions for aggregating mastery at topic and subtopic levels

import type { SkillTopic, SkillSubtopic, AggregatedMastery } from '@/types/grouping';
import type { KPMastery } from '@/types/mastery';

/**
 * Calculate aggregated mastery for a subtopic
 * Uses weighted average based on maxPoints (practice volume)
 */
export function calculateSubtopicMastery(
  subtopicId: string,
  skillMastery: Map<string, KPMastery>,
  skillToSubtopic: Map<string, string>
): AggregatedMastery {
  // Find skills in this subtopic
  const skillsInSubtopic = [...skillToSubtopic.entries()]
    .filter(([_, stId]) => stId === subtopicId)
    .map(([skillId]) => skillId);

  let totalMaxPoints = 0;
  let totalEarnedPoints = 0;
  let masteredCount = 0;

  for (const skillId of skillsInSubtopic) {
    const mastery = skillMastery.get(skillId);
    if (mastery) {
      totalMaxPoints += mastery.maxPoints;
      totalEarnedPoints += mastery.earnedPoints;
      
      // Consider mastered if effective mastery >= 80%
      const effectiveMastery = mastery.effectiveMastery ?? mastery.rawMastery;
      if (effectiveMastery >= 0.8) {
        masteredCount++;
      }
    }
  }

  return {
    mastery: totalMaxPoints > 0 ? totalEarnedPoints / totalMaxPoints : 0,
    skillCount: skillsInSubtopic.length,
    masteredCount,
    totalMaxPoints,
    totalEarnedPoints,
  };
}

/**
 * Calculate aggregated mastery for a topic
 * Uses weighted average of subtopic masteries based on their maxPoints
 */
export function calculateTopicMastery(
  topicId: string,
  subtopics: SkillSubtopic[],
  subtopicMasteryMap: Map<string, AggregatedMastery>
): AggregatedMastery {
  // Find subtopics in this topic
  const subtopicsInTopic = subtopics.filter(st => st.topicId === topicId);

  let totalMaxPoints = 0;
  let totalEarnedPoints = 0;
  let totalSkillCount = 0;
  let totalMasteredCount = 0;

  for (const subtopic of subtopicsInTopic) {
    const subtopicMastery = subtopicMasteryMap.get(subtopic.id);
    if (subtopicMastery) {
      totalMaxPoints += subtopicMastery.totalMaxPoints;
      totalEarnedPoints += subtopicMastery.totalEarnedPoints;
      totalSkillCount += subtopicMastery.skillCount;
      totalMasteredCount += subtopicMastery.masteredCount;
    }
  }

  return {
    mastery: totalMaxPoints > 0 ? totalEarnedPoints / totalMaxPoints : 0,
    skillCount: totalSkillCount,
    masteredCount: totalMasteredCount,
    totalMaxPoints,
    totalEarnedPoints,
  };
}

/**
 * Calculate mastery for all subtopics and topics at once
 */
export function calculateAllGroupMastery(
  topics: SkillTopic[],
  subtopics: SkillSubtopic[],
  skillMastery: Map<string, KPMastery>,
  skillToSubtopic: Map<string, string>
): {
  subtopicMastery: Map<string, AggregatedMastery>;
  topicMastery: Map<string, AggregatedMastery>;
  ungroupedMastery: AggregatedMastery;
} {
  // Calculate subtopic mastery
  const subtopicMastery = new Map<string, AggregatedMastery>();
  for (const subtopic of subtopics) {
    const mastery = calculateSubtopicMastery(subtopic.id, skillMastery, skillToSubtopic);
    subtopicMastery.set(subtopic.id, mastery);
  }

  // Calculate topic mastery
  const topicMastery = new Map<string, AggregatedMastery>();
  for (const topic of topics) {
    const mastery = calculateTopicMastery(topic.id, subtopics, subtopicMastery);
    topicMastery.set(topic.id, mastery);
  }

  // Calculate ungrouped skills mastery
  const groupedSkillIds = new Set(skillToSubtopic.keys());
  let ungroupedMaxPoints = 0;
  let ungroupedEarnedPoints = 0;
  let ungroupedCount = 0;
  let ungroupedMasteredCount = 0;

  for (const [skillId, mastery] of skillMastery.entries()) {
    if (!groupedSkillIds.has(skillId)) {
      ungroupedMaxPoints += mastery.maxPoints;
      ungroupedEarnedPoints += mastery.earnedPoints;
      ungroupedCount++;
      
      const effectiveMastery = mastery.effectiveMastery ?? mastery.rawMastery;
      if (effectiveMastery >= 0.8) {
        ungroupedMasteredCount++;
      }
    }
  }

  const ungroupedMastery: AggregatedMastery = {
    mastery: ungroupedMaxPoints > 0 ? ungroupedEarnedPoints / ungroupedMaxPoints : 0,
    skillCount: ungroupedCount,
    masteredCount: ungroupedMasteredCount,
    totalMaxPoints: ungroupedMaxPoints,
    totalEarnedPoints: ungroupedEarnedPoints,
  };

  return {
    subtopicMastery,
    topicMastery,
    ungroupedMastery,
  };
}

/**
 * Format mastery percentage for display
 */
export function formatMasteryPercent(mastery: number): string {
  return `${Math.round(mastery * 100)}%`;
}

/**
 * Get mastery color class based on percentage
 */
export function getMasteryColorClass(mastery: number): string {
  if (mastery >= 0.8) return 'text-green-600 dark:text-green-400';
  if (mastery >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
  if (mastery >= 0.4) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}
