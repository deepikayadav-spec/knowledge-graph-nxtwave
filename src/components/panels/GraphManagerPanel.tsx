import { useState } from 'react';
import { Save, FolderOpen, Plus, Trash2, Loader2 } from 'lucide-react';
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
import { SavedGraphMeta } from '@/hooks/useGraphPersistence';
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
}: GraphManagerPanelProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [graphName, setGraphName] = useState('');
  const [graphDescription, setGraphDescription] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
                    {graph.total_skills} skills · {graph.total_questions} questions
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(graph.updated_at), { addSuffix: true })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 ml-2 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(graph.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
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
    </div>
  );
}
