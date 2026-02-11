import { useState, useMemo, useCallback } from 'react';
import { GraphCanvas } from './graph/GraphCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { QuestionPathSelector } from './panels/QuestionPathSelector';
import { QuickQuestionInput } from './panels/QuickQuestionInput';
import { GraphManagerPanel } from './panels/GraphManagerPanel';
import { GenerationProgress } from './panels/GenerationProgress';
import { AutosaveIndicator } from './AutosaveIndicator';
import { EditModeHeader } from './graph/EditModeHeader';
import { AddNodeDialog } from './panels/AddNodeDialog';
import { ViewModeToggle, ViewMode } from './graph/ViewModeToggle';
import { KnowledgeGraph, QuestionPath, GraphNode, GraphEdge, SkillTier } from '@/types/graph';
import { useGraphPersistence } from '@/hooks/useGraphPersistence';
import { useBatchGeneration } from '@/hooks/useBatchGeneration';
import { useAutosave } from '@/hooks/useAutosave';
import { useSkillGrouping } from '@/hooks/useSkillGrouping';
import { useStudentMastery } from '@/hooks/useStudentMastery';
import { buildSubtopicView, buildTopicView } from '@/lib/graph/groupedView';
import { Network, Sparkles, Trash2, GraduationCap, Plus } from 'lucide-react';
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
  if (Array.isArray(path)) return path;
  return path.executionOrder || path.requiredNodes || [];
};

