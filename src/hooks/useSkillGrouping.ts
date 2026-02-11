// Hook for CRUD operations on skill topics and subtopics

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SkillTopic, SkillSubtopic } from '@/types/grouping';
import { toast } from 'sonner';

interface UseSkillGroupingOptions {
  graphId: string;
  autoLoad?: boolean;
}

export function useSkillGrouping({ graphId, autoLoad = true }: UseSkillGroupingOptions) {
  const [topics, setTopics] = useState<SkillTopic[]>([]);
  const [subtopics, setSubtopics] = useState<SkillSubtopic[]>([]);
  const [skillSubtopicMap, setSkillSubtopicMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  // Load all groupings for the graph
  const loadGroupings = useCallback(async () => {
    if (!graphId) return;
    setLoading(true);

    try {
      // Fetch topics
      const { data: topicsData, error: topicsError } = await supabase
        .from('skill_topics')
        .select('*')
        .eq('graph_id', graphId)
        .order('display_order', { ascending: true });

      if (topicsError) throw topicsError;

      // Fetch subtopics
      const { data: subtopicsData, error: subtopicsError } = await supabase
        .from('skill_subtopics')
        .select('*')
        .eq('graph_id', graphId)
        .order('display_order', { ascending: true });

      if (subtopicsError) throw subtopicsError;

      // Fetch skill-subtopic mappings
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('skill_id, subtopic_id')
        .eq('graph_id', graphId)
        .not('subtopic_id', 'is', null);

      if (skillsError) throw skillsError;

      // Transform to app types
      const transformedTopics: SkillTopic[] = (topicsData || []).map(t => ({
        id: t.id,
        graphId: t.graph_id,
        name: t.name,
        color: t.color,
        displayOrder: t.display_order,
        createdAt: t.created_at,
      }));

      const transformedSubtopics: SkillSubtopic[] = (subtopicsData || []).map(st => ({
        id: st.id,
        graphId: st.graph_id,
        topicId: st.topic_id,
        name: st.name,
        color: st.color,
        displayOrder: st.display_order,
        createdAt: st.created_at,
      }));

      // Build skill -> subtopic map
      const skillMap = new Map<string, string>();
      (skillsData || []).forEach(s => {
        if (s.subtopic_id) {
          skillMap.set(s.skill_id, s.subtopic_id);
        }
      });

      setTopics(transformedTopics);
      setSubtopics(transformedSubtopics);
      setSkillSubtopicMap(skillMap);
    } catch (error) {
      console.error('Failed to load groupings:', error);
      toast.error('Failed to load skill groupings');
    } finally {
      setLoading(false);
    }
  }, [graphId]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && graphId) {
      loadGroupings();
    }
  }, [autoLoad, graphId, loadGroupings]);

  // Create a new subtopic with assigned skills
  const createSubtopic = useCallback(async (
    name: string,
    color: string,
    skillIds: string[]
  ): Promise<SkillSubtopic | null> => {
    if (!graphId) return null;

    try {
      // Get the next display order
      const maxOrder = subtopics.reduce((max, st) => Math.max(max, st.displayOrder), -1);

      // Insert subtopic
      const { data: newSubtopic, error: subtopicError } = await supabase
        .from('skill_subtopics')
        .insert({
          graph_id: graphId,
          name,
          color,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (subtopicError) throw subtopicError;

      // Update skills to reference this subtopic
      if (skillIds.length > 0) {
        const { error: updateError } = await supabase
          .from('skills')
          .update({ subtopic_id: newSubtopic.id })
          .eq('graph_id', graphId)
          .in('skill_id', skillIds);

        if (updateError) throw updateError;
      }

      // Update local state
      const transformed: SkillSubtopic = {
        id: newSubtopic.id,
        graphId: newSubtopic.graph_id,
        topicId: newSubtopic.topic_id,
        name: newSubtopic.name,
        color: newSubtopic.color,
        displayOrder: newSubtopic.display_order,
        createdAt: newSubtopic.created_at,
      };

      setSubtopics(prev => [...prev, transformed]);
      
      // Update skill map
      const newMap = new Map(skillSubtopicMap);
      skillIds.forEach(id => newMap.set(id, newSubtopic.id));
      setSkillSubtopicMap(newMap);

      toast.success(`Created subtopic "${name}" with ${skillIds.length} skills`);
      return transformed;
    } catch (error) {
      console.error('Failed to create subtopic:', error);
      toast.error('Failed to create subtopic');
      return null;
    }
  }, [graphId, subtopics, skillSubtopicMap]);

  // Create a new topic
  const createTopic = useCallback(async (
    name: string,
    color: string
  ): Promise<SkillTopic | null> => {
    if (!graphId) return null;

    try {
      const maxOrder = topics.reduce((max, t) => Math.max(max, t.displayOrder), -1);

      const { data: newTopic, error } = await supabase
        .from('skill_topics')
        .insert({
          graph_id: graphId,
          name,
          color,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      const transformed: SkillTopic = {
        id: newTopic.id,
        graphId: newTopic.graph_id,
        name: newTopic.name,
        color: newTopic.color,
        displayOrder: newTopic.display_order,
        createdAt: newTopic.created_at,
      };

      setTopics(prev => [...prev, transformed]);
      toast.success(`Created topic "${name}"`);
      return transformed;
    } catch (error) {
      console.error('Failed to create topic:', error);
      toast.error('Failed to create topic');
      return null;
    }
  }, [graphId, topics]);

  // Assign subtopic to a topic
  const assignSubtopicToTopic = useCallback(async (
    subtopicId: string,
    topicId: string | null
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('skill_subtopics')
        .update({ topic_id: topicId })
        .eq('id', subtopicId);

      if (error) throw error;

      setSubtopics(prev =>
        prev.map(st =>
          st.id === subtopicId ? { ...st, topicId } : st
        )
      );

      return true;
    } catch (error) {
      console.error('Failed to assign subtopic to topic:', error);
      toast.error('Failed to update subtopic');
      return false;
    }
  }, []);

  // Assign a skill to a subtopic
  const assignSkillToSubtopic = useCallback(async (
    skillId: string,
    subtopicId: string | null
  ): Promise<boolean> => {
    if (!graphId) return false;

    try {
      const { error } = await supabase
        .from('skills')
        .update({ subtopic_id: subtopicId })
        .eq('graph_id', graphId)
        .eq('skill_id', skillId);

      if (error) throw error;

      // Update local map
      const newMap = new Map(skillSubtopicMap);
      if (subtopicId) {
        newMap.set(skillId, subtopicId);
      } else {
        newMap.delete(skillId);
      }
      setSkillSubtopicMap(newMap);

      return true;
    } catch (error) {
      console.error('Failed to assign skill to subtopic:', error);
      toast.error('Failed to update skill');
      return false;
    }
  }, [graphId, skillSubtopicMap]);

  // Remove skill from its subtopic
  const removeSkillFromSubtopic = useCallback(async (skillId: string): Promise<boolean> => {
    return assignSkillToSubtopic(skillId, null);
  }, [assignSkillToSubtopic]);

  // Delete a subtopic (skills become ungrouped)
  const deleteSubtopic = useCallback(async (subtopicId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('skill_subtopics')
        .delete()
        .eq('id', subtopicId);

      if (error) throw error;

      setSubtopics(prev => prev.filter(st => st.id !== subtopicId));
      
      // Remove skills from map that were in this subtopic
      const newMap = new Map(skillSubtopicMap);
      for (const [skillId, stId] of newMap.entries()) {
        if (stId === subtopicId) {
          newMap.delete(skillId);
        }
      }
      setSkillSubtopicMap(newMap);

      toast.success('Subtopic deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete subtopic:', error);
      toast.error('Failed to delete subtopic');
      return false;
    }
  }, [skillSubtopicMap]);

  // Delete a topic (subtopics become ungrouped)
  const deleteTopic = useCallback(async (topicId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('skill_topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      setTopics(prev => prev.filter(t => t.id !== topicId));
      
      // Ungroup subtopics that belonged to this topic
      setSubtopics(prev =>
        prev.map(st =>
          st.topicId === topicId ? { ...st, topicId: null } : st
        )
      );

      toast.success('Topic deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete topic:', error);
      toast.error('Failed to delete topic');
      return false;
    }
  }, []);

  // Update subtopic
  const updateSubtopic = useCallback(async (
    subtopicId: string,
    updates: Partial<Pick<SkillSubtopic, 'name' | 'color'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('skill_subtopics')
        .update(updates)
        .eq('id', subtopicId);

      if (error) throw error;

      setSubtopics(prev =>
        prev.map(st =>
          st.id === subtopicId ? { ...st, ...updates } : st
        )
      );

      return true;
    } catch (error) {
      console.error('Failed to update subtopic:', error);
      toast.error('Failed to update subtopic');
      return false;
    }
  }, []);

  // Update topic
  const updateTopic = useCallback(async (
    topicId: string,
    updates: Partial<Pick<SkillTopic, 'name' | 'color'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('skill_topics')
        .update(updates)
        .eq('id', topicId);

      if (error) throw error;

      setTopics(prev =>
        prev.map(t =>
          t.id === topicId ? { ...t, ...updates } : t
        )
      );

      return true;
    } catch (error) {
      console.error('Failed to update topic:', error);
      toast.error('Failed to update topic');
      return false;
    }
  }, []);

  // Get subtopic for a skill
  const getSubtopicForSkill = useCallback((skillId: string): SkillSubtopic | null => {
    const subtopicId = skillSubtopicMap.get(skillId);
    if (!subtopicId) return null;
    return subtopics.find(st => st.id === subtopicId) || null;
  }, [skillSubtopicMap, subtopics]);

  // Get skills for a subtopic
  const getSkillsInSubtopic = useCallback((subtopicId: string): string[] => {
    const skills: string[] = [];
    for (const [skillId, stId] of skillSubtopicMap.entries()) {
      if (stId === subtopicId) {
        skills.push(skillId);
      }
    }
    return skills;
  }, [skillSubtopicMap]);

  // Get subtopics for a topic
  const getSubtopicsInTopic = useCallback((topicId: string): SkillSubtopic[] => {
    return subtopics.filter(st => st.topicId === topicId);
  }, [subtopics]);

  // Get ungrouped subtopics (not in any topic)
  const getUngroupedSubtopics = useCallback((): SkillSubtopic[] => {
    return subtopics.filter(st => !st.topicId);
  }, [subtopics]);

  // Get ungrouped skills (not in any subtopic)
  const getUngroupedSkillIds = useCallback((allSkillIds: string[]): string[] => {
    return allSkillIds.filter(id => !skillSubtopicMap.has(id));
  }, [skillSubtopicMap]);

  // Auto-group skills using curriculum map via edge function
  const autoGroupSkills = useCallback(async (): Promise<boolean> => {
    if (!graphId) return false;
    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-group-skills`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ graph_id: graphId }),
        }
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Auto-grouping failed');

      if (result.skipped) {
        toast.info(result.message || 'Groupings already exist');
      } else {
        toast.success(`Created ${result.topicsCreated} topics, mapped ${result.skillsMapped} skills`);
      }

      // Reload groupings from DB
      await loadGroupings();
      return true;
    } catch (error) {
      console.error('Failed to auto-group skills:', error);
      toast.error('Failed to auto-group skills');
      return false;
    } finally {
      setLoading(false);
    }
  }, [graphId, loadGroupings]);

  return {
    topics,
    subtopics,
    skillSubtopicMap,
    loading,
    loadGroupings,
    createSubtopic,
    createTopic,
    assignSubtopicToTopic,
    assignSkillToSubtopic,
    removeSkillFromSubtopic,
    deleteSubtopic,
    deleteTopic,
    updateSubtopic,
    updateTopic,
    getSubtopicForSkill,
    getSkillsInSubtopic,
    getSubtopicsInTopic,
    getUngroupedSubtopics,
    getUngroupedSkillIds,
    autoGroupSkills,
  };
}
