// Floating toolbar for creating subtopics from selected nodes

import { useState } from 'react';
import { Plus, Palette, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { GROUPING_COLORS } from '@/types/grouping';

interface GroupingToolbarProps {
  selectedCount: number;
  onCreateSubtopic: (name: string, color: string) => void;
  onClearSelection: () => void;
}

export function GroupingToolbar({
  selectedCount,
  onCreateSubtopic,
  onClearSelection,
}: GroupingToolbarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subtopicName, setSubtopicName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(GROUPING_COLORS[0]);

  const handleSubmit = () => {
    if (!subtopicName.trim()) return;
    onCreateSubtopic(subtopicName.trim(), selectedColor);
    setSubtopicName('');
    setSelectedColor(GROUPING_COLORS[0]);
    setIsDialogOpen(false);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border shadow-lg">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} KP{selectedCount > 1 ? 's' : ''} selected
          </span>
          
          <div className="w-px h-5 bg-border" />
          
          <Button
            size="sm"
            variant="default"
            onClick={() => setIsDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Subtopic
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="gap-1.5 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Subtopic</DialogTitle>
            <DialogDescription>
              Group {selectedCount} selected knowledge point{selectedCount > 1 ? 's' : ''} into a new subtopic.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subtopic-name">Subtopic Name</Label>
              <Input
                id="subtopic-name"
                value={subtopicName}
                onChange={(e) => setSubtopicName(e.target.value)}
                placeholder="e.g., Loop Fundamentals"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Palette className="h-4 w-4" />
                Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {GROUPING_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!subtopicName.trim()}>
              Create Subtopic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
