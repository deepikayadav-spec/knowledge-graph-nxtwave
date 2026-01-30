import { useState, useMemo, useCallback } from 'react';
import { GraphCanvas } from './graph/GraphCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { QuestionPathSelector } from './panels/QuestionPathSelector';
import { QuickQuestionInput } from './panels/QuickQuestionInput';
import { GraphManagerPanel } from './panels/GraphManagerPanel';
import { KnowledgeGraph, QuestionPath } from '@/types/graph';
import { mergeGraphs } from '@/lib/graph/mergeGraphs';
import { useGraphPersistence } from '@/hooks/useGraphPersistence';

// Helper to get path array from either format (backward compatible)
const getPathArray = (path: QuestionPath | string[]): string[] => {
  if (Array.isArray(path)) {
    return path;
  }
  return path.executionOrder || path.requiredNodes || [];
};

import { Network, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  // Graph persistence
  const {
    savedGraphs,
    currentGraphId,
    setCurrentGraphId,
    isLoading: isPersistenceLoading,
    isSaving,
    saveGraph,
    loadGraph,
    deleteGraph,
  } = useGraphPersistence();

  // Clear graph and start fresh
  const handleClearGraph = useCallback(() => {
    setGraph(null);
    setSelectedNodeId(null);
    setSelectedQuestion(null);
    setCurrentGraphId(null);
    toast({
      title: "Graph cleared",
      description: "You can start building a new knowledge graph.",
    });
  }, [setCurrentGraphId]);

  // Save current graph
  const handleSaveGraph = useCallback(async (name: string, description?: string) => {
    if (!graph) return;
    await saveGraph(graph, name, description, currentGraphId || undefined);
  }, [graph, currentGraphId, saveGraph]);

  // Load a saved graph
  const handleLoadGraph = useCallback(async (graphId: string) => {
    const loadedGraph = await loadGraph(graphId);
    if (loadedGraph) {
      setGraph(loadedGraph);
      setSelectedNodeId(null);
      setSelectedQuestion(null);
    }
  }, [loadGraph]);

  // Delete a graph
  const handleDeleteGraph = useCallback(async (graphId: string) => {
    const success = await deleteGraph(graphId);
    if (success && graphId === currentGraphId) {
      setGraph(null);
      setSelectedNodeId(null);
      setSelectedQuestion(null);
    }
  }, [deleteGraph, currentGraphId]);

  const handleGenerate = useCallback(async (questions: string[]) => {
    setIsGenerating(true);
    
    // Start with existing graph nodes - will ACCUMULATE across batches
    let accumulatedNodes: {id: string; name: string; tier?: string; description?: string}[] = 
      graph?.globalNodes.map(n => ({
        id: n.id,
        name: n.name,
        tier: n.tier,
        description: n.description
      })) || [];
    
    try {
      const queue: string[][] = [];
      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        queue.push(questions.slice(i, i + BATCH_SIZE));
      }

      const deltaGraphs: KnowledgeGraph[] = [];

      while (queue.length) {
        const batch = queue.shift()!;

        const { data, error } = await supabase.functions.invoke('generate-graph', {
          body: { 
            questions: batch,
            // Send ACCUMULATED nodes including previous batches
            existingNodes: accumulatedNodes.length > 0 ? accumulatedNodes : undefined
          },
        });

        if (error) {
          const status = getInvokeHttpStatus(error);
          if (status === 413) {
            if (batch.length <= 1) {
              throw new Error(
                "One question is too large to process. Shorten that question or split it into smaller questions."
              );
            }

            const mid = Math.ceil(batch.length / 2);
            queue.unshift(batch.slice(mid));
            queue.unshift(batch.slice(0, mid));
            continue;
          }

          throw error;
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        const deltaGraph = normalizeGraphPayload(data);
        deltaGraphs.push(deltaGraph);
        
        // ACCUMULATE new nodes for next batch to prevent duplicates
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
      }

      // Merge all delta graphs from this batch
      const combinedDelta = deltaGraphs.length === 1 
        ? deltaGraphs[0] 
        : mergeGraphs(deltaGraphs);

      // Merge with existing graph (incremental) or use as new graph
      const newGraph = graph 
        ? mergeGraphs([graph, combinedDelta])
        : combinedDelta;

      setGraph(newGraph);
      setSelectedNodeId(null);
      setSelectedQuestion(null);
      
      const addedNodes = combinedDelta.globalNodes.length;
      const addedEdges = combinedDelta.edges.length;
      
      toast({
        title: graph ? "Graph updated!" : "Graph generated!",
        description: graph 
          ? `Added ${addedNodes} new skill${addedNodes !== 1 ? 's' : ''} and ${addedEdges} relationship${addedEdges !== 1 ? 's' : ''}. Total: ${newGraph.globalNodes.length} skills.`
          : `Created ${newGraph.globalNodes.length} skill nodes with ${newGraph.edges.length} relationships.`,
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
          ? "The AI response was too large. Try adding fewer questions at a time."
          : error instanceof Error
            ? error.message
            : "Failed to generate knowledge graph.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [graph]);

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
    const totalQuestions = Object.keys(graph.questionPaths).length;
    return { totalNodes, totalEdges, totalQuestions };
  }, [graph]);

  // Landing page - no graph yet
  if (!graph) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-accent-foreground">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  Knowledge Graph Engine
                  <Badge variant="secondary" className="text-xs font-normal">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Skill Taxonomy
                  </Badge>
                </h1>
              </div>
            </div>
            
            <GraphManagerPanel
              savedGraphs={savedGraphs}
              currentGraphId={currentGraphId}
              hasGraph={false}
              isLoading={isPersistenceLoading}
              isSaving={isSaving}
              onSave={handleSaveGraph}
              onLoad={handleLoadGraph}
              onDelete={handleDeleteGraph}
              onNew={handleClearGraph}
            />
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
                {savedGraphs.find(g => g.id === currentGraphId)?.name || 'Knowledge Graph'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {stats?.totalNodes} skills · {stats?.totalEdges} relationships · {stats?.totalQuestions} questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <QuestionPathSelector
              questions={graph.questionPaths}
              selectedQuestion={selectedQuestion}
              onQuestionSelect={setSelectedQuestion}
            />
            <GraphManagerPanel
              savedGraphs={savedGraphs}
              currentGraphId={currentGraphId}
              hasGraph={true}
              isLoading={isPersistenceLoading}
              isSaving={isSaving}
              onSave={handleSaveGraph}
              onLoad={handleLoadGraph}
              onDelete={handleDeleteGraph}
              onNew={handleClearGraph}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearGraph}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
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

          {/* Floating question input */}
          <div className="absolute top-4 left-4 w-80">
            <QuickQuestionInput
              onGenerate={handleGenerate}
              isLoading={isGenerating}
              isLandingMode={false}
            />
          </div>

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
