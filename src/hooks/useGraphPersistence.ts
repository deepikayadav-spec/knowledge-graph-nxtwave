import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KnowledgeGraph, GraphNode, GraphEdge } from '@/types/graph';
import { toast } from '@/hooks/use-toast';

export interface SavedGraphMeta {
  id: string;
  name: string;
  description: string | null;
  total_skills: number;
  total_questions: number;
  created_at: string;
  updated_at: string;
}

export function useGraphPersistence() {
  const [savedGraphs, setSavedGraphs] = useState<SavedGraphMeta[]>([]);
  const [currentGraphId, setCurrentGraphId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch list of saved graphs
  const fetchGraphs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_graphs')
        .select('id, name, description, total_skills, total_questions, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSavedGraphs(data || []);
    } catch (error) {
      console.error('Error fetching graphs:', error);
      toast({
        title: 'Failed to load graphs',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchGraphs();
  }, [fetchGraphs]);

  // Save graph to database
  const saveGraph = useCallback(async (
    graph: KnowledgeGraph,
    name: string,
    description?: string,
    existingId?: string
  ): Promise<string | null> => {
    setIsSaving(true);
    try {
      const questionCount = Object.keys(graph.questionPaths || {}).length;
      const skillCount = graph.globalNodes.length;

      let graphId = existingId;

      if (existingId) {
        // Update existing graph
        const { error: updateError } = await supabase
          .from('knowledge_graphs')
          .update({
            name,
            description: description || null,
            total_skills: skillCount,
            total_questions: questionCount,
          })
          .eq('id', existingId);

        if (updateError) throw updateError;

        // Delete existing skills, edges, and questions for this graph
        await Promise.all([
          supabase.from('skills').delete().eq('graph_id', existingId),
          supabase.from('skill_edges').delete().eq('graph_id', existingId),
          supabase.from('questions').delete().eq('graph_id', existingId),
        ]);
      } else {
        // Create new graph
        const { data: newGraph, error: createError } = await supabase
          .from('knowledge_graphs')
          .insert({
            name,
            description: description || null,
            total_skills: skillCount,
            total_questions: questionCount,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        graphId = newGraph.id;
      }

      if (!graphId) throw new Error('Failed to get graph ID');

      // Insert skills
      if (graph.globalNodes.length > 0) {
        const skillsToInsert = graph.globalNodes.map((node: GraphNode) => ({
          graph_id: graphId,
          skill_id: node.id,
          name: node.name,
          tier: node.tier || 'core',
          level: node.level,
          description: node.description || null,
          transferable_contexts: node.transferableContexts || [],
        }));

        const { error: skillsError } = await supabase
          .from('skills')
          .insert(skillsToInsert);

        if (skillsError) throw skillsError;
      }

      // Insert edges
      if (graph.edges.length > 0) {
        const edgesToInsert = graph.edges.map((edge: GraphEdge) => ({
          graph_id: graphId,
          from_skill: edge.from,
          to_skill: edge.to,
          relationship_type: edge.relationshipType || 'requires',
          reason: edge.reason || null,
        }));

        const { error: edgesError } = await supabase
          .from('skill_edges')
          .insert(edgesToInsert);

        if (edgesError) throw edgesError;
      }

      // Insert questions
      const questions = Object.entries(graph.questionPaths || {});
      if (questions.length > 0) {
        const questionsToInsert = questions.map(([text, path]) => {
          const skills = Array.isArray(path) ? path : path.requiredNodes || [];
          // Handle both legacy single primarySkill and new primarySkills array
          let primarySkills: string[] = [];
          if (Array.isArray(path)) {
            primarySkills = skills.length > 0 ? [skills[0]] : [];
          } else {
            const pathObj = path as any;
            if (Array.isArray(pathObj.primarySkills)) {
              primarySkills = pathObj.primarySkills;
            } else if (pathObj.primarySkill) {
              primarySkills = [pathObj.primarySkill];
            } else if (skills.length > 0) {
              primarySkills = [skills[0]];
            }
          }
          return {
            graph_id: graphId,
            question_text: text,
            skills,
            primary_skills: primarySkills.slice(0, 2), // Ensure max 2
            skill_weights: (path as any).skillWeights || {},
          };
        });

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      setCurrentGraphId(graphId);
      await fetchGraphs();

      toast({
        title: existingId ? 'Graph updated' : 'Graph saved',
        description: `"${name}" with ${skillCount} skills and ${questionCount} questions.`,
      });

      return graphId;
    } catch (error) {
      console.error('Error saving graph:', error);
      toast({
        title: 'Failed to save graph',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [fetchGraphs]);

  // Load graph from database
  const loadGraph = useCallback(async (graphId: string): Promise<KnowledgeGraph | null> => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [skillsRes, edgesRes, questionsRes] = await Promise.all([
        supabase.from('skills').select('*').eq('graph_id', graphId),
        supabase.from('skill_edges').select('*').eq('graph_id', graphId),
        supabase.from('questions').select('*').eq('graph_id', graphId),
      ]);

      if (skillsRes.error) throw skillsRes.error;
      if (edgesRes.error) throw edgesRes.error;
      if (questionsRes.error) throw questionsRes.error;

      // Transform skills to GraphNode format
      const globalNodes: GraphNode[] = (skillsRes.data || []).map((skill: any) => ({
        id: skill.skill_id,
        name: skill.name,
        level: skill.level,
        description: skill.description,
        tier: skill.tier,
        transferableContexts: skill.transferable_contexts || [],
        knowledgePoint: {
          atomicityCheck: `Transferable skill: ${skill.name}`,
          assessmentExample: '',
          targetAssessmentLevel: 3 as const,
          appearsInQuestions: [],
        },
        cme: {
          measured: false,
          highestConceptLevel: 0,
          levelLabels: ['Recognition', 'Recall (simple)', 'Recall (complex)', 'Direct application'],
          independence: 'Unknown' as const,
          retention: 'Unknown' as const,
          evidenceByLevel: {},
        },
        le: {
          estimated: true,
          estimatedMinutes: 15,
        },
      }));

      // Transform edges
      const edges: GraphEdge[] = (edgesRes.data || []).map((edge: any) => ({
        from: edge.from_skill,
        to: edge.to_skill,
        reason: edge.reason || '',
        relationshipType: edge.relationship_type || 'requires',
      }));

      // Transform questions to questionPaths
      const questionPaths: Record<string, any> = {};
      (questionsRes.data || []).forEach((q: any) => {
        questionPaths[q.question_text] = {
          requiredNodes: q.skills || [],
          executionOrder: q.skills || [],
          validationStatus: 'valid',
          primarySkills: q.primary_skills || [],
          skillWeights: q.skill_weights || {},
        };
        // Update appearsInQuestions for each skill
        (q.skills || []).forEach((skillId: string) => {
          const node = globalNodes.find(n => n.id === skillId);
          if (node) {
            node.knowledgePoint.appearsInQuestions.push(q.question_text);
          }
        });
      });

      setCurrentGraphId(graphId);

      const loadedGraph: KnowledgeGraph = {
        globalNodes,
        edges,
        courses: { Default: { nodes: globalNodes.map(n => ({ id: n.id, inCourse: true })) } },
        questionPaths,
      };

      toast({
        title: 'Graph loaded',
        description: `${globalNodes.length} skills, ${edges.length} relationships, ${Object.keys(questionPaths).length} questions.`,
      });

      return loadedGraph;
    } catch (error) {
      console.error('Error loading graph:', error);
      toast({
        title: 'Failed to load graph',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete graph
  const deleteGraph = useCallback(async (graphId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('knowledge_graphs')
        .delete()
        .eq('id', graphId);

      if (error) throw error;

      if (currentGraphId === graphId) {
        setCurrentGraphId(null);
      }

      await fetchGraphs();

      toast({
        title: 'Graph deleted',
        description: 'The graph has been permanently removed.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting graph:', error);
      toast({
        title: 'Failed to delete graph',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return false;
    }
  }, [currentGraphId, fetchGraphs]);

  // Copy graph
  const copyGraph = useCallback(async (sourceGraphId: string, newName: string): Promise<string | null> => {
    setIsSaving(true);
    try {
      // Load the source graph first
      const [skillsRes, edgesRes, questionsRes, graphRes] = await Promise.all([
        supabase.from('skills').select('*').eq('graph_id', sourceGraphId),
        supabase.from('skill_edges').select('*').eq('graph_id', sourceGraphId),
        supabase.from('questions').select('*').eq('graph_id', sourceGraphId),
        supabase.from('knowledge_graphs').select('*').eq('id', sourceGraphId).single(),
      ]);

      if (skillsRes.error) throw skillsRes.error;
      if (edgesRes.error) throw edgesRes.error;
      if (questionsRes.error) throw questionsRes.error;
      if (graphRes.error) throw graphRes.error;

      const sourceGraph = graphRes.data;

      // Create new graph
      const { data: newGraph, error: createError } = await supabase
        .from('knowledge_graphs')
        .insert({
          name: newName,
          description: sourceGraph.description,
          total_skills: sourceGraph.total_skills,
          total_questions: sourceGraph.total_questions,
        })
        .select('id')
        .single();

      if (createError) throw createError;
      const newGraphId = newGraph.id;

      // Copy skills
      if (skillsRes.data && skillsRes.data.length > 0) {
        const skillsToInsert = skillsRes.data.map((skill: any) => ({
          graph_id: newGraphId,
          skill_id: skill.skill_id,
          name: skill.name,
          tier: skill.tier,
          level: skill.level,
          description: skill.description,
          transferable_contexts: skill.transferable_contexts,
        }));

        const { error: skillsError } = await supabase
          .from('skills')
          .insert(skillsToInsert);

        if (skillsError) throw skillsError;
      }

      // Copy edges
      if (edgesRes.data && edgesRes.data.length > 0) {
        const edgesToInsert = edgesRes.data.map((edge: any) => ({
          graph_id: newGraphId,
          from_skill: edge.from_skill,
          to_skill: edge.to_skill,
          relationship_type: edge.relationship_type,
          reason: edge.reason,
        }));

        const { error: edgesError } = await supabase
          .from('skill_edges')
          .insert(edgesToInsert);

        if (edgesError) throw edgesError;
      }

      // Copy questions
      if (questionsRes.data && questionsRes.data.length > 0) {
        const questionsToInsert = questionsRes.data.map((q: any) => ({
          graph_id: newGraphId,
          question_text: q.question_text,
          skills: q.skills,
          primary_skills: q.primary_skills || [],
          skill_weights: q.skill_weights || {},
        }));

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      await fetchGraphs();

      toast({
        title: 'Graph copied',
        description: `Created "${newName}" with ${sourceGraph.total_skills} skills.`,
      });

      return newGraphId;
    } catch (error) {
      console.error('Error copying graph:', error);
      toast({
        title: 'Failed to copy graph',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [fetchGraphs]);

  return {
    savedGraphs,
    currentGraphId,
    setCurrentGraphId,
    isLoading,
    isSaving,
    fetchGraphs,
    saveGraph,
    loadGraph,
    deleteGraph,
    copyGraph,
  };
}
