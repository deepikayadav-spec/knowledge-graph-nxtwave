// Bulk CSV upload panel for importing student attempts

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { calculateAndPersistMastery, buildQuestionsMap } from '@/lib/mastery/persistMastery';
import type { BulkUploadRow, BulkUploadValidation, IndependenceLevel, StudentAttempt } from '@/types/mastery';

interface BulkUploadPanelProps {
  graphId: string;
  classId?: string;
  onUploadComplete?: () => void;
}

const EXPECTED_COLUMNS = [
  'student_id',
  'student_name',
  'question_text',
  'is_correct',
  'attempted_at',
];

const OPTIONAL_COLUMNS = ['solution_viewed', 'ai_tutor_count', 'total_submissions', 'independence_level', 'solution_score'];

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function validateAndParse(
  rows: string[][],
  questionMap: Map<string, string>
): BulkUploadValidation {
  const result: BulkUploadValidation = {
    valid: true,
    rows: [],
    errors: [],
    warnings: [],
  };

  if (rows.length < 2) {
    result.valid = false;
    result.errors.push({ row: 0, field: '', message: 'CSV must have header row and at least one data row' });
    return result;
  }

  const header = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const columnIndices: Record<string, number> = {};
  
  EXPECTED_COLUMNS.forEach(col => {
    const idx = header.indexOf(col);
    if (idx === -1) {
      result.valid = false;
      result.errors.push({ row: 0, field: col, message: `Missing required column: ${col}` });
    } else {
      columnIndices[col] = idx;
    }
  });

  // Optional columns no longer parsed (simplified to always independent)

  if (!result.valid) return result;

  // Parse data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const studentId = row[columnIndices['student_id']]?.trim();
    const studentName = row[columnIndices['student_name']]?.trim();
    const questionText = row[columnIndices['question_text']]?.trim();
    const isCorrectStr = row[columnIndices['is_correct']]?.trim().toLowerCase();
    const attemptedAtStr = row[columnIndices['attempted_at']]?.trim();

    // Simplified: always independent, score 1.0
    const solutionViewed = false;
    const aiTutorCount = 0;
    const totalSubmissions = 1;
    const independenceLevel: IndependenceLevel = 'independent';

    // Binary scoring: solution_score derived from is_correct
    const isCorrect = isCorrectStr === 'true' || isCorrectStr === '1' || isCorrectStr === 'yes';
    const solutionScore = isCorrect ? 1.0 : 0.0;

    // Validate student_id
    if (!studentId) {
      result.errors.push({ row: i + 1, field: 'student_id', message: 'Student ID is required' });
      result.valid = false;
      continue;
    }

    // Validate student_name
    if (!studentName) {
      result.errors.push({ row: i + 1, field: 'student_name', message: 'Student name is required' });
      result.valid = false;
      continue;
    }

    // Validate question_text and match to question
    if (!questionText) {
      result.errors.push({ row: i + 1, field: 'question_text', message: 'Question text is required' });
      result.valid = false;
      continue;
    }

    // Try to find matching question (case-insensitive, trimmed)
    const normalizedText = questionText.toLowerCase().trim();
    let matchedQuestionId: string | undefined;
    for (const [text, id] of questionMap) {
      if (text.toLowerCase().trim() === normalizedText) {
        matchedQuestionId = id;
        break;
      }
    }

    if (!matchedQuestionId) {
      result.warnings.push({ 
        row: i + 1, 
        message: `Question not found in graph: "${questionText.substring(0, 50)}..."` 
      });
      continue;
    }

    // Validate is_correct
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(isCorrectStr)) {
      result.errors.push({ row: i + 1, field: 'is_correct', message: `Invalid value: ${isCorrectStr}` });
      result.valid = false;
      continue;
    }

    // Validate attempted_at
    const attemptedAt = new Date(attemptedAtStr);
    if (isNaN(attemptedAt.getTime())) {
      result.errors.push({ row: i + 1, field: 'attempted_at', message: `Invalid date: ${attemptedAtStr}` });
      result.valid = false;
      continue;
    }

    result.rows.push({
      studentId,
      studentName,
      questionText,
      isCorrect,
      solutionScore,
      independenceLevel,
      attemptedAt,
    });
  }

  return result;
}

