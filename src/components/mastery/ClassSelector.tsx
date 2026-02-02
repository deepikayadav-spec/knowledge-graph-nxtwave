// Compact class selector dropdown for header

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { GraduationCap, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StudentClass } from '@/types/mastery';

interface ClassSelectorProps {
  graphId: string;
  selectedClassId: string | null;
  onClassSelect: (classId: string, className: string) => void;
}

export function ClassSelector({
  graphId,
  selectedClassId,
  onClassSelect,
}: ClassSelectorProps) {
  const { toast } = useToast();
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // Load classes for this graph
  useEffect(() => {
    if (!graphId) return;

    const loadClasses = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('graph_id', graphId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setClasses(
          (data || []).map(c => ({
            id: c.id,
            graphId: c.graph_id,
            name: c.name,
            teacherId: c.teacher_id,
            createdAt: new Date(c.created_at),
          }))
        );
      } catch (err) {
        console.error('Error loading classes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, [graphId]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          graph_id: graphId,
          name: newClassName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      const newClass: StudentClass = {
        id: data.id,
        graphId: data.graph_id,
        name: data.name,
        teacherId: data.teacher_id,
        createdAt: new Date(data.created_at),
      };

      setClasses(prev => [newClass, ...prev]);
      setNewClassName('');
      setShowCreateDialog(false);
      onClassSelect(newClass.id, newClass.name);

      toast({
        title: 'Class created',
        description: `"${newClass.name}" has been created`,
      });
    } catch (err) {
      console.error('Error creating class:', err);
      toast({
        title: 'Error',
        description: 'Failed to create class',
        variant: 'destructive',
      });
    }
  };

  const handleValueChange = (value: string) => {
    if (value === '__create__') {
      setShowCreateDialog(true);
      return;
    }
    const cls = classes.find(c => c.id === value);
    if (cls) {
      onClassSelect(cls.id, cls.name);
    }
  };

  return (
    <>
      <Select
        value={selectedClassId ?? ''}
        onValueChange={handleValueChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[180px]">
          <GraduationCap className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Select class" />
        </SelectTrigger>
        <SelectContent>
          {classes.map(c => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
          <SelectItem value="__create__" className="text-primary">
            <Plus className="h-4 w-4 mr-1 inline" />
            Create new class
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                placeholder="e.g., Physics 101 - Fall 2026"
                onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
              />
            </div>
            <Button onClick={handleCreateClass} className="w-full">
              Create Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
