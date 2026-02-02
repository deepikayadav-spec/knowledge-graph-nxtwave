// Student selector dropdown component

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users } from 'lucide-react';
import type { ClassStudent } from '@/types/mastery';

interface StudentSelectorProps {
  classId: string;
  selectedStudentId: string | null;
  onStudentChange: (studentId: string | null, studentName: string | null) => void;
  showClassAggregate?: boolean;
}

export function StudentSelector({
  classId,
  selectedStudentId,
  onStudentChange,
  showClassAggregate = true,
}: StudentSelectorProps) {
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }

    const loadStudents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('class_students')
          .select('*')
          .eq('class_id', classId)
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
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [classId]);

  const handleValueChange = (value: string) => {
    if (value === '__aggregate__') {
      onStudentChange(null, null);
    } else {
      const student = students.find(s => s.studentId === value);
      onStudentChange(value, student?.studentName ?? null);
    }
  };

  if (!classId) {
    return (
      <div className="text-sm text-muted-foreground">
        Select a class first
      </div>
    );
  }

  return (
    <Select
      value={selectedStudentId ?? '__aggregate__'}
      onValueChange={handleValueChange}
      disabled={loading}
    >
      <SelectTrigger className="w-[220px]">
        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Select student" />
      </SelectTrigger>
      <SelectContent>
        {showClassAggregate && (
          <SelectItem value="__aggregate__">
            <span className="font-medium">Class Average</span>
          </SelectItem>
        )}
        {students.map(student => (
          <SelectItem key={student.studentId} value={student.studentId}>
            {student.studentName}
          </SelectItem>
        ))}
        {students.length === 0 && !loading && (
          <div className="p-2 text-sm text-muted-foreground">
            No students in this class
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
