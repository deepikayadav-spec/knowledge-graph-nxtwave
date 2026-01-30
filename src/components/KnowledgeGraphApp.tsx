import { useState, useMemo, useCallback } from 'react';
import { GraphCanvas } from './graph/GraphCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { QuestionPathSelector } from './panels/QuestionPathSelector';
import { QuickQuestionInput } from './panels/QuickQuestionInput';
import { KnowledgeGraph, QuestionPath } from '@/types/graph';
import { mergeGraphs } from '@/lib/graph/mergeGraphs';

// Helper to get path array from either format (backward compatible)
const getPathArray = (path: QuestionPath | string[]): string[] => {
  if (Array.isArray(path)) {
    return path;
  }
  return path.executionOrder || path.requiredNodes || [];
};

import { Network, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const BATCH_SIZE = 5;

function getInvokeHttpStatus(err: unknown): number | undefined {
  const anyErr = err as any;
  return (
    anyErr?.context?.status ??
    anyErr?.status ??
    anyErr?.cause?.status ??
    anyErr?.cause?.context?.status
  );
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

export function KnowledgeGraphApp() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGraphGenerated = (newGraph: KnowledgeGraph) => {
    setGraph(newGraph);
    setSelectedNodeId(null);
    setSelectedQuestion(null);
  };

  const handleGenerate = useCallback(async (questions: string[]) => {
    setIsGenerating(true);
    
    try {
      // Split into smaller batches to prevent MAX_TOKENS truncation.
      // If a batch still triggers 413, automatically split it further (down to 1 question).
      const queue: string[][] = [];
      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        queue.push(questions.slice(i, i + BATCH_SIZE));
      }

      const graphs: KnowledgeGraph[] = [];

      while (queue.length) {
        const batch = queue.shift()!;

        const { data, error } = await supabase.functions.invoke('generate-graph', {
          body: { questions: batch },
        });

        if (error) {
          const status = getInvokeHttpStatus(error);
          if (status === 413) {
            if (batch.length <= 1) {
              throw new Error(
                "One question is too large to process (the model response gets truncated). Shorten that question or split it into smaller questions."
              );
            }

            const mid = Math.ceil(batch.length / 2);
            const left = batch.slice(0, mid);
            const right = batch.slice(mid);

            // Put the split batches back at the front so we keep making progress.
            // (unshift right first so left is processed next)
            queue.unshift(right);
            queue.unshift(left);
            continue;
          }

          throw error;
        }

        if (data?.error) {
          // Edge function sometimes returns { error: "..." } in a 200 response.
          throw new Error(data.error);
        }

        graphs.push(normalizeGraphPayload(data));
      }

      const newGraph = graphs.length === 1 ? graphs[0] : mergeGraphs(graphs);

      handleGraphGenerated(newGraph);
      
      toast({
        title: "Graph generated!",
        description: `Created ${newGraph.globalNodes.length} concept nodes with ${newGraph.edges.length} relationships.`,
      });
    } catch (error) {
      console.error('Graph generation error:', error);

      const status = getInvokeHttpStatus(error);
      const isTruncation =
        status === 413 ||
        (error instanceof Error && error.message.toLowerCase().includes('truncated'));

      toast({
        title: "Generation failed",
        description: isTruncation
          ? "The AI response was too large and got truncated. I’ll automatically split into smaller batches, but if a single question is huge you may need to shorten it."
          : error instanceof Error
            ? error.message
            : "Failed to generate knowledge graph.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const selectedNode = useMemo(
    () => graph?.globalNodes.find((n) => n.id === selectedNodeId) || null,
    [graph?.globalNodes, selectedNodeId]
  );

  const highlightedPath = useMemo(() => {
    if (!selectedQuestion || !graph?.questionPaths[selectedQuestion]) {
      return undefined;
    }
    return getPathArray(graph.questionPaths[selectedQuestion]);
  }, [selectedQuestion, graph?.questionPaths]);

  const stats = useMemo(() => {
    if (!graph) return null;
    const totalNodes = graph.globalNodes.length;
    const totalEdges = graph.edges.length;
    return { totalNodes, totalEdges };
  }, [graph]);

  // Landing page - no graph yet
  if (!graph) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container flex items-center justify-center h-16 px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-accent-foreground">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  Knowledge Graph Engine
                  <Badge variant="secondary" className="text-xs font-normal">
                    <Sparkles className="h-3 w-3 mr-1" />
                    IPA Methodology
                  </Badge>
                </h1>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-8">
          <QuickQuestionInput
            onGenerate={handleGenerate}
            isLoading={isGenerating}
            isLandingMode={true}
          />
        </div>
      </div>
    );
  }

  // Graph view
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-accent-foreground">
              <Network className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Knowledge Graph
              </h1>
              <p className="text-xs text-muted-foreground">
                {stats?.totalNodes} concepts · {stats?.totalEdges} relationships
              </p>
            </div>
          </div>

          <QuestionPathSelector
            questions={graph.questionPaths}
            selectedQuestion={selectedQuestion}
            onQuestionSelect={setSelectedQuestion}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Area */}
        <div className="flex-1 relative">
          <GraphCanvas
            nodes={graph.globalNodes}
            edges={graph.edges}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            highlightedPath={highlightedPath}
          />

          {/* Floating info when path is selected */}
          {highlightedPath && (
            <div className="absolute bottom-4 left-4 panel-glass px-4 py-2 animate-fade-in">
              <div className="text-xs text-muted-foreground mb-1">
                Question Path
              </div>
              <div className="flex items-center gap-1 text-sm">
                {highlightedPath.map((nodeId, idx) => {
                  const node = graph.globalNodes.find((n) => n.id === nodeId);
                  return (
                    <span key={nodeId} className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedNodeId(nodeId)}
                        className="px-2 py-0.5 rounded bg-accent/10 hover:bg-accent/20 text-accent font-medium text-xs transition-colors"
                      >
                        {node?.name.split(' ').slice(0, 3).join(' ')}...
                      </button>
                      {idx < highlightedPath.length - 1 && (
                        <span className="text-muted-foreground">→</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedNode && (
          <div className="shrink-0 p-4">
            <NodeDetailPanel
              node={selectedNode}
              edges={graph.edges}
              allNodes={graph.globalNodes}
              onClose={() => setSelectedNodeId(null)}
              onNodeSelect={setSelectedNodeId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
