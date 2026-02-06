// Hook for regenerating question difficulty scores using AI analysis

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RegenerateProgress {
  phase: 'idle' | 'loading' | 'analyzing' | 'updating' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

interface DifficultyResult {
  cognitiveComplexity: number;
  taskStructure: number;
  algorithmicDemands: number;
  scopeIntegration: number;
  rawPoints: number;
  weightageMultiplier: number;
}

interface UseRegenerateDifficultyReturn {
  progress: RegenerateProgress;
  regenerate: (graphId: string) => Promise<boolean>;
  isRegenerating: boolean;
}

const BATCH_SIZE = 15; // Slightly smaller batches for more detailed analysis

export function useRegenerateDifficulty(): UseRegenerateDifficultyReturn {
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
        .select('id, question_text')
        .eq('graph_id', graphId);

      if (loadError) throw loadError;
      if (!questions || questions.length === 0) {
        toast({
          title: 'No questions found',
          description: 'This graph has no questions to analyze.',
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

      const allResults: Record<string, DifficultyResult> = {};

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
        const { data, error } = await supabase.functions.invoke('analyze-difficulty', {
          body: {
            questions: batch.map(q => ({
              id: q.id,
              questionText: q.question_text,
            })),
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        // Merge results
        Object.assign(allResults, data);

        // Small delay between batches to avoid rate limits
        if (batchIdx < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Phase 3: Update database
      setProgress({ phase: 'updating', current: 0, total, message: 'Updating database...' });

      let updated = 0;
      for (const [questionId, difficulty] of Object.entries(allResults)) {
        const { error: updateError } = await supabase
          .from('questions')
          .update({
            cognitive_complexity: difficulty.cognitiveComplexity,
            task_structure: difficulty.taskStructure,
            algorithmic_demands: difficulty.algorithmicDemands,
            scope_integration: difficulty.scopeIntegration,
            weightage_multiplier: difficulty.weightageMultiplier,
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

      setProgress({ phase: 'complete', current: total, total, message: 'Analysis complete!' });

      // Calculate distribution for toast message
      const distribution = { basic: 0, intermediate: 0, advanced: 0, expert: 0 };
      for (const result of Object.values(allResults)) {
        if (result.weightageMultiplier === 1.0) distribution.basic++;
        else if (result.weightageMultiplier === 1.5) distribution.intermediate++;
        else if (result.weightageMultiplier === 2.0) distribution.advanced++;
        else distribution.expert++;
      }

      toast({
        title: 'Difficulty analysis complete',
        description: `Updated ${updated} questions: ${distribution.basic} Basic, ${distribution.intermediate} Intermediate, ${distribution.advanced} Advanced, ${distribution.expert} Expert`,
      });

      // Reset after a delay
      setTimeout(() => {
        setProgress({ phase: 'idle', current: 0, total: 0, message: '' });
      }, 2000);

      return true;
    } catch (error) {
      console.error('Difficulty regeneration error:', error);
      setProgress({
        phase: 'error',
        current: 0,
        total: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze difficulty.',
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
