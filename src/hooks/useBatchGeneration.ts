import { useState, useCallback, useRef } from 'react';
import { KnowledgeGraph, GraphNode, CME, LE, KnowledgePoint } from '@/types/graph';
import { mergeGraphs } from '@/lib/graph/mergeGraphs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { extractCoreQuestion } from '@/lib/question/extractCore';

// Adaptive batch sizing based on existing node count
const BASE_BATCH_SIZE = 5;
const MIN_BATCH_SIZE = 3;
const DELAY_BETWEEN_BATCHES_MS = 2000;

// Turbo mode constants
const TURBO_BATCH_SIZE = 5;
const TURBO_CONCURRENCY = 1;
const TURBO_DELAY_MS = 4000;
const TURBO_QUESTION_THRESHOLD = 30;
const EXISTING_NODES_CAP = 80;

/**
 * Parse Topic: headers from question list.
 */
function parseTopicHeaders(questions: string[]): {
  cleanQuestions: string[];
  topicMap: Record<number, string>;
} {
  let currentTopic = 'General';
  const cleanQuestions: string[] = [];
  const topicMap: Record<number, string> = {};

  for (const q of questions) {
    const topicMatch = q.match(/^Topic\s*:\s*(.+)/im);
    if (topicMatch) {
      currentTopic = topicMatch[1].trim();
      const cleaned = q.replace(/^Topic\s*:.+\n?/im, '').trim();
      if (cleaned) {
        topicMap[cleanQuestions.length] = currentTopic;
        cleanQuestions.push(cleaned);
      }
    } else {
      topicMap[cleanQuestions.length] = currentTopic;
      cleanQuestions.push(q);
    }
  }
  return { cleanQuestions, topicMap };
}

function getAdaptiveBatchSize(existingNodeCount: number): number {
  if (existingNodeCount > 50) return MIN_BATCH_SIZE;
  if (existingNodeCount > 20) return 4;
  if (existingNodeCount > 10) return 5;
  return BASE_BATCH_SIZE;
}

const LOCAL_STORAGE_KEY = 'kg-generation-checkpoint';

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  skillsDiscovered: number;
  estimatedTimeRemaining: string;
  isProcessing: boolean;
  concurrentBatches?: number;
}

interface Checkpoint {
  questions: string[];
  processedBatches: number;
  accumulatedNodes: { id: string; name: string; tier?: string; description?: string }[];
  partialGraph: KnowledgeGraph | null;
  existingGraph: KnowledgeGraph | null;
  timestamp: number;
  turbo?: boolean;
  topicMap?: Record<number, string>;
}

// Default values for missing node fields
const DEFAULT_CME: CME = {
  measured: false,
  highestConceptLevel: 0,
  levelLabels: ['Recognition', 'Recall (simple)', 'Recall (complex)', 'Direct application'],
  independence: 'Unknown',
  retention: 'Unknown',
  evidenceByLevel: {},
};

const DEFAULT_LE: LE = {
  estimated: true,
  estimatedMinutes: 20,
};

const DEFAULT_KNOWLEDGE_POINT: KnowledgePoint = {
  atomicityCheck: 'Auto-generated skill',
  assessmentExample: '',
  targetAssessmentLevel: 3,
  appearsInQuestions: [],
};

function normalizeNode(node: Partial<GraphNode> & { id: string; name: string }): GraphNode {
  return {
    ...node,
    id: node.id,
    name: node.name,
    level: node.level ?? 0,
    description: node.description ?? '',
    tier: node.tier ?? 'core',
    knowledgePoint: {
      ...DEFAULT_KNOWLEDGE_POINT,
      ...node.knowledgePoint,
    },
    cme: {
      ...DEFAULT_CME,
      ...node.cme,
    },
    le: {
      ...DEFAULT_LE,
      ...node.le,
    },
    transferableContexts: node.transferableContexts ?? [],
  };
}

