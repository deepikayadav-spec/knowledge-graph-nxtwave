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

const AI_BATCH_SIZE = 20; // Questions per AI call
const DB_BATCH_SIZE = 10; // Parallel DB updates

export function useRegenerateWeights(): UseRegenerateWeightsReturn {
  const [progress, setProgress] = useState<RegenerateProgress>({
    phase: 'idle',
    current: 0,
    total: 0,
    message: '',
  });

  const regenerate = useCallback(async (graphId: string): Promise<boolean> => {
    if (!graphId) return false;

    console.log(`[useRegenerateWeights] ===== Starting regeneration for graph: ${graphId} =====`);

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

      // Build a set of valid question IDs for validation
      const validIds = new Set(questions.map(q => q.id));

      const total = questions.length;
      console.log(`[useRegenerateWeights] Loaded ${total} questions for graph ${graphId}`);
      setProgress({ phase: 'analyzing', current: 0, total, message: `Analyzing ${total} questions...` });

      // Phase 2: Process in AI batches
      const batches: Array<typeof questions> = [];
      for (let i = 0; i < questions.length; i += AI_BATCH_SIZE) {
        batches.push(questions.slice(i, i + AI_BATCH_SIZE));
      }

      const allResults: Record<string, { skillWeights: Record<string, number> }> = {};
      let failedBatches = 0;
      let lastError = '';

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
          console.log(`[useRegenerateWeights] Sending batch ${batchIdx + 1}/${batches.length} with ${batch.length} questions`);
          const { data, error } = await supabase.functions.invoke('regenerate-weights', {
            body: {
              questions: batch.map(q => ({
                id: q.id,
                questionText: q.question_text,
                skills: q.skills || [],
              })),
            },
          });

          if (error) {
            console.error(`[useRegenerateWeights] Batch ${batchIdx + 1} invoke error:`, error);
            failedBatches++;
            lastError = error.message || String(error);
            continue;
          }
          if (data?.error) {
            console.error(`[useRegenerateWeights] Batch ${batchIdx + 1} returned error:`, data.error);
            failedBatches++;
            lastError = data.error;
            continue;
          }

          // Log version marker
          if (data?._version) {
            console.log(`[useRegenerateWeights] Function version: ${data._version}`);
          }

          // Remove version marker before processing
          const batchResults = { ...data };
          delete batchResults._version;

          // Validate returned IDs against known question IDs
          let validCount = 0;
          let invalidCount = 0;
          for (const key of Object.keys(batchResults)) {
            if (validIds.has(key)) {
              validCount++;
            } else {
              console.warn(`[useRegenerateWeights] ⚠️ INVALID ID from edge function: "${key}" — not in question set!`);
              delete batchResults[key];
              invalidCount++;
            }
          }

          console.log(`[useRegenerateWeights] Batch ${batchIdx + 1}/${batches.length}: ${validCount} valid, ${invalidCount} invalid IDs`);
          Object.assign(allResults, batchResults);
        } catch (batchError) {
          console.error(`[useRegenerateWeights] Batch ${batchIdx + 1} exception:`, batchError);
          failedBatches++;
          lastError = batchError instanceof Error ? batchError.message : String(batchError);
        }

        // Delay between AI batches
        if (batchIdx < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Check results
      const totalResults = Object.keys(allResults).length;
      console.log(`[useRegenerateWeights] AI analysis complete: ${totalResults} results from ${batches.length} batches (${failedBatches} failed)`);

      if (totalResults === 0) {
        throw new Error(`All ${batches.length} batches failed. Last error: ${lastError || 'Unknown'}`);
      }

      // Phase 3: Batch database updates with row-count verification
      setProgress({ phase: 'updating', current: 0, total: totalResults, message: 'Updating database...' });

      const entries = Object.entries(allResults);
      let updated = 0;
      let updateErrors = 0;
      let zeroRowUpdates = 0;

      for (let i = 0; i < entries.length; i += DB_BATCH_SIZE) {
        const dbBatch = entries.slice(i, i + DB_BATCH_SIZE);

        const results = await Promise.all(
          dbBatch.map(([questionId, weights]) =>
            supabase
              .from('questions')
              .update({
                skill_weights: weights.skillWeights || {},
              })
              .eq('id', questionId)
              .select('id')
              .then(({ data, error }) => {
                if (error) {
                  console.error(`[useRegenerateWeights] DB error for ${questionId}:`, error.message);
                  return false;
                }
                if (!data || data.length === 0) {
                  console.error(`[useRegenerateWeights] ⚠️ ZERO ROWS updated for ${questionId} — ID not found in DB!`);
                  return false;
                }
                return true;
              })
          )
        );

        const batchSuccess = results.filter(Boolean).length;
        const batchFail = results.length - batchSuccess;
        updated += batchSuccess;
        updateErrors += batchFail;

        setProgress({
          phase: 'updating',
          current: updated,
          total: totalResults,
          message: `Updated ${updated}/${totalResults} questions...`,
        });
      }

      console.log(`[useRegenerateWeights] DB update complete: ${updated} succeeded, ${updateErrors} failed (${zeroRowUpdates} zero-row updates)`);

      setProgress({ phase: 'complete', current: totalResults, total: totalResults, message: 'Regeneration complete!' });

      const skipped = total - totalResults;
      const skippedMsg = skipped > 0 ? ` (${skipped} skipped due to AI errors)` : '';
      const errorMsg = updateErrors > 0 ? `, ${updateErrors} DB update failures` : '';

      toast({
        title: 'Weights regenerated',
        description: `Updated weights for ${updated} questions${skippedMsg}${errorMsg}.`,
      });

      setTimeout(() => {
        setProgress({ phase: 'idle', current: 0, total: 0, message: '' });
      }, 2000);

      return true;
    } catch (error) {
      console.error('[useRegenerateWeights] Fatal error:', error);
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
