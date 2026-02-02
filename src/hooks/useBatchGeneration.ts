import { useState, useCallback, useRef } from 'react';
import { KnowledgeGraph, GraphNode } from '@/types/graph';
import { mergeGraphs } from '@/lib/graph/mergeGraphs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 2000;
const LOCAL_STORAGE_KEY = 'kg-generation-checkpoint';

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  skillsDiscovered: number;
  estimatedTimeRemaining: string;
  isProcessing: boolean;
}

interface Checkpoint {
  questions: string[];
  processedBatches: number;
  accumulatedNodes: { id: string; name: string; tier?: string; description?: string }[];
  deltaGraphs: KnowledgeGraph[];
  existingGraph: KnowledgeGraph | null;
  timestamp: number;
}

function normalizeGraphPayload(data: any): KnowledgeGraph {
  return {
    globalNodes: data?.globalNodes || [],
    edges: data?.edges || [],
    courses: data?.courses || {},
    questionPaths: data?.questionPaths || {},
    ipaByQuestion: data?.ipaByQuestion || undefined,
  };
}

function getInvokeHttpStatus(err: unknown): number | undefined {
  const anyErr = err as any;
  return (
    anyErr?.context?.status ??
    anyErr?.status ??
    anyErr?.cause?.status ??
    anyErr?.cause?.context?.status
  );
}

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useBatchGeneration(
  existingGraph: KnowledgeGraph | null,
  onGraphUpdate: (graph: KnowledgeGraph) => void
) {
  const [progress, setProgress] = useState<BatchProgress>({
    currentBatch: 0,
    totalBatches: 0,
    skillsDiscovered: 0,
    estimatedTimeRemaining: '',
    isProcessing: false,
  });

  const abortRef = useRef(false);
  const batchStartTimeRef = useRef<number>(0);

  // Check for existing checkpoint
  const getCheckpoint = useCallback((): Checkpoint | null => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return null;
      const checkpoint = JSON.parse(stored) as Checkpoint;
      // Only use checkpoint if less than 1 hour old
      if (Date.now() - checkpoint.timestamp > 3600000) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return null;
      }
      return checkpoint;
    } catch {
      return null;
    }
  }, []);

  const saveCheckpoint = useCallback((checkpoint: Checkpoint) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(checkpoint));
    } catch (e) {
      console.warn('Failed to save checkpoint:', e);
    }
  }, []);

  const clearCheckpoint = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  const hasCheckpoint = useCallback(() => {
    return getCheckpoint() !== null;
  }, [getCheckpoint]);

  const generate = useCallback(async (
    questions: string[],
    resumeFromCheckpoint = false
  ) => {
    abortRef.current = false;
    batchStartTimeRef.current = Date.now();

    let checkpoint = resumeFromCheckpoint ? getCheckpoint() : null;
    
    // Initialize from checkpoint or fresh start
    let accumulatedNodes: { id: string; name: string; tier?: string; description?: string }[] = 
      checkpoint?.accumulatedNodes || 
      existingGraph?.globalNodes.map(n => ({
        id: n.id,
        name: n.name,
        tier: n.tier,
        description: n.description
      })) || [];

    const questionsToProcess = checkpoint?.questions || questions;
    const deltaGraphs: KnowledgeGraph[] = checkpoint?.deltaGraphs || [];
    let processedBatches = checkpoint?.processedBatches || 0;

    // Create batches
    const batches: string[][] = [];
    for (let i = 0; i < questionsToProcess.length; i += BATCH_SIZE) {
      batches.push(questionsToProcess.slice(i, i + BATCH_SIZE));
    }

    const totalBatches = batches.length;
    
    setProgress({
      currentBatch: processedBatches,
      totalBatches,
      skillsDiscovered: accumulatedNodes.length - (existingGraph?.globalNodes.length || 0),
      estimatedTimeRemaining: 'Calculating...',
      isProcessing: true,
    });

    try {
      for (let i = processedBatches; i < batches.length; i++) {
        if (abortRef.current) {
          toast({
            title: "Generation paused",
            description: `Progress saved. ${i} of ${totalBatches} batches completed.`,
          });
          return;
        }

        const batch = batches[i];
        const batchStartTime = Date.now();

        // Update progress
        const elapsed = (Date.now() - batchStartTimeRef.current) / 1000;
        const avgTimePerBatch = i > processedBatches ? elapsed / (i - processedBatches) : 15;
        const remaining = avgTimePerBatch * (totalBatches - i);

        setProgress({
          currentBatch: i + 1,
          totalBatches,
          skillsDiscovered: accumulatedNodes.length - (existingGraph?.globalNodes.length || 0),
          estimatedTimeRemaining: formatTimeRemaining(remaining),
          isProcessing: true,
        });

        // Call API with retry logic
        let retries = 0;
        const maxRetries = 3;
        let success = false;
        let data: any = null;

        while (!success && retries < maxRetries) {
          try {
            const response = await supabase.functions.invoke('generate-graph', {
              body: { 
                questions: batch,
                existingNodes: accumulatedNodes.length > 0 ? accumulatedNodes : undefined
              },
            });

            if (response.error) {
              const status = getInvokeHttpStatus(response.error);
              
              if (status === 429) {
                // Rate limit - exponential backoff
                const waitTime = Math.pow(2, retries) * 30000; // 30s, 60s, 120s
                console.log(`Rate limited. Waiting ${waitTime/1000}s before retry...`);
                await sleep(waitTime);
                retries++;
                continue;
              }
              
              if (status === 413 && batch.length > 1) {
                // Batch too large - this shouldn't happen with batch size 50
                // but handle gracefully by failing this batch
                throw new Error("Batch too large. Try with fewer questions.");
              }
              
              throw response.error;
            }

            if (response.data?.error) {
              throw new Error(response.data.error);
            }

            data = response.data;
            success = true;
          } catch (err) {
            retries++;
            if (retries >= maxRetries) throw err;
            await sleep(5000);
          }
        }

        // Process successful response
        const deltaGraph = normalizeGraphPayload(data);
        deltaGraphs.push(deltaGraph);

        // Accumulate nodes for next batch
        for (const node of deltaGraph.globalNodes) {
          if (!accumulatedNodes.some(n => n.id === node.id)) {
            accumulatedNodes.push({
              id: node.id,
              name: node.name,
              tier: node.tier,
              description: node.description
            });
          }
        }

        // Save checkpoint
        saveCheckpoint({
          questions: questionsToProcess,
          processedBatches: i + 1,
          accumulatedNodes,
          deltaGraphs,
          existingGraph,
          timestamp: Date.now(),
        });

        // Delay between batches (except last one)
        if (i < batches.length - 1) {
          await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
      }

      // All batches complete - merge and update
      const combinedDelta = deltaGraphs.length === 1 
        ? deltaGraphs[0] 
        : mergeGraphs(deltaGraphs);

      const newGraph = existingGraph 
        ? mergeGraphs([existingGraph, combinedDelta])
        : combinedDelta;

      onGraphUpdate(newGraph);
      clearCheckpoint();

      toast({
        title: existingGraph ? "Graph updated!" : "Graph generated!",
        description: `Created ${combinedDelta.globalNodes.length} skills with ${combinedDelta.edges.length} relationships. Total: ${newGraph.globalNodes.length} skills.`,
      });

    } catch (error) {
      console.error('Batch generation error:', error);
      
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate knowledge graph.",
        variant: "destructive",
      });
    } finally {
      setProgress(prev => ({ ...prev, isProcessing: false }));
    }
  }, [existingGraph, onGraphUpdate, getCheckpoint, saveCheckpoint, clearCheckpoint]);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const resume = useCallback(async () => {
    const checkpoint = getCheckpoint();
    if (checkpoint) {
      await generate(checkpoint.questions, true);
    }
  }, [generate, getCheckpoint]);

  return {
    generate,
    abort,
    resume,
    progress,
    hasCheckpoint,
    clearCheckpoint,
  };
}