export function BulkUploadPanel({
  graphId,
  classId,
  onUploadComplete,
}: BulkUploadPanelProps) {
  const { toast } = useToast();
  const [validation, setValidation] = useState<BulkUploadValidation | null>(null);
  const [questionMap, setQuestionMap] = useState<Map<string, string>>(new Map());
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Load questions on mount
  const loadQuestions = useCallback(async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text')
      .eq('graph_id', graphId);

    if (error) {
      console.error('Error loading questions:', error);
      return;
    }

    const map = new Map<string, string>();
    (data || []).forEach(q => {
      map.set(q.question_text, q.id);
    });
    setQuestionMap(map);
  }, [graphId]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    await loadQuestions();

    const text = await file.text();
    const rows = parseCSV(text);
    const validationResult = validateAndParse(rows, questionMap);
    setValidation(validationResult);
  }, [questionMap, loadQuestions, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!validation || !validation.valid || validation.rows.length === 0) return;

    setUploading(true);
    try {
      // Load questions with all fields needed for matching and mastery calculation
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, graph_id, question_text, skills, primary_skills, skill_weights')
        .eq('graph_id', graphId);

      const qMap = new Map<string, string>();
      (questionsData || []).forEach(q => {
        qMap.set(q.question_text.toLowerCase().trim(), q.id);
      });

      // Insert attempts
      const attempts = validation.rows.map(row => ({
        graph_id: graphId,
        class_id: classId || null,
        student_id: row.studentId,
        question_id: qMap.get(row.questionText.toLowerCase().trim()),
        is_correct: row.isCorrect,
        solution_score: row.solutionScore,
        independence_level: row.independenceLevel,
        attempted_at: row.attemptedAt.toISOString(),
      })).filter(a => a.question_id); // Only include matched questions

      if (attempts.length === 0) {
        toast({
          title: 'No valid attempts',
          description: 'No questions matched in the graph',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('student_attempts').insert(attempts);

      if (error) throw error;

      // Auto-enroll students if class is set
      if (classId) {
        const uniqueStudents = new Map<string, string>();
        validation.rows.forEach(row => {
          if (!uniqueStudents.has(row.studentId)) {
            uniqueStudents.set(row.studentId, row.studentName);
          }
        });

        for (const [studentId, studentName] of uniqueStudents) {
          await supabase
            .from('class_students')
            .upsert({
              class_id: classId,
              student_id: studentId,
              student_name: studentName,
            }, { onConflict: 'class_id,student_id' });
        }
      }

      // Calculate and persist mastery for each student
      if (questionsData && questionsData.length > 0) {
        const questionsMap = buildQuestionsMap(questionsData);

        // Group attempts by student
        const attemptsByStudent = new Map<string, StudentAttempt[]>();
        for (const row of validation.rows) {
          const questionId = qMap.get(row.questionText.toLowerCase().trim());
          if (!questionId) continue;

          const attempt: StudentAttempt = {
            id: crypto.randomUUID(),
            graphId,
            classId: classId || undefined,
            studentId: row.studentId,
            questionId,
            isCorrect: row.isCorrect,
            solutionScore: row.solutionScore,
            independenceLevel: row.independenceLevel,
            attemptedAt: row.attemptedAt,
          };

          const existing = attemptsByStudent.get(row.studentId) || [];
          existing.push(attempt);
          attemptsByStudent.set(row.studentId, existing);
        }

        // Calculate and persist mastery for each student
        for (const [studentId, studentAttempts] of attemptsByStudent) {
          await calculateAndPersistMastery(graphId, studentId, studentAttempts, questionsMap);
        }
      }

      toast({
        title: 'Upload complete',
        description: `Imported ${attempts.length} attempts and calculated mastery`,
      });

      setValidation(null);
      onUploadComplete?.();
    } catch (err) {
      console.error('Error uploading attempts:', err);
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4" />
          Bulk Upload Attempts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag & drop a CSV file here, or
          </p>
          <label className="cursor-pointer">
            <span className="text-sm text-primary underline">browse files</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            Required: student_id, student_name, question_text, is_correct, attempted_at
          </p>
          <p className="text-xs text-muted-foreground">
            Optional: solution_viewed, ai_tutor_count, total_submissions
          </p>
        </div>

        {/* Validation Results */}
        {validation && (
          <div className="space-y-2">
            {validation.errors.length > 0 && (
              <div className="bg-destructive/10 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Errors ({validation.errors.length})
                </div>
                <ul className="text-sm text-destructive space-y-1">
                  {validation.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>Row {err.row}: {err.message}</li>
                  ))}
                  {validation.errors.length > 5 && (
                    <li>...and {validation.errors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="bg-accent/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-accent-foreground font-medium mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Warnings ({validation.warnings.length})
                </div>
                <ul className="text-sm text-accent-foreground/80 space-y-1">
                  {validation.warnings.slice(0, 3).map((warn, i) => (
                    <li key={i}>Row {warn.row}: {warn.message}</li>
                  ))}
                  {validation.warnings.length > 3 && (
                    <li>...and {validation.warnings.length - 3} more warnings</li>
                  )}
                </ul>
              </div>
            )}

            {validation.valid && validation.rows.length > 0 && (
              <div className="bg-primary/10 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready to import {validation.rows.length} attempts
                </div>
              </div>
            )}

            {validation.valid && validation.rows.length > 0 && (
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? 'Uploading...' : `Import ${validation.rows.length} Attempts`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
