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

const AI_BATCH_SIZE = 15; // Questions per AI call
const DB_BATCH_SIZE = 10; // Parallel DB updates

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
      console.log(`[useRegenerateDifficulty] Loaded ${total} questions for graph ${graphId}`);
      setProgress({ phase: 'analyzing', current: 0, total, message: `Analyzing ${total} questions...` });

      // Phase 2: Process in AI batches
      const batches: Array<typeof questions> = [];
      for (let i = 0; i < questions.length; i += AI_BATCH_SIZE) {
        batches.push(questions.slice(i, i + AI_BATCH_SIZE));
      }

      const allResults: Record<string, DifficultyResult> = {};
      let failedBatches = 0;

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        const processed = batchIdx * AI_BATCH_SIZE;

        setProgress({
          phase: 'analyzing',
          current: processed,
          total,
          message: `Analyzing batch ${batchIdx + 1}/${batches.length} (${batch.length} questions)...`,
        });

        try {
          const { data, error } = await supabase.functions.invoke('analyze-difficulty', {
            body: {
              questions: batch.map(q => ({
                id: q.id,
                questionText: q.question_text,
              })),
            },
          });

          if (error) {
            console.error(`[useRegenerateDifficulty] Batch ${batchIdx + 1} invoke error:`, error);
            failedBatches++;
            continue;
          }

          if (data?.error) {
            console.error(`[useRegenerateDifficulty] Batch ${batchIdx + 1} returned error:`, data.error);
            failedBatches++;
            continue;
          }

          const resultsCount = Object.keys(data || {}).length;
          console.log(`[useRegenerateDifficulty] Batch ${batchIdx + 1}/${batches.length}: got ${resultsCount} results`);
          Object.assign(allResults, data);
        } catch (batchError) {
          console.error(`[useRegenerateDifficulty] Batch ${batchIdx + 1} exception:`, batchError);
          failedBatches++;
        }

        // Delay between AI batches
        if (batchIdx < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Check results
      const totalResults = Object.keys(allResults).length;
      console.log(`[useRegenerateDifficulty] AI analysis complete: ${totalResults} results from ${batches.length} batches (${failedBatches} failed)`);

      if (totalResults === 0) {
        throw new Error(`All ${batches.length} batches failed. Check logs for details.`);
      }

      // Phase 3: Batch database updates
      setProgress({ phase: 'updating', current: 0, total: totalResults, message: 'Updating database...' });

      const entries = Object.entries(allResults);
      let updated = 0;
      let updateErrors = 0;

      for (let i = 0; i < entries.length; i += DB_BATCH_SIZE) {
        const dbBatch = entries.slice(i, i + DB_BATCH_SIZE);

        const results = await Promise.all(
          dbBatch.map(([questionId, difficulty]) =>
            supabase
              .from('questions')
              .update({
                cognitive_complexity: difficulty.cognitiveComplexity,
                task_structure: difficulty.taskStructure,
                algorithmic_demands: difficulty.algorithmicDemands,
                scope_integration: difficulty.scopeIntegration,
                weightage_multiplier: difficulty.weightageMultiplier,
              })
              .eq('id', questionId)
              .then(({ error }) => {
                if (error) {
                  console.error(`[useRegenerateDifficulty] Failed to update ${questionId}:`, error.message);
                  return false;
                }
                return true;
              })
          )
        );

        const batchSuccess = results.filter(Boolean).length;
        updated += batchSuccess;
        updateErrors += results.length - batchSuccess;

        setProgress({
          phase: 'updating',
          current: updated,
          total: totalResults,
          message: `Updated ${updated}/${totalResults} questions...`,
        });
      }

      console.log(`[useRegenerateDifficulty] DB update complete: ${updated} succeeded, ${updateErrors} failed`);

      setProgress({ phase: 'complete', current: totalResults, total: totalResults, message: 'Analysis complete!' });

      // Calculate distribution for toast
      const distribution = { basic: 0, intermediate: 0, advanced: 0, expert: 0 };
      for (const result of Object.values(allResults)) {
        if (result.weightageMultiplier === 1.0) distribution.basic++;
        else if (result.weightageMultiplier === 1.5) distribution.intermediate++;
        else if (result.weightageMultiplier === 2.0) distribution.advanced++;
        else distribution.expert++;
      }

      const skipped = total - totalResults;
      const skippedMsg = skipped > 0 ? ` (${skipped} skipped due to AI errors)` : '';
      const errorMsg = updateErrors > 0 ? `, ${updateErrors} DB failures` : '';

      toast({
        title: 'Difficulty analysis complete',
        description: `Updated ${updated} questions: ${distribution.basic} Basic, ${distribution.intermediate} Intermediate, ${distribution.advanced} Advanced, ${distribution.expert} Expert${skippedMsg}${errorMsg}`,
      });

      setTimeout(() => {
        setProgress({ phase: 'idle', current: 0, total: 0, message: '' });
      }, 2000);

      return true;
    } catch (error) {
      console.error('[useRegenerateDifficulty] Fatal error:', error);
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