function normalizeGraphPayload(data: any): KnowledgeGraph {
  const rawNodes = data?.globalNodes || [];
  return {
    globalNodes: rawNodes.map((n: any) => normalizeNode(n)),
    edges: data?.edges || [],
    courses: data?.courses || {},
    questionPaths: data?.questionPaths || {},
    ipaByQuestion: undefined,
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

/**
 * Auto-classify questions into curriculum topics using AI
 */
async function autoClassifyQuestions(
  questions: string[],
  domain: string
): Promise<Record<number, string>> {
  console.log(`[Turbo] Auto-classifying ${questions.length} questions for domain: ${domain}`);
  
  const { data, error } = await supabase.functions.invoke('classify-questions', {
    body: { questions, domain },
  });

  if (error) {
    console.error('[Turbo] Classification failed:', error);
    throw new Error('Auto-classification failed: ' + (error.message || 'Unknown error'));
  }

  if (data?.error) {
    throw new Error('Auto-classification failed: ' + data.error);
  }

  const topicMap = data?.topicMap || {};
  console.log(`[Turbo] Classified ${Object.keys(topicMap).length} questions into topics`);
  return topicMap;
}

/**
 * Cap existingNodes to most recent entries to prevent payload bloat
 */
function capExistingNodes(
  nodes: { id: string; name: string; tier?: string; description?: string }[]
): { id: string; name: string; tier?: string; description?: string }[] | undefined {
  if (nodes.length === 0) return undefined;
  if (nodes.length <= EXISTING_NODES_CAP) return nodes;
  return nodes.slice(-EXISTING_NODES_CAP);
}

export function useBatchGeneration(
  existingGraph: KnowledgeGraph | null,
  onGraphUpdate: (graph: KnowledgeGraph) => void,
  onGenerationComplete?: () => void
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

  const getCheckpoint = useCallback((): Checkpoint | null => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return null;
      const checkpoint = JSON.parse(stored) as Checkpoint;
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

  const checkDuplicateQuestions = useCallback(async (
    questions: string[],
    graphId?: string
  ): Promise<{ uniqueQuestions: string[]; duplicates: string[] }> => {
    if (!graphId || questions.length === 0) {
      return { uniqueQuestions: questions, duplicates: [] };
    }

    try {
      const { data: existingQuestions, error } = await supabase
        .from('questions')
        .select('question_text')
        .eq('graph_id', graphId);

      if (error) {
        console.warn('Failed to check for duplicates:', error);
        return { uniqueQuestions: questions, duplicates: [] };
      }

      const existingTexts = new Set(
        (existingQuestions || []).map(q => extractCoreQuestion(q.question_text))
      );

      const duplicates: string[] = [];
      const uniqueQuestions: string[] = [];

      for (const question of questions) {
        const coreQuestion = extractCoreQuestion(question);
        if (existingTexts.has(coreQuestion)) {
          duplicates.push(question);
        } else {
          uniqueQuestions.push(question);
        }
      }

      return { uniqueQuestions, duplicates };
    } catch (err) {
      console.warn('Error checking duplicates:', err);
      return { uniqueQuestions: questions, duplicates: [] };
    }
  }, []);

  /**
   * Call generate-graph for a single batch with retry logic
   */
  const callBatchGenerate = useCallback(async (
    batch: string[],
    batchTopicMap: Record<string, string>,
    accumulatedNodes: { id: string; name: string; tier?: string; description?: string }[],
    domain?: string
  ): Promise<any> => {
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const hasTopics = Object.values(batchTopicMap).some(t => t !== 'General');
        const cappedNodes = capExistingNodes(accumulatedNodes);
        
        const response = await supabase.functions.invoke('generate-graph', {
          body: {
            questions: batch,
            existingNodes: cappedNodes,
            ...(hasTopics ? { topicMap: batchTopicMap } : {}),
            ...(domain ? { domain } : {}),
          },
        });

        if (response.error) {
          const status = getInvokeHttpStatus(response.error);
          if (status === 429) {
            const waitTime = Math.pow(2, retries) * 30000;
            console.log(`Rate limited. Waiting ${waitTime / 1000}s before retry...`);
            await sleep(waitTime);
            retries++;
            continue;
          }
          if (status === 413 && batch.length > 1) {
            throw new Error("Batch too large. Try reducing batch size.");
          }
          throw response.error;
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        return response.data;
      } catch (err) {
        retries++;
        if (retries >= maxRetries) throw err;
        await sleep(5000);
      }
    }
  }, []);

  const generate = useCallback(async (
    questions: string[],
    resumeFromCheckpoint = false,
    graphId?: string,
    domain?: string,
    turbo?: boolean
  ) => {
    abortRef.current = false;
    batchStartTimeRef.current = Date.now();

    let checkpoint = resumeFromCheckpoint ? getCheckpoint() : null;

    // Parse topic headers from raw questions
    const { cleanQuestions: parsedQuestions, topicMap: globalTopicMap } = parseTopicHeaders(
      checkpoint?.questions || questions
    );

    // Auto-detect turbo mode for large question sets
    const isTurbo = turbo ?? (parsedQuestions.length > TURBO_QUESTION_THRESHOLD);
    
    // Check for duplicate questions
    let questionsToProcess = parsedQuestions;
    let topicMapToUse = checkpoint?.topicMap || globalTopicMap;

    if (!resumeFromCheckpoint && graphId) {
      const { uniqueQuestions, duplicates } = await checkDuplicateQuestions(parsedQuestions, graphId);

      if (duplicates.length > 0) {
        const truncatedList = duplicates.slice(0, 3).map(q => {
          const preview = q.split('\n')[0].substring(0, 50);
          return preview.length < q.split('\n')[0].length ? preview + '...' : preview;
        });
        const moreText = duplicates.length > 3 ? ` and ${duplicates.length - 3} more` : '';

        toast({
          title: `${duplicates.length} duplicate question(s) skipped`,
          description: `Already exists: ${truncatedList.join(', ')}${moreText}`,
          variant: "default",
        });
      }

      if (uniqueQuestions.length === 0) {
        toast({
          title: "No new questions",
          description: "All submitted questions already exist in the graph.",
          variant: "default",
        });
        return;
      }

      // Rebuild topic map for unique questions only
      const uniqueSet = new Set(uniqueQuestions);
      const newTopicMap: Record<number, string> = {};
      let idx = 0;
      for (let i = 0; i < parsedQuestions.length; i++) {
        if (uniqueSet.has(parsedQuestions[i])) {
          newTopicMap[idx] = globalTopicMap[i] || 'General';
          idx++;
        }
      }
      questionsToProcess = uniqueQuestions;
      topicMapToUse = newTopicMap;
    }

    // Auto-classify if turbo mode and no topic headers detected
    const hasRealTopics = Object.values(topicMapToUse).some(t => t !== 'General');
    if (isTurbo && !hasRealTopics && !checkpoint?.topicMap) {
      try {
        toast({
          title: "⚡ Turbo Mode: Classifying questions...",
          description: `Auto-detecting topics for ${questionsToProcess.length} questions. This takes ~30-60 seconds.`,
        });
        
        topicMapToUse = await autoClassifyQuestions(questionsToProcess, domain || 'python');
        
        toast({
          title: "✅ Classification complete",
          description: `Questions classified into curriculum topics. Starting parallel generation...`,
        });
      } catch (err) {
        console.warn('[Turbo] Classification failed, proceeding without topics:', err);
        toast({
          title: "Classification skipped",
          description: "Proceeding without topic classification. Generation will still work.",
          variant: "default",
        });
      }
    }

    // Initialize from checkpoint or fresh start
    let accumulatedNodes: { id: string; name: string; tier?: string; description?: string }[] =
      checkpoint?.accumulatedNodes ||
      existingGraph?.globalNodes.map(n => ({
        id: n.id,
        name: n.name,
        tier: n.tier,
        description: n.description
      })) || [];

    let partialGraph: KnowledgeGraph | null = checkpoint?.partialGraph || existingGraph;
    let processedBatches = checkpoint?.processedBatches || 0;

    // Calculate batch size
    const existingNodeCount = accumulatedNodes.length;
    const batchSize = isTurbo ? TURBO_BATCH_SIZE : getAdaptiveBatchSize(existingNodeCount);
    const delayMs = isTurbo ? TURBO_DELAY_MS : DELAY_BETWEEN_BATCHES_MS;
    const concurrency = isTurbo ? TURBO_CONCURRENCY : 1;
    
    console.log(`[BatchGeneration] Mode: ${isTurbo ? 'TURBO' : 'standard'}, batch size: ${batchSize}, concurrency: ${concurrency}`);

    // Create batches with topic maps
    const batches: string[][] = [];
    const batchTopicMaps: Record<string, string>[] = [];
    for (let i = 0; i < questionsToProcess.length; i += batchSize) {
      batches.push(questionsToProcess.slice(i, i + batchSize));
      const batchMap: Record<string, string> = {};
      for (let j = 0; j < batchSize && i + j < questionsToProcess.length; j++) {
        const globalIdx = i + j;
        if (topicMapToUse[globalIdx]) {
          batchMap[String(j)] = topicMapToUse[globalIdx];
        }
      }
      batchTopicMaps.push(batchMap);
    }

    const totalBatches = batches.length;

    setProgress({
      currentBatch: processedBatches,
      totalBatches,
      skillsDiscovered: accumulatedNodes.length - (existingGraph?.globalNodes.length || 0),
      estimatedTimeRemaining: 'Calculating...',
      isProcessing: true,
      concurrentBatches: concurrency,
    });

    try {
      if (isTurbo) {
        // ====== TURBO: Parallel wave processing ======
        const allRetryBatches: number[] = [];
        for (let waveStart = processedBatches; waveStart < batches.length; waveStart += concurrency) {
          if (abortRef.current) {
            toast({
              title: "Generation paused",
              description: `Progress saved. ${waveStart} of ${totalBatches} batches completed.`,
            });
            return;
          }

          const waveEnd = Math.min(waveStart + concurrency, batches.length);
          const waveBatchIndices = Array.from({ length: waveEnd - waveStart }, (_, i) => waveStart + i);

          // Update progress
          const elapsed = (Date.now() - batchStartTimeRef.current) / 1000;
          const completedWaves = Math.floor((waveStart - processedBatches) / concurrency);
          const avgTimePerWave = completedWaves > 0 ? elapsed / completedWaves : 20;
          const remainingWaves = Math.ceil((totalBatches - waveStart) / concurrency);

          setProgress({
            currentBatch: waveStart + 1,
            totalBatches,
            skillsDiscovered: accumulatedNodes.length - (existingGraph?.globalNodes.length || 0),
            estimatedTimeRemaining: formatTimeRemaining(avgTimePerWave * remainingWaves),
            isProcessing: true,
            concurrentBatches: waveBatchIndices.length,
          });

          // Fire all batches in this wave concurrently
          const waveStartTime = Date.now();
          const waveResults = await Promise.allSettled(
            waveBatchIndices.map(idx =>
              callBatchGenerate(batches[idx], batchTopicMaps[idx], accumulatedNodes, domain)
            )
          );

          // Check for rate limiting - if any batch got 429, back off entire wave
          let hasRateLimit = false;
          let waveSucceeded = 0;
          let waveFailed = 0;

          for (let j = 0; j < waveResults.length; j++) {
            const result = waveResults[j];
            if (result.status === 'fulfilled' && result.value) {
              waveSucceeded++;
              const deltaGraph = normalizeGraphPayload(result.value);
              partialGraph = partialGraph
                ? mergeGraphs([partialGraph, deltaGraph])
                : deltaGraph;

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
            } else if (result.status === 'rejected') {
              waveFailed++;
              const errMsg = result.reason?.message || '';
              if (errMsg.includes('429') || errMsg.includes('rate')) {
                hasRateLimit = true;
              }
              console.error(`[Turbo] Batch ${waveBatchIndices[j]} failed:`, result.reason);
              // Push to global retry queue instead of retrying immediately
              allRetryBatches.push(waveBatchIndices[j]);
            }
          }

          const waveElapsed = ((Date.now() - waveStartTime) / 1000).toFixed(1);
          const waveNum = Math.floor((waveStart - processedBatches) / concurrency) + 1;
          console.log(`[Turbo] Wave ${waveNum} completed in ${waveElapsed}s (${waveSucceeded} succeeded, ${waveFailed} failed)`);

          // Update UI after each wave
          if (partialGraph) {
            onGraphUpdate(partialGraph);
          }

          // Save checkpoint after each wave
          saveCheckpoint({
            questions: questionsToProcess,
            processedBatches: waveEnd,
            accumulatedNodes,
            partialGraph,
            existingGraph,
            timestamp: Date.now(),
            turbo: true,
            topicMap: topicMapToUse,
          });

          // Rate limit backoff
          if (hasRateLimit) {
            console.log('[Turbo] Rate limited, backing off 30s...');
            await sleep(30000);
          }

          // Delay between waves
          if (waveEnd < batches.length) {
            await sleep(delayMs);
          }
        }

        // ====== TURBO: Final retry wave for all failed batches (capped) ======
        const MAX_RETRY_BATCHES = 10;
        const failureRate = allRetryBatches.length / totalBatches;
        if (allRetryBatches.length > 0 && !abortRef.current) {
          if (failureRate > 0.5) {
            console.error(`[Turbo] ${allRetryBatches.length}/${totalBatches} batches failed (${(failureRate * 100).toFixed(0)}%). Skipping retry wave.`);
            toast({
              title: "High failure rate",
              description: `${allRetryBatches.length} of ${totalBatches} batches failed. The API may be overloaded. Try again later.`,
              variant: "destructive",
            });
          } else {
            const retrySlice = allRetryBatches.slice(0, MAX_RETRY_BATCHES);
            console.log(`[Turbo] Retrying ${retrySlice.length} failed batches (capped at ${MAX_RETRY_BATCHES})...`);
            const retryWaveStart = Date.now();
            const retryResults = await Promise.allSettled(
              retrySlice.map(idx =>
                callBatchGenerate(batches[idx], batchTopicMaps[idx], accumulatedNodes, domain)
              )
            );

            let retrySucceeded = 0;
            for (let j = 0; j < retryResults.length; j++) {
              const result = retryResults[j];
              if (result.status === 'fulfilled' && result.value) {
                retrySucceeded++;
                const deltaGraph = normalizeGraphPayload(result.value);
                partialGraph = partialGraph
                  ? mergeGraphs([partialGraph!, deltaGraph])
                  : deltaGraph;
                for (const node of deltaGraph.globalNodes) {
                  if (!accumulatedNodes.some(n => n.id === node.id)) {
                    accumulatedNodes.push({ id: node.id, name: node.name, tier: node.tier, description: node.description });
                  }
                }
              } else {
                console.error(`[Turbo] Final retry failed for batch ${retrySlice[j]}:`, (result as PromiseRejectedResult).reason);
              }
            }

            const retryElapsed = ((Date.now() - retryWaveStart) / 1000).toFixed(1);
            console.log(`[Turbo] Final retry wave completed in ${retryElapsed}s (${retrySucceeded}/${retrySlice.length} recovered)`);

            if (partialGraph) {
              onGraphUpdate(partialGraph);
            }
          }
        }
      } else {
        // ====== STANDARD: Sequential processing ======
        for (let i = processedBatches; i < batches.length; i++) {
          if (abortRef.current) {
            toast({
              title: "Generation paused",
              description: `Progress saved. ${i} of ${totalBatches} batches completed.`,
            });
            return;
          }

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

          let data;
          try {
            data = await callBatchGenerate(batches[i], batchTopicMaps[i], accumulatedNodes, domain);
          } catch (batchErr) {
            console.warn(`[Sequential] Batch ${i + 1}/${totalBatches} failed after retries, skipping:`, batchErr);
            toast({
              title: `Batch ${i + 1} skipped`,
              description: `Failed after 3 retries. Continuing with remaining batches.`,
              variant: "default",
            });
            // Save checkpoint and continue to next batch
            saveCheckpoint({
              questions: questionsToProcess,
              processedBatches: i + 1,
              accumulatedNodes,
              partialGraph,
              existingGraph,
              timestamp: Date.now(),
            });
            if (i < batches.length - 1) {
              await sleep(delayMs);
            }
            continue;
          }
          const deltaGraph = normalizeGraphPayload(data);

          partialGraph = partialGraph
            ? mergeGraphs([partialGraph, deltaGraph])
            : deltaGraph;

          onGraphUpdate(partialGraph);

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

          saveCheckpoint({
            questions: questionsToProcess,
            processedBatches: i + 1,
            accumulatedNodes,
            partialGraph,
            existingGraph,
            timestamp: Date.now(),
          });

          if (i < batches.length - 1) {
            await sleep(delayMs);
          }
        }
      }

      // All batches complete
      clearCheckpoint();

      const finalGraph = partialGraph!;
      const newSkillCount = finalGraph.globalNodes.length - (existingGraph?.globalNodes.length || 0);

      toast({
        title: existingGraph ? "Graph updated!" : "Graph generated!",
        description: `Added ${newSkillCount} skills. Total: ${finalGraph.globalNodes.length} skills, ${finalGraph.edges.length} relationships.${isTurbo ? ' ⚡ Turbo Mode' : ''}`,
      });

      onGenerationComplete?.();

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
  }, [existingGraph, onGraphUpdate, onGenerationComplete, getCheckpoint, saveCheckpoint, clearCheckpoint, checkDuplicateQuestions, callBatchGenerate]);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const resume = useCallback(async () => {
    const checkpoint = getCheckpoint();
    if (checkpoint) {
      await generate(checkpoint.questions, true, undefined, undefined, checkpoint.turbo);
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
