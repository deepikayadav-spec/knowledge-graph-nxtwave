import { useState, useMemo, useCallback } from 'react';
import { GraphCanvas } from './graph/GraphCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { QuestionPathSelector } from './panels/QuestionPathSelector';
import { QuickQuestionInput } from './panels/QuickQuestionInput';
import { GraphManagerPanel } from './panels/GraphManagerPanel';
import { GenerationProgress } from './panels/GenerationProgress';
import { AutosaveIndicator } from './AutosaveIndicator';
import { EditModeHeader } from './graph/EditModeHeader';
import { KnowledgeGraph, QuestionPath } from '@/types/graph';
import { useGraphPersistence } from '@/hooks/useGraphPersistence';
import { useBatchGeneration } from '@/hooks/useBatchGeneration';
import { useAutosave } from '@/hooks/useAutosave';
import { useSkillGrouping } from '@/hooks/useSkillGrouping';
import { useStudentMastery } from '@/hooks/useStudentMastery';
import { Network, Sparkles, Trash2, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  StudentSelector,
  ClassSelector,
  MasterySidebar,
} from './mastery';

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

  // Mastery tracking state
  const [masteryMode, setMasteryMode] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);

  // Grouping edit mode state
  const [isGroupingEditMode, setIsGroupingEditMode] = useState(false);
  const [selectedGroupingNodeIds, setSelectedGroupingNodeIds] = useState<Set<string>>(new Set());

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
    copyGraph,
  } = useGraphPersistence();

  // Skill grouping hook
  const groupingHook = useSkillGrouping({
    graphId: currentGraphId || '',
    autoLoad: !!currentGraphId,
  });

  // Extract skill IDs for demo data generation
  const skillIds = useMemo(
    () => graph?.globalNodes.map(n => n.id) || [],
    [graph?.globalNodes]
  );

  // Student mastery hook - lifted up to share with GraphCanvas and NodeDetailPanel
  const studentMasteryHook = useStudentMastery({
    graphId: currentGraphId || '',
    studentId: selectedStudentId || '',
    skillIds,
    useDemoData: true, // Enable demo mode for demonstration
    autoLoad: !!currentGraphId && !!selectedStudentId,
  });

  // Get current graph name for autosave
  const currentGraphName = useMemo(
    () => savedGraphs.find(g => g.id === currentGraphId)?.name,
    [savedGraphs, currentGraphId]
  );

  // Autosave (only when graph has been saved at least once)
  const {
    status: autosaveStatus,
    lastSavedAt: autosaveLastSavedAt,
    triggerSave: autosaveTrigger,
  } = useAutosave(graph, currentGraphId, saveGraph, currentGraphName, {
    debounceMs: 30000, // 30 seconds after last change
    enabled: !!currentGraphId, // Only autosave if graph has been saved once
  });

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
  // Handle class selection from ClassManagerPanel
  const handleClassSelect = useCallback((classId: string, className: string) => {
    setSelectedClassId(classId);
    setSelectedClassName(className);
    setSelectedStudentId(null);
    setSelectedStudentName(null);
  }, []);

  // Handle student selection
  const handleStudentChange = useCallback((studentId: string | null, studentName: string | null) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
  }, []);

  // Toggle grouping edit mode
  const handleToggleGroupingEditMode = useCallback(() => {
    setIsGroupingEditMode(prev => {
      if (prev) {
        // Exiting edit mode - clear selection
        setSelectedGroupingNodeIds(new Set());
      }
      return !prev;
    });
  }, []);

  // Handle creating a subtopic from selected nodes
  const handleCreateSubtopic = useCallback(async (name: string, color: string) => {
    if (selectedGroupingNodeIds.size === 0) return;
    const skillIds = Array.from(selectedGroupingNodeIds);
    await groupingHook.createSubtopic(name, color, skillIds);
    setSelectedGroupingNodeIds(new Set());
  }, [selectedGroupingNodeIds, groupingHook]);

  // Clear graph and start fresh
  const handleClearGraph = useCallback(() => {
    setGraph(null);
    setSelectedNodeId(null);
    setSelectedQuestion(null);
    setCurrentGraphId(null);
    setSelectedClassId(null);
    setSelectedClassName(null);
    setSelectedStudentId(null);
    setSelectedStudentName(null);
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
    await generate(questions, false, currentGraphId || undefined);
  }, [generate, currentGraphId]);

  // Remove a question from the graph
  const handleRemoveQuestion = useCallback((questionText: string) => {
    if (!graph) return;
    
    // Get skills used by this question
    const questionPath = graph.questionPaths[questionText];
    const questionSkills = new Set(
      Array.isArray(questionPath) 
        ? questionPath 
        : questionPath?.requiredNodes || questionPath?.executionOrder || []
    );
    
    // Get all skills used by other questions
    const otherQuestionsSkills = new Set<string>();
    Object.entries(graph.questionPaths).forEach(([q, path]) => {
      if (q !== questionText) {
        const skills = Array.isArray(path) ? path : path?.requiredNodes || path?.executionOrder || [];
        skills.forEach(s => otherQuestionsSkills.add(s));
      }
    });
    
    // Find orphaned skills (only used by this question)
    const orphanedSkills = new Set<string>();
    questionSkills.forEach(skillId => {
      if (!otherQuestionsSkills.has(skillId)) {
        orphanedSkills.add(skillId);
      }
    });
    
    // Update graph
    const newQuestionPaths = { ...graph.questionPaths };
    delete newQuestionPaths[questionText];
    
    const newNodes = graph.globalNodes.filter(n => !orphanedSkills.has(n.id));
    const newEdges = graph.edges.filter(e => 
      !orphanedSkills.has(e.from) && !orphanedSkills.has(e.to)
    );
    
    // Update appearsInQuestions for remaining nodes
    newNodes.forEach(node => {
      node.knowledgePoint.appearsInQuestions = node.knowledgePoint.appearsInQuestions.filter(
        q => q !== questionText
      );
    });
    
    setGraph({
      ...graph,
      globalNodes: newNodes,
      edges: newEdges,
      questionPaths: newQuestionPaths,
    });
    
    toast({
      title: 'Question removed',
      description: orphanedSkills.size > 0 
        ? `Removed ${orphanedSkills.size} orphaned skill(s).`
        : 'Question has been removed from the graph.',
    });
  }, [graph]);

  // Copy a graph
  const handleCopyGraph = useCallback(async (graphId: string, newName: string) => {
    const newId = await copyGraph(graphId, newName);
    if (newId) {
      // Optionally load the copied graph
      await handleLoadGraph(newId);
    }
  }, [copyGraph, handleLoadGraph]);

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
              onCopy={handleCopyGraph}
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
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-foreground">
                  {currentGraphName || 'Knowledge Graph'}
                </h1>
                {currentGraphId && (
                  <AutosaveIndicator
                    status={autosaveStatus}
                    lastSavedAt={autosaveLastSavedAt}
                    onManualSave={autosaveTrigger}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalNodes} skills · {stats?.totalEdges} relationships · {stats?.totalQuestions} questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mastery Mode Toggle */}
            {currentGraphId && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
                <Switch
                  id="mastery-mode"
                  checked={masteryMode}
                  onCheckedChange={setMasteryMode}
                />
                <Label htmlFor="mastery-mode" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  Mastery
                </Label>
              </div>
            )}

            {/* Class & Student Selectors (when mastery mode is on) */}
            {masteryMode && currentGraphId && (
              <div className="flex items-center gap-2">
                <ClassSelector
                  graphId={currentGraphId}
                  selectedClassId={selectedClassId}
                  onClassSelect={handleClassSelect}
                />
                {selectedClassId && (
                  <StudentSelector
                    classId={selectedClassId}
                    selectedStudentId={selectedStudentId}
                    onStudentChange={handleStudentChange}
                  />
                )}
              </div>
            )}

            <QuestionPathSelector
              questions={graph.questionPaths}
              selectedQuestion={selectedQuestion}
              onQuestionSelect={setSelectedQuestion}
              onQuestionRemove={handleRemoveQuestion}
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
              onCopy={handleCopyGraph}
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
            isEditMode={masteryMode && isGroupingEditMode}
            selectedGroupingNodeIds={selectedGroupingNodeIds}
            onNodeSelectionChange={setSelectedGroupingNodeIds}
            onCreateSubtopic={handleCreateSubtopic}
            subtopics={groupingHook.subtopics}
            skillSubtopicMap={groupingHook.skillSubtopicMap}
            studentMastery={masteryMode && selectedStudentId ? studentMasteryHook.mastery : undefined}
            showMasteryVisuals={masteryMode && !!selectedStudentId}
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

        {/* Mastery Sidebar */}
        {masteryMode && currentGraphId && selectedClassId && (
          <MasterySidebar
            graphId={currentGraphId}
            classId={selectedClassId}
            className={selectedClassName || undefined}
            studentId={selectedStudentId}
            studentName={selectedStudentName}
            skills={graph.globalNodes}
            isEditMode={isGroupingEditMode}
            onToggleEditMode={handleToggleGroupingEditMode}
            studentMastery={studentMasteryHook.mastery}
            onMasteryRefresh={studentMasteryHook.loadMastery}
          />
        )}
      </div>

      {/* Full-screen modal overlay */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          edges={graph.edges}
          allNodes={graph.globalNodes}
          onClose={() => setSelectedNodeId(null)}
          onNodeSelect={setSelectedNodeId}
          masteryMode={masteryMode}
          studentMastery={selectedStudentId ? studentMasteryHook.mastery.get(selectedNode.id) : undefined}
          studentName={selectedStudentName}
        />
      )}
    </div>
  );
}
