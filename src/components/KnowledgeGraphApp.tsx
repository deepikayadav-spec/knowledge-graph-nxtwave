import { useState, useMemo, useCallback } from 'react';
import { GraphCanvas } from './graph/GraphCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { QuestionPathSelector } from './panels/QuestionPathSelector';
import { QuickQuestionInput } from './panels/QuickQuestionInput';
import { KnowledgeGraph, QuestionPath } from '@/types/graph';

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
      const { data, error } = await supabase.functions.invoke('generate-graph', {
        body: { questions },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const newGraph: KnowledgeGraph = {
        globalNodes: data.globalNodes || [],
        edges: data.edges || [],
        courses: data.courses || {},
        questionPaths: data.questionPaths || {},
      };

      handleGraphGenerated(newGraph);
      
      toast({
        title: "Graph generated!",
        description: `Created ${newGraph.globalNodes.length} concept nodes with ${newGraph.edges.length} relationships.`,
      });
    } catch (error) {
      console.error('Graph generation error:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate knowledge graph.",
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

          <div className="flex items-center gap-3">
            <QuestionPathSelector
              questions={graph.questionPaths}
              selectedQuestion={selectedQuestion}
              onQuestionSelect={setSelectedQuestion}
            />
            <QuickQuestionInput
              onGenerate={handleGenerate}
              isLoading={isGenerating}
            />
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
