// Class manager panel for creating and managing student cohorts

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Plus, Users, Trash2 } from 'lucide-react';
import type { StudentClass, ClassStudent } from '@/types/mastery';

interface ClassManagerPanelProps {
  graphId: string;
  selectedClassId: string | null;
  onClassChange: (classId: string | null, className: string | null) => void;
}

export function ClassManagerPanel({
  graphId,
  selectedClassId,
  onClassChange,
}: ClassManagerPanelProps) {
  const { toast } = useToast();
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');

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

  // Load students when class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    const loadStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('class_students')
          .select('*')
          .eq('class_id', selectedClassId)
          .order('student_name');

        if (error) throw error;

        setStudents(
          (data || []).map(s => ({
            id: s.id,
            classId: s.class_id,
            studentId: s.student_id,
            studentName: s.student_name,
            enrolledAt: new Date(s.enrolled_at),
          }))
        );
      } catch (err) {
        console.error('Error loading students:', err);
      }
    };

    loadStudents();
  }, [selectedClassId]);

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
      onClassChange(newClass.id, newClass.name);

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

  const handleAddStudent = async () => {
    if (!selectedClassId || !newStudentId.trim() || !newStudentName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('class_students')
        .insert({
          class_id: selectedClassId,
          student_id: newStudentId.trim(),
          student_name: newStudentName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      const newStudent: ClassStudent = {
        id: data.id,
        classId: data.class_id,
        studentId: data.student_id,
        studentName: data.student_name,
        enrolledAt: new Date(data.enrolled_at),
      };

      setStudents(prev => [...prev, newStudent].sort((a, b) => 
        a.studentName.localeCompare(b.studentName)
      ));
      setNewStudentId('');
      setNewStudentName('');
      setShowAddStudentDialog(false);

      toast({
        title: 'Student added',
        description: `${newStudent.studentName} has been enrolled`,
      });
    } catch (err) {
      console.error('Error adding student:', err);
      toast({
        title: 'Error',
        description: 'Failed to add student',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveStudent = async (student: ClassStudent) => {
    try {
      const { error } = await supabase
        .from('class_students')
        .delete()
        .eq('id', student.id);

      if (error) throw error;

      setStudents(prev => prev.filter(s => s.id !== student.id));

      toast({
        title: 'Student removed',
        description: `${student.studentName} has been removed`,
      });
    } catch (err) {
      console.error('Error removing student:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove student',
        variant: 'destructive',
      });
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Class Manager
          </span>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Class
              </Button>
            </DialogTrigger>
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
                  />
                </div>
                <Button onClick={handleCreateClass} className="w-full">
                  Create Class
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Class Selector */}
        <div className="space-y-2">
          <Label>Select Class</Label>
          <Select
            value={selectedClassId ?? ''}
            onValueChange={(value) => {
              const cls = classes.find(c => c.id === value);
              onClassChange(value || null, cls?.name ?? null);
            }}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              {classes.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">
                  No classes yet. Create one above.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Students List */}
        {selectedClass && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Students ({students.length})
              </Label>
              <Dialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Student to {selectedClass.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Student ID</Label>
                      <Input
                        value={newStudentId}
                        onChange={e => setNewStudentId(e.target.value)}
                        placeholder="e.g., STU001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Student Name</Label>
                      <Input
                        value={newStudentName}
                        onChange={e => setNewStudentName(e.target.value)}
                        placeholder="e.g., Alice Smith"
                      />
                    </div>
                    <Button onClick={handleAddStudent} className="w-full">
                      Add Student
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="border rounded-lg max-h-[200px] overflow-y-auto">
              {students.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No students enrolled yet
                </div>
              ) : (
                <ul className="divide-y">
                  {students.map(student => (
                    <li
                      key={student.id}
                      className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <div>
                        <span className="font-medium">{student.studentName}</span>
                        <span className="text-muted-foreground ml-2">
                          ({student.studentId})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStudent(student)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
