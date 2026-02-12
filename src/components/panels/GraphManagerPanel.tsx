import { useState } from 'react';
import { Save, FolderOpen, Plus, Trash2, Loader2, Copy, RefreshCw, Gauge, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { SavedGraphMeta } from '@/hooks/useGraphPersistence';
import { useRegenerateWeights } from '@/hooks/useRegenerateWeights';
import { useRegenerateDifficulty } from '@/hooks/useRegenerateDifficulty';
import { formatDistanceToNow } from 'date-fns';

interface GraphManagerPanelProps {
  savedGraphs: SavedGraphMeta[];
  currentGraphId: string | null;
  hasGraph: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (name: string, description?: string) => void;
  onLoad: (graphId: string) => void;
  onDelete: (graphId: string) => void;
  onNew: () => void;
  onCopy?: (graphId: string, newName: string) => void;
  onGraphRegenerated?: () => void;
  onRecomputeLevels?: () => void;
  isRecomputingLevels?: boolean;
}

export function GraphManagerPanel({
  savedGraphs,
  currentGraphId,
  hasGraph,
  isLoading,
  isSaving,
  onSave,
  onLoad,
  onDelete,
  onNew,
  onCopy,
  onGraphRegenerated,
  onRecomputeLevels,
  isRecomputingLevels,
}: GraphManagerPanelProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [regenerateWeightsDialogOpen, setRegenerateWeightsDialogOpen] = useState(false);
  const [regenerateDifficultyDialogOpen, setRegenerateDifficultyDialogOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState<string | null>(null);
  const [graphName, setGraphName] = useState('');
  const [graphDescription, setGraphDescription] = useState('');
  const [copyName, setCopyName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const { progress: weightsProgress, regenerate: regenerateWeights, isRegenerating: isRegeneratingWeights } = useRegenerateWeights();
  const { progress: difficultyProgress, regenerate: regenerateDifficulty, isRegenerating: isRegeneratingDifficulty } = useRegenerateDifficulty();

  const currentGraph = savedGraphs.find(g => g.id === currentGraphId);

  const handleSave = () => {
    if (!graphName.trim()) return;
    onSave(graphName.trim(), graphDescription.trim() || undefined);
    setSaveDialogOpen(false);
    setGraphName('');
    setGraphDescription('');
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleOpenCopyDialog = (graphId: string, graphName: string) => {
    setCopySourceId(graphId);
    setCopyName(`${graphName} (Copy)`);
    setCopyDialogOpen(true);
  };

  const handleConfirmCopy = () => {
    if (copySourceId && copyName.trim() && onCopy) {
      onCopy(copySourceId, copyName.trim());
      setCopyDialogOpen(false);
      setCopySourceId(null);
      setCopyName('');
    }
  };

  const handleRegenerateWeights = async () => {
    if (!currentGraphId) return;
    const success = await regenerateWeights(currentGraphId);
    if (success) {
      setRegenerateWeightsDialogOpen(false);
      onGraphRegenerated?.();
    }
  };

  const handleRegenerateDifficulty = async () => {
    if (!currentGraphId) return;
    const success = await regenerateDifficulty(currentGraphId);
    if (success) {
      setRegenerateDifficultyDialogOpen(false);
      onGraphRegenerated?.();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Load/My Graphs Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5" />
            )}
            {currentGraph ? currentGraph.name : 'My Graphs'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Saved Graphs</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {savedGraphs.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              No saved graphs yet
            </div>
          ) : (
            savedGraphs.map((graph) => (
              <DropdownMenuItem
                key={graph.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => onLoad(graph.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{graph.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {graph.total_skills} KPs · {graph.total_questions} questions
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(graph.updated_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {onCopy && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCopyDialog(graph.id, graph.name);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(graph.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Graph
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Button/Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!hasGraph || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Knowledge Graph</DialogTitle>
            <DialogDescription>
              Save your current graph to access it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                placeholder="e.g., Python Fundamentals"
                value={graphName}
                onChange={(e) => setGraphName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="description"
                placeholder="Brief description of this graph"
                value={graphDescription}
                onChange={(e) => setGraphDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!graphName.trim()}>
              Save Graph
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Weights Button/Dialog */}
      <Dialog open={regenerateWeightsDialogOpen} onOpenChange={setRegenerateWeightsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!currentGraphId || isRegeneratingWeights || isRegeneratingDifficulty}
          >
            {isRegeneratingWeights ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Weights
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Knowledge Point Weights</DialogTitle>
            <DialogDescription>
              Re-analyze all questions to identify up to 2 primary knowledge points per question and update skill weights. This uses AI to improve mastery tracking accuracy.
            </DialogDescription>
          </DialogHeader>
          
          {isRegeneratingWeights && weightsProgress.total > 0 && (
            <div className="space-y-2 py-4">
              <Progress value={(weightsProgress.current / weightsProgress.total) * 100} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{weightsProgress.message}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRegenerateWeightsDialogOpen(false)}
              disabled={isRegeneratingWeights}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRegenerateWeights} 
              disabled={isRegeneratingWeights}
              className="gap-2"
            >
              {isRegeneratingWeights ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate Weights
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recompute Levels Button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={!currentGraphId || isRecomputingLevels}
        onClick={onRecomputeLevels}
      >
        {isRecomputingLevels ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Layers className="h-3.5 w-3.5" />
        )}
        Levels
      </Button>

      {/* Regenerate Difficulty Button/Dialog */}
      <Dialog open={regenerateDifficultyDialogOpen} onOpenChange={setRegenerateDifficultyDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!currentGraphId || isRegeneratingWeights || isRegeneratingDifficulty}
          >
            {isRegeneratingDifficulty ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Gauge className="h-3.5 w-3.5" />
            )}
            Difficulty
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Question Difficulty</DialogTitle>
            <DialogDescription>
              Analyze all questions using a 4-dimension rubric (Cognitive Complexity, Task Structure, Algorithmic Demands, Scope) to calculate difficulty multipliers. Harder questions will have more impact on mastery scores.
            </DialogDescription>
          </DialogHeader>
          
          {isRegeneratingDifficulty && difficultyProgress.total > 0 && (
            <div className="space-y-2 py-4">
              <Progress value={(difficultyProgress.current / difficultyProgress.total) * 100} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{difficultyProgress.message}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRegenerateDifficultyDialogOpen(false)}
              disabled={isRegeneratingDifficulty}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRegenerateDifficulty} 
              disabled={isRegeneratingDifficulty}
              className="gap-2"
            >
              {isRegeneratingDifficulty ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Gauge className="h-4 w-4" />
                  Analyze Difficulty
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Graph?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The graph and all its data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Graph</DialogTitle>
            <DialogDescription>
              Create a duplicate of this graph with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="copy-name" className="text-sm font-medium">
                New Name
              </label>
              <Input
                id="copy-name"
                placeholder="e.g., Python Fundamentals (Copy)"
                value={copyName}
                onChange={(e) => setCopyName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCopy} disabled={!copyName.trim() || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Graph
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
