import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GraphNode } from '@/types/graph';

interface AddEdgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (targetNodeId: string) => Promise<void>;
  allNodes: GraphNode[];
  excludeIds: string[];
  mode: 'prerequisite' | 'dependent';
  sourceNodeName: string;
}

export function AddEdgeDialog({ open, onOpenChange, onAdd, allNodes, excludeIds, mode, sourceNodeName }: AddEdgeDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredNodes = useMemo(() => {
    const excludeSet = new Set(excludeIds);
    return allNodes
      .filter(n => !excludeSet.has(n.id))
      .filter(n => !search || n.name.toLowerCase().includes(search.toLowerCase()) || n.id.toLowerCase().includes(search.toLowerCase()));
  }, [allNodes, excludeIds, search]);

  const handleSubmit = async () => {
    if (!selectedId) return;
    setIsSubmitting(true);
    try {
      await onAdd(selectedId);
      setSearch('');
      setSelectedId(null);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'prerequisite' ? 'Add Prerequisite' : 'Add Dependent'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'prerequisite'
              ? `Select a skill that "${sourceNodeName}" requires.`
              : `Select a skill that depends on "${sourceNodeName}".`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Search skills</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type to filter..." />
          </div>

          <ScrollArea className="h-52 border rounded-md">
            <div className="p-1">
              {filteredNodes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No matching skills</p>
              ) : (
                filteredNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedId(node.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedId === node.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{node.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{node.id}</div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedId || isSubmitting}>
            {isSubmitting ? 'Adding...' : mode === 'prerequisite' ? 'Add Prerequisite' : 'Add Dependent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