export function KnowledgeGraphApp() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('skills');

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
    fetchGraphs,
    recomputeAndSaveLevels,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
  } = useGraphPersistence();

  const [isRecomputingLevels, setIsRecomputingLevels] = useState(false);

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

  // Student mastery hook
  const studentMasteryHook = useStudentMastery({
    graphId: currentGraphId || '',
    studentId: selectedStudentId || '',
    skillIds,
    useDemoData: true,
    autoLoad: !!currentGraphId && !!selectedStudentId,
  });

  // Get current graph name for autosave
  const currentGraphName = useMemo(
    () => savedGraphs.find(g => g.id === currentGraphId)?.name,
    [savedGraphs, currentGraphId]
  );

  // Autosave
  const {
    status: autosaveStatus,
    lastSavedAt: autosaveLastSavedAt,
    triggerSave: autosaveTrigger,
  } = useAutosave(graph, currentGraphId, saveGraph, currentGraphName, {
    debounceMs: 30000,
    enabled: !!currentGraphId,
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
  } = useBatchGeneration(graph, handleGraphUpdate, fetchGraphs);

  // Handle class selection
  const handleClassSelect = useCallback((classId: string, className: string) => {
    setSelectedClassId(classId);
    setSelectedClassName(className);
    setSelectedStudentId(null);
    setSelectedStudentName(null);
  }, []);

  const handleStudentChange = useCallback((studentId: string | null, studentName: string | null) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
  }, []);

  // Toggle grouping edit mode
  const handleToggleGroupingEditMode = useCallback(() => {
    setIsGroupingEditMode(prev => {
      if (prev) setSelectedGroupingNodeIds(new Set());
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

  // Recompute levels and reload graph
  const handleRecomputeLevels = useCallback(async () => {
    if (!currentGraphId) return;
    setIsRecomputingLevels(true);
    const success = await recomputeAndSaveLevels(currentGraphId);
    if (success) {
      const reloaded = await loadGraph(currentGraphId);
      if (reloaded) setGraph(reloaded);
    }
    setIsRecomputingLevels(false);
  }, [currentGraphId, recomputeAndSaveLevels, loadGraph]);

  // CRUD handlers
  const handleAddNode = useCallback(async (skillId: string, name: string, tier: SkillTier, description?: string) => {
    if (!currentGraphId || !graph) return;
    const success = await addNode(currentGraphId, skillId, name, tier, description);
    if (success) {
      // Add to local state
      const newNode: GraphNode = {
        id: skillId,
        name,
        level: 0,
        tier,
        description,
        knowledgePoint: { atomicityCheck: `Transferable skill: ${name}`, assessmentExample: '', targetAssessmentLevel: 3, appearsInQuestions: [] },
        cme: { measured: false, highestConceptLevel: 0, levelLabels: ['Recognition', 'Recall (simple)', 'Recall (complex)', 'Direct application'], independence: 'Unknown', retention: 'Unknown', evidenceByLevel: {} },
        le: { estimated: true, estimatedMinutes: 15 },
      };
      setGraph({
        ...graph,
        globalNodes: [...graph.globalNodes, newNode],
      });
    }
  }, [currentGraphId, graph, addNode]);

  const handleDeleteNode = useCallback(async (skillId: string) => {
    if (!currentGraphId || !graph) return;
    const success = await removeNode(currentGraphId, skillId);
    if (success) {
      setGraph({
        ...graph,
        globalNodes: graph.globalNodes.filter(n => n.id !== skillId),
        edges: graph.edges.filter(e => e.from !== skillId && e.to !== skillId),
      });
      setSelectedNodeId(null);
    }
  }, [currentGraphId, graph, removeNode]);

  const handleAddEdge = useCallback(async (fromSkill: string, toSkill: string) => {
    if (!currentGraphId || !graph) return;
    const success = await addEdge(currentGraphId, fromSkill, toSkill);
    if (success) {
      const newEdge: GraphEdge = { from: fromSkill, to: toSkill, reason: '' };
      setGraph({ ...graph, edges: [...graph.edges, newEdge] });
      // Recompute levels
      await handleRecomputeLevels();
    }
  }, [currentGraphId, graph, addEdge, handleRecomputeLevels]);

  const handleRemoveEdge = useCallback(async (fromSkill: string, toSkill: string) => {
    if (!currentGraphId || !graph) return;
    const success = await removeEdge(currentGraphId, fromSkill, toSkill);
    if (success) {
      setGraph({
        ...graph,
        edges: graph.edges.filter(e => !(e.from === fromSkill && e.to === toSkill)),
      });
      await handleRecomputeLevels();
    }
  }, [currentGraphId, graph, removeEdge, handleRecomputeLevels]);

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
    setViewMode('skills');
    clearCheckpoint();
    toast({ title: "Graph cleared", description: "You can start building a new knowledge graph." });
  }, [setCurrentGraphId, clearCheckpoint]);

  const handleSaveGraph = useCallback(async (name: string, description?: string) => {
    if (!graph) return;
    await saveGraph(graph, name, description, currentGraphId || undefined);
  }, [graph, currentGraphId, saveGraph]);

  const handleLoadGraph = useCallback(async (graphId: string) => {
    const loadedGraph = await loadGraph(graphId);
    if (loadedGraph) {
      setGraph(loadedGraph);
      setSelectedNodeId(null);
      setSelectedQuestion(null);
      setViewMode('skills');
    }
  }, [loadGraph]);

  const handleDeleteGraph = useCallback(async (graphId: string) => {
    const success = await deleteGraph(graphId);
    if (success && graphId === currentGraphId) {
      setGraph(null);
      setSelectedNodeId(null);
      setSelectedQuestion(null);
    }
  }, [deleteGraph, currentGraphId]);

  const handleGenerate = useCallback(async (questions: string[]) => {
    await generate(questions, false, currentGraphId || undefined);
  }, [generate, currentGraphId]);

  const handleRemoveQuestion = useCallback((questionText: string) => {
    if (!graph) return;
    const questionPath = graph.questionPaths[questionText];
    const questionSkills = new Set(
      Array.isArray(questionPath) ? questionPath : questionPath?.requiredNodes || questionPath?.executionOrder || []
    );
    const otherQuestionsSkills = new Set<string>();
    Object.entries(graph.questionPaths).forEach(([q, path]) => {
      if (q !== questionText) {
        const skills = Array.isArray(path) ? path : path?.requiredNodes || path?.executionOrder || [];
        skills.forEach(s => otherQuestionsSkills.add(s));
      }
    });
    const orphanedSkills = new Set<string>();
    questionSkills.forEach(skillId => {
      if (!otherQuestionsSkills.has(skillId)) orphanedSkills.add(skillId);
    });
    const newQuestionPaths = { ...graph.questionPaths };
    delete newQuestionPaths[questionText];
    const newNodes = graph.globalNodes.filter(n => !orphanedSkills.has(n.id));
    const newEdges = graph.edges.filter(e => !orphanedSkills.has(e.from) && !orphanedSkills.has(e.to));
    newNodes.forEach(node => {
      node.knowledgePoint.appearsInQuestions = node.knowledgePoint.appearsInQuestions.filter(q => q !== questionText);
    });
    setGraph({ ...graph, globalNodes: newNodes, edges: newEdges, questionPaths: newQuestionPaths });
    toast({
      title: 'Question removed',
      description: orphanedSkills.size > 0 ? `Removed ${orphanedSkills.size} orphaned skill(s).` : 'Question has been removed from the graph.',
    });
  }, [graph]);

  const handleCopyGraph = useCallback(async (graphId: string, newName: string) => {
    const newId = await copyGraph(graphId, newName);
    if (newId) await handleLoadGraph(newId);
  }, [copyGraph, handleLoadGraph]);

  const selectedNode = useMemo(
    () => graph?.globalNodes.find((n) => n.id === selectedNodeId) || null,
    [graph?.globalNodes, selectedNodeId]
  );

  const highlightedPath = useMemo(() => {
    if (!selectedQuestion || !graph?.questionPaths[selectedQuestion]) return undefined;
    return getPathArray(graph.questionPaths[selectedQuestion]);
  }, [selectedQuestion, graph?.questionPaths]);

  const stats = useMemo(() => {
    if (!graph) return null;
    return { totalNodes: graph.globalNodes.length, totalEdges: graph.edges.length, totalQuestions: Object.keys(graph.questionPaths).length };
  }, [graph]);

  // Compute grouped view data
  const groupedData = useMemo(() => {
    if (!graph || viewMode === 'skills') return null;
    if (viewMode === 'subtopics') {
      return buildSubtopicView(graph.globalNodes, graph.edges, groupingHook.subtopics, groupingHook.skillSubtopicMap);
    }
    if (viewMode === 'topics') {
      return buildTopicView(graph.globalNodes, graph.edges, groupingHook.subtopics, groupingHook.topics, groupingHook.skillSubtopicMap);
    }
    return null;
  }, [graph, viewMode, groupingHook.subtopics, groupingHook.topics, groupingHook.skillSubtopicMap]);

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
                    <Sparkles className="h-3 w-3 mr-1" />Skill Taxonomy
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
              onRecomputeLevels={handleRecomputeLevels}
              isRecomputingLevels={isRecomputingLevels}
            />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl space-y-4">
            {(isGenerating || showCheckpointResume) && (
              <GenerationProgress progress={progress} onPause={abort} onResume={resume} onCancel={clearCheckpoint} hasCheckpoint={showCheckpointResume} />
            )}
            {!isGenerating && (
              <QuickQuestionInput onGenerate={handleGenerate} isLoading={isGenerating} isLandingMode={true} graphId={currentGraphId} />
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
                  <AutosaveIndicator status={autosaveStatus} lastSavedAt={autosaveLastSavedAt} onManualSave={autosaveTrigger} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalNodes} skills · {stats?.totalEdges} relationships · {stats?.totalQuestions} questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <ViewModeToggle value={viewMode} onChange={setViewMode} />

            {/* Add Skill Button */}
            {currentGraphId && viewMode === 'skills' && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddNodeDialog(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Skill
              </Button>
            )}

            {/* Mastery Mode Toggle */}
            {currentGraphId && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
                <Switch id="mastery-mode" checked={masteryMode} onCheckedChange={setMasteryMode} />
                <Label htmlFor="mastery-mode" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />Mastery
                </Label>
              </div>
            )}

            {/* Class & Student Selectors */}
            {masteryMode && currentGraphId && (
              <div className="flex items-center gap-2">
                <ClassSelector graphId={currentGraphId} selectedClassId={selectedClassId} onClassSelect={handleClassSelect} />
                {selectedClassId && (
                  <StudentSelector classId={selectedClassId} selectedStudentId={selectedStudentId} onStudentChange={handleStudentChange} />
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
              onRecomputeLevels={handleRecomputeLevels}
              isRecomputingLevels={isRecomputingLevels}
            />
            <Button variant="outline" size="sm" onClick={handleClearGraph} className="gap-1.5 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />Clear
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Area */}
        <div className="flex-1 relative">
          <GraphCanvas
            nodes={groupedData ? groupedData.nodes as GraphNode[] : graph.globalNodes}
            edges={groupedData ? groupedData.edges : graph.edges}
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
            viewMode={viewMode}
            groupedData={groupedData}
          />

          {/* Floating question input and progress */}
          <div className="absolute top-4 left-4 w-80 space-y-2">
            {(isGenerating || showCheckpointResume) && (
              <GenerationProgress progress={progress} onPause={abort} onResume={resume} onCancel={clearCheckpoint} hasCheckpoint={showCheckpointResume} />
            )}
            {!isGenerating && (
              <QuickQuestionInput onGenerate={handleGenerate} isLoading={isGenerating} isLandingMode={false} graphId={currentGraphId} />
            )}
          </div>

          {/* Floating info when path is selected */}
          {highlightedPath && (
            <div className="absolute bottom-4 left-4 panel-glass px-4 py-2 animate-fade-in">
              <div className="text-xs text-muted-foreground mb-1">Question Path</div>
              <div className="flex items-center gap-1 text-sm">
                {highlightedPath.map((nodeId, idx) => {
                  const node = graph.globalNodes.find((n) => n.id === nodeId);
                  return (
                    <span key={nodeId} className="flex items-center gap-1">
                      <button onClick={() => setSelectedNodeId(nodeId)} className="px-2 py-0.5 rounded bg-accent/10 hover:bg-accent/20 text-accent font-medium text-xs transition-colors">
                        {node?.name.split(' ').slice(0, 3).join(' ')}...
                      </button>
                      {idx < highlightedPath.length - 1 && <span className="text-muted-foreground">→</span>}
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
      {selectedNode && viewMode === 'skills' && (
        <NodeDetailPanel
          node={selectedNode}
          edges={graph.edges}
          allNodes={graph.globalNodes}
          onClose={() => setSelectedNodeId(null)}
          onNodeSelect={setSelectedNodeId}
          masteryMode={masteryMode}
          studentMastery={selectedStudentId ? studentMasteryHook.mastery.get(selectedNode.id) : undefined}
          studentName={selectedStudentName}
          onDeleteNode={currentGraphId ? handleDeleteNode : undefined}
          onAddEdge={currentGraphId ? handleAddEdge : undefined}
          onRemoveEdge={currentGraphId ? handleRemoveEdge : undefined}
        />
      )}

      {/* Add Node Dialog */}
      <AddNodeDialog
        open={showAddNodeDialog}
        onOpenChange={setShowAddNodeDialog}
        onAdd={handleAddNode}
        existingIds={graph.globalNodes.map(n => n.id)}
      />
    </div>
  );
}
