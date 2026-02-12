import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { SkillTier } from '@/types/graph';

interface AddNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (skillId: string, name: string, tier: SkillTier, description?: string) => Promise<void>;
  existingIds: string[];
}

export function AddNodeDialog({ open, onOpenChange, onAdd, existingIds }: AddNodeDialogProps) {
  const [name, setName] = useState('');
  const [skillId, setSkillId] = useState('');
  const [tier, setTier] = useState<SkillTier>('core');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate snake_case ID from name
  const handleNameChange = (value: string) => {
    setName(value);
    const generated = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    setSkillId(generated);
  };

  const handleSubmit = async () => {
    if (!skillId || !name) return;
    if (existingIds.includes(skillId)) return;
    setIsSubmitting(true);
    try {
      await onAdd(skillId, name, tier, description || undefined);
      setName('');
      setSkillId('');
      setTier('core');
      setDescription('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const idConflict = existingIds.includes(skillId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Knowledge Point</DialogTitle>
          <DialogDescription>Add a new knowledge point to the graph.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill-name">Name</Label>
            <Input id="skill-name" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. List Comprehension" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-id">KP ID (snake_case)</Label>
            <Input id="skill-id" value={skillId} onChange={e => setSkillId(e.target.value)} placeholder="e.g. list_comprehension" className="font-mono text-sm" />
            {idConflict && <p className="text-sm text-destructive">This ID already exists.</p>}
          </div>

          <div className="space-y-2">
            <Label>Tier</Label>
            <Select value={tier} onValueChange={v => setTier(v as SkillTier)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="foundational">Foundational</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-desc">Description (optional)</Label>
            <Textarea id="skill-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this knowledge point represent?" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!skillId || !name || idConflict || isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Knowledge Point'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
