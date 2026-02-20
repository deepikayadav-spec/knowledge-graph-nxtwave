// Hierarchical view of topics > subtopics > KPs with mastery aggregation

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Circle, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { SkillTopic, SkillSubtopic, AggregatedMastery, TopicScoreRange } from '@/types/grouping';
import type { KPMastery } from '@/types/mastery';
import {
  calculateAllGroupMastery,
  formatMasteryPercent,
  getMasteryColorClass,
} from '@/lib/mastery/aggregateMastery';

interface HierarchicalMasteryViewProps {
  topics: SkillTopic[];
  subtopics: SkillSubtopic[];
  skillMastery: Map<string, KPMastery>;
  skillToSubtopic: Map<string, string>;
  skillNames: Record<string, string>;
  onCreateTopic: (name: string, color: string) => Promise<void>;
  onDeleteTopic: (topicId: string) => Promise<void>;
  onDeleteSubtopic: (subtopicId: string) => Promise<void>;
  onAssignSubtopicToTopic: (subtopicId: string, topicId: string | null) => Promise<void>;
  topicScoreRanges?: TopicScoreRange[];
}

export function HierarchicalMasteryView({
  topics,
  subtopics,
  skillMastery,
  skillToSubtopic,
  skillNames,
  onDeleteTopic,
  onDeleteSubtopic,
  onAssignSubtopicToTopic,
  topicScoreRanges = [],
}: HierarchicalMasteryViewProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());
  
  // Calculate all mastery values
  const { subtopicMastery, topicMastery, ungroupedMastery } = useMemo(() => {
    return calculateAllGroupMastery(topics, subtopics, skillMastery, skillToSubtopic);
  }, [topics, subtopics, skillMastery, skillToSubtopic]);

  // Get ungrouped subtopics (not in any topic)
  const ungroupedSubtopics = useMemo(() => {
    return subtopics.filter(st => !st.topicId);
  }, [subtopics]);

  // Get ungrouped skills (not in any subtopic)
  const ungroupedSkillIds = useMemo(() => {
    const grouped = new Set(skillToSubtopic.keys());
    return [...skillMastery.keys()].filter(id => !grouped.has(id));
  }, [skillMastery, skillToSubtopic]);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const toggleSubtopic = (subtopicId: string) => {
    setExpandedSubtopics(prev => {
      const next = new Set(prev);
      if (next.has(subtopicId)) {
        next.delete(subtopicId);
      } else {
        next.add(subtopicId);
      }
      return next;
    });
  };

  // Get skills in a subtopic
  const getSkillsInSubtopic = (subtopicId: string): string[] => {
    const skills: string[] = [];
    for (const [skillId, stId] of skillToSubtopic.entries()) {
      if (stId === subtopicId) {
        skills.push(skillId);
      }
    }
    return skills;
  };

  // Get subtopics in a topic
  const getSubtopicsInTopic = (topicId: string): SkillSubtopic[] => {
    return subtopics.filter(st => st.topicId === topicId);
  };

  const renderMasteryBadge = (mastery: AggregatedMastery | undefined, small = false) => {
    if (!mastery || mastery.skillCount === 0) {
      return (
        <Badge variant="outline" className={cn("text-muted-foreground", small && "text-xs px-1.5")}>
          --
        </Badge>
      );
    }

    return (
      <Badge 
        variant="secondary" 
        className={cn(
          getMasteryColorClass(mastery.mastery),
          small && "text-xs px-1.5"
        )}
      >
        {formatMasteryPercent(mastery.mastery)}
      </Badge>
    );
  };

  const renderSkillItem = (skillId: string) => {
    const mastery = skillMastery.get(skillId);
    const name = skillNames[skillId] || skillId;
    const effectiveMastery = mastery?.effectiveMastery ?? mastery?.rawMastery ?? 0;

    return (
      <div key={skillId} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
        <Circle className="h-2 w-2 text-muted-foreground" />
        <span className="flex-1 text-sm truncate" title={name}>
          {name}
        </span>
        <span className={cn("text-xs font-medium", getMasteryColorClass(effectiveMastery))}>
          {formatMasteryPercent(effectiveMastery)}
        </span>
      </div>
    );
  };

  const renderSubtopicItem = (subtopic: SkillSubtopic, inTopic = false) => {
    const isExpanded = expandedSubtopics.has(subtopic.id);
    const mastery = subtopicMastery.get(subtopic.id);
    const skills = getSkillsInSubtopic(subtopic.id);

    return (
      <div key={subtopic.id} className={cn("border-l-2", inTopic ? "ml-4" : "")} style={{ borderColor: subtopic.color }}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleSubtopic(subtopic.id)}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-2 py-2 px-2 hover:bg-muted/50 rounded-r transition-colors">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <div 
                className="w-3 h-3 rounded-full shrink-0" 
                style={{ backgroundColor: subtopic.color }}
              />
              <span className="flex-1 text-sm font-medium text-left truncate">
                {subtopic.name}
              </span>
              <Badge variant="outline" className="text-xs">
                {skills.length}
              </Badge>
              {renderMasteryBadge(mastery, true)}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pl-6 py-1">
              {skills.length > 0 ? (
                skills.map(skillId => renderSkillItem(skillId))
              ) : (
                <p className="text-xs text-muted-foreground py-2">No knowledge points in this subtopic</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const renderTopicItem = (topic: SkillTopic) => {
    const isExpanded = expandedTopics.has(topic.id);
    const mastery = topicMastery.get(topic.id);
    const topicSubtopics = getSubtopicsInTopic(topic.id);
    const scoreRange = topicScoreRanges.find(r => r.topicId === topic.id);

    return (
      <div key={topic.id} className="border rounded-lg overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={() => toggleTopic(topic.id)}>
          <CollapsibleTrigger asChild>
            <button 
              className="w-full flex items-center gap-2 py-2.5 px-3 hover:bg-muted/50 transition-colors"
              style={{ borderLeft: `4px solid ${topic.color}` }}
            >
              {isExpanded ? (
                <FolderOpen className="h-4 w-4" style={{ color: topic.color }} />
              ) : (
                <Folder className="h-4 w-4" style={{ color: topic.color }} />
              )}
              <span className="flex-1 font-medium text-left">
                {topic.name}
              </span>
              {scoreRange && scoreRange.maxScore > 0 && (
                <Badge variant="outline" className="text-xs">
                  Max: {scoreRange.maxScore} ({scoreRange.uniqueQuestions} Q)
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {topicSubtopics.length} subtopics
              </Badge>
              {renderMasteryBadge(mastery)}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-2 pt-0 space-y-1">
              {topicSubtopics.length > 0 ? (
                topicSubtopics.map(st => renderSubtopicItem(st, true))
              ) : (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  No subtopics assigned
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const hasAnyGroups = topics.length > 0 || subtopics.length > 0;

  if (!hasAnyGroups && ungroupedSkillIds.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No groupings yet</p>
        <p className="text-xs mt-1">
          Click "Edit Groups" to select knowledge points and create subtopics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topics */}
      {topics.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Topics
          </h4>
          <div className="space-y-2">
            {topics.map(topic => renderTopicItem(topic))}
          </div>
        </div>
      )}

      {/* Ungrouped Subtopics (not in any topic) */}
      {ungroupedSubtopics.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Subtopics
          </h4>
          <div className="space-y-1">
            {ungroupedSubtopics.map(st => renderSubtopicItem(st, false))}
          </div>
        </div>
      )}

      {/* Ungrouped Skills */}
      {ungroupedSkillIds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            Ungrouped Knowledge Points
            <Badge variant="outline" className="text-xs">
              {ungroupedSkillIds.length}
            </Badge>
            {ungroupedMastery.skillCount > 0 && renderMasteryBadge(ungroupedMastery, true)}
          </h4>
          <div className="max-h-48 overflow-y-auto border rounded-lg p-1">
            {ungroupedSkillIds.map(skillId => renderSkillItem(skillId))}
          </div>
        </div>
      )}
    </div>
  );
}
