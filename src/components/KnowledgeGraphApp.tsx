import { useState, useMemo, useCallback } from 'react';
import { GraphCanvas } from './graph/GraphCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { CourseSelector } from './panels/CourseSelector';
import { QuestionPathSelector } from './panels/QuestionPathSelector';
import { LegendPanel } from './panels/LegendPanel';
import { QuestionInputPanel } from './panels/QuestionInputPanel';
import { LevelSummary } from './panels/LevelSummary';
import { KnowledgeGraph } from '@/types/graph';
import { sampleGraph } from '@/data/sampleGraph';
import { Network, Sparkles, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function KnowledgeGraphApp() {
  const [graph, setGraph] = useState<KnowledgeGraph>(sampleGraph);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [isInputPanelOpen, setIsInputPanelOpen] = useState(false);
  const [isLevelSummaryOpen, setIsLevelSummaryOpen] = useState(true);
  const [focusLevel, setFocusLevel] = useState<number | null>(null);

  const handleGraphGenerated = (newGraph: KnowledgeGraph) => {
    setGraph(newGraph);
    setSelectedNodeId(null);
    setSelectedCourse(null);
    setSelectedQuestion(null);
  };

  const handleLevelClick = useCallback((level: number) => {
    setFocusLevel(level);
    // Reset after animation
    setTimeout(() => setFocusLevel(null), 500);
  }, []);

  const selectedNode = useMemo(
    () => graph.globalNodes.find((n) => n.id === selectedNodeId) || null,
    [graph.globalNodes, selectedNodeId]
  );

  const courseNodeIds = useMemo(() => {
    if (!selectedCourse || !graph.courses[selectedCourse]) {
      return undefined;
    }
    return new Set(
      graph.courses[selectedCourse].nodes
        .filter((n) => n.inCourse)
        .map((n) => n.id)
    );
  }, [selectedCourse, graph.courses]);

  const highlightedPath = useMemo(() => {
    if (!selectedQuestion || !graph.questionPaths[selectedQuestion]) {
      return undefined;
    }
    return graph.questionPaths[selectedQuestion];
  }, [selectedQuestion, graph.questionPaths]);

  const courses = Object.keys(graph.courses);

  const stats = useMemo(() => {
    const totalNodes = graph.globalNodes.length;
    const totalEdges = graph.edges.length;
    const avgLevel =
      graph.globalNodes.reduce((sum, n) => sum + n.level, 0) / totalNodes;
    return { totalNodes, totalEdges, avgLevel: avgLevel.toFixed(1) };
  }, [graph]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
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
                  Math Academy Style
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                {stats.totalNodes} concepts · {stats.totalEdges} relationships · Avg
                level {stats.avgLevel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsInputPanelOpen(true)}
              className="gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              New Graph
            </Button>
            <LegendPanel />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="shrink-0 border-b border-border bg-card/30 px-4 py-3">
        <div className="container flex flex-wrap items-center gap-3">
          <CourseSelector
            courses={courses}
            selectedCourse={selectedCourse}
            onCourseSelect={setSelectedCourse}
          />
          <QuestionPathSelector
            questions={graph.questionPaths}
            selectedQuestion={selectedQuestion}
            onQuestionSelect={setSelectedQuestion}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Level Summary */}
        <div className="shrink-0 w-72 border-r border-border bg-card/20 p-3 overflow-y-auto">
          <LevelSummary
            nodes={graph.globalNodes}
            onLevelClick={handleLevelClick}
            isOpen={isLevelSummaryOpen}
            onOpenChange={setIsLevelSummaryOpen}
          />
        </div>

        {/* Graph Area */}
        <div className="flex-1 relative">
          <GraphCanvas
            nodes={graph.globalNodes}
            edges={graph.edges}
            courseNodeIds={courseNodeIds}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            highlightedPath={highlightedPath}
            focusLevel={focusLevel}
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

      <QuestionInputPanel
        isOpen={isInputPanelOpen}
        onClose={() => setIsInputPanelOpen(false)}
        onGraphGenerated={handleGraphGenerated}
      />
    </div>
  );
}
