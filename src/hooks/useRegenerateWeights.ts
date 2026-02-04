// Hook for regenerating graph weights (primary skills and skill weights)

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RegenerateProgress {
  phase: 'idle' | 'loading' | 'analyzing' | 'updating' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

interface UseRegenerateWeightsReturn {
  progress: RegenerateProgress;
  regenerate: (graphId: string) => Promise<boolean>;
  isRegenerating: boolean;
}

const BATCH_SIZE = 20; // Process questions in batches

export function useRegenerateWeights(): UseRegenerateWeightsReturn {
  const [progress, setProgress] = useState<RegenerateProgress>({
    phase: 'idle',
    current: 0,
    total: 0,
    message: '',
  });

  const regenerate = useCallback(async (graphId: string): Promise<boolean> => {
    if (!graphId) return false;

    try {
      // Phase 1: Load questions
      setProgress({ phase: 'loading', current: 0, total: 0, message: 'Loading questions...' });

      const { data: questions, error: loadError } = await supabase
        .from('questions')
        .select('id, question_text, skills')
        .eq('graph_id', graphId);

      if (loadError) throw loadError;
      if (!questions || questions.length === 0) {
        toast({
          title: 'No questions found',
          description: 'This graph has no questions to regenerate.',
          variant: 'destructive',
        });
        setProgress({ phase: 'idle', current: 0, total: 0, message: '' });
        return false;
      }

      const total = questions.length;
      setProgress({ phase: 'analyzing', current: 0, total, message: `Analyzing ${total} questions...` });

      // Process in batches
      const batches: Array<typeof questions> = [];
      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        batches.push(questions.slice(i, i + BATCH_SIZE));
      }

      const allResults: Record<string, { primarySkills: string[]; skillWeights: Record<string, number> }> = {};

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        const processed = batchIdx * BATCH_SIZE;
        
        setProgress({
          phase: 'analyzing',
          current: processed,
          total,
          message: `Analyzing batch ${batchIdx + 1}/${batches.length} (${batch.length} questions)...`,
        });

        // Call edge function
        const { data, error } = await supabase.functions.invoke('regenerate-weights', {
          body: {
            questions: batch.map(q => ({
              id: q.id,
              questionText: q.question_text,
              skills: q.skills || [],
            })),
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        // Merge results
        Object.assign(allResults, data);

        // Small delay between batches to avoid rate limits
        if (batchIdx < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Phase 3: Update database
      setProgress({ phase: 'updating', current: 0, total, message: 'Updating database...' });

      let updated = 0;
      for (const [questionId, weights] of Object.entries(allResults)) {
        const { error: updateError } = await supabase
          .from('questions')
          .update({
            primary_skills: weights.primarySkills?.slice(0, 2) || [],
            skill_weights: weights.skillWeights || {},
          })
          .eq('id', questionId);

        if (updateError) {
          console.error(`Failed to update question ${questionId}:`, updateError);
        } else {
          updated++;
        }

        setProgress({
          phase: 'updating',
          current: updated,
          total,
          message: `Updated ${updated}/${total} questions...`,
        });
      }

      setProgress({ phase: 'complete', current: total, total, message: 'Regeneration complete!' });

      toast({
        title: 'Weights regenerated',
        description: `Updated primary skills and weights for ${updated} questions.`,
      });

      // Reset after a delay
      setTimeout(() => {
        setProgress({ phase: 'idle', current: 0, total: 0, message: '' });
      }, 2000);

      return true;
    } catch (error) {
      console.error('Regeneration error:', error);
      setProgress({
        phase: 'error',
        current: 0,
        total: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      toast({
        title: 'Regeneration failed',
        description: error instanceof Error ? error.message : 'Failed to regenerate weights.',
        variant: 'destructive',
      });

      return false;
    }
  }, []);

  return {
    progress,
    regenerate,
    isRegenerating: progress.phase !== 'idle' && progress.phase !== 'complete' && progress.phase !== 'error',
  };
}
