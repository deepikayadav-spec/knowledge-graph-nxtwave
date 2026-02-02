import { useState, useMemo, useCallback } from 'react';
import { GraphCanvas } from './graph/GraphCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { QuestionPathSelector } from './panels/QuestionPathSelector';
import { QuickQuestionInput } from './panels/QuickQuestionInput';
import { GraphManagerPanel } from './panels/GraphManagerPanel';
import { GenerationProgress } from './panels/GenerationProgress';
import { KnowledgeGraph, QuestionPath } from '@/types/graph';
import { useGraphPersistence } from '@/hooks/useGraphPersistence';
import { useBatchGeneration } from '@/hooks/useBatchGeneration';
import { Network, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Helper to get path array from either format (backward compatible)
const getPathArray = (path: QuestionPath | string[]): string[] => {
  if (Array.isArray(path)) {
    return path;
  }
  return path.executionOrder || path.requiredNodes || [];
};

export function KnowledgeGraphApp() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

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

  // Batch generation with progress tracking
  const handleGraphUpdate = useCallback((newGraph: KnowledgeGraph) => {
    setGraph(newGraph);
    setSelectedNodeId(null);
    setSelectedQuestion(null);
  }, []);

  const {
    generate,
    abort,
    resume,
    progress,
    hasCheckpoint,
    clearCheckpoint,
  } = useBatchGeneration(graph, handleGraphUpdate);

  // Clear graph and start fresh
  const handleClearGraph = useCallback(() => {
    setGraph(null);
    setSelectedNodeId(null);
    setSelectedQuestion(null);
    setCurrentGraphId(null);
    clearCheckpoint();
    toast({
      title: "Graph cleared",
      description: "You can start building a new knowledge graph.",
    });
  }, [setCurrentGraphId, clearCheckpoint]);

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

  // Handle question generation
  const handleGenerate = useCallback(async (questions: string[]) => {
    await generate(questions);
  }, [generate]);

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

  const isGenerating = progress.isProcessing;
  const showCheckpointResume = hasCheckpoint() && !isGenerating;

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
          <div className="w-full max-w-2xl space-y-4">
            {(isGenerating || showCheckpointResume) && (
              <GenerationProgress
                progress={progress}
                onPause={abort}
                onResume={resume}
                onCancel={clearCheckpoint}
                hasCheckpoint={showCheckpointResume}
              />
            )}
            
            {!isGenerating && (
              <QuickQuestionInput
                onGenerate={handleGenerate}
                isLoading={isGenerating}
                isLandingMode={true}
              />
            )}
          </div>
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

          {/* Floating question input and progress */}
          <div className="absolute top-4 left-4 w-80 space-y-2">
            {(isGenerating || showCheckpointResume) && (
              <GenerationProgress
                progress={progress}
                onPause={abort}
                onResume={resume}
                onCancel={clearCheckpoint}
                hasCheckpoint={showCheckpointResume}
              />
            )}
            
            {!isGenerating && (
              <QuickQuestionInput
                onGenerate={handleGenerate}
                isLoading={isGenerating}
                isLandingMode={false}
              />
            )}
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
      </div>

      {/* Full-screen modal overlay */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          edges={graph.edges}
          allNodes={graph.globalNodes}
          onClose={() => setSelectedNodeId(null)}
          onNodeSelect={setSelectedNodeId}
        />
      )}
    </div>
  );
}
