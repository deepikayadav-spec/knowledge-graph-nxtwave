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

// --- Robust CSV parser that handles multiline quoted fields ---
function parseCSVRobust(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current.trim());
        current = '';
      } else if (char === '\n' || (char === '\r' && next === '\n')) {
        row.push(current.trim());
        current = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        if (char === '\r') i++; // skip \n after \r
      } else {
        current += char;
      }
    }
  }
  // Push last field/row
  row.push(current.trim());
  if (row.length > 1 || row[0] !== '') rows.push(row);

  return rows;
}

// --- Detect if CSV is custom NxtWave format ---
function isCustomFormat(header: string[]): boolean {
  const normalized = header.map(h => h.toLowerCase().replace(/\s+/g, '_'));
  return normalized.includes('question_content') && normalized.includes('best_score_attempt_evaluation_result');
}

// --- Normalize text for matching: collapse whitespace, lowercase, trim ---
function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

// --- Parse custom format CSV and match to DB questions ---
function parseCustomFormat(
  rows: string[][],
  questionMap: Map<string, string> // normalized question_text -> question id
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
  const colIdx = (name: string) => header.indexOf(name);

  const userIdIdx = colIdx('user_id');
  const questionContentIdx = colIdx('question_content');
  const bestScoreIdx = colIdx('best_score_attempt_evaluation_result');
  const firstCorrectDateIdx = colIdx('first_correct_attempt_submission_datetime');
  const questionShortTextIdx = colIdx('question_short_text');

  if (userIdIdx === -1 || questionContentIdx === -1 || bestScoreIdx === -1) {
    result.valid = false;
    result.errors.push({ row: 0, field: '', message: 'Missing required columns: user_id, question_content, best_score_attempt_evaluation_result' });
    return result;
  }

  // Build a prefix map for fallback matching (first 80 chars normalized)
  const prefixMap = new Map<string, string>();
  for (const [normText, qId] of questionMap) {
    const prefix = normText.substring(0, 80);
    if (!prefixMap.has(prefix)) {
      prefixMap.set(prefix, qId);
    }
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const userId = row[userIdIdx]?.trim();
    const questionContent = row[questionContentIdx]?.trim();
    const bestScore = row[bestScoreIdx]?.trim().toUpperCase();
    const dateStr = firstCorrectDateIdx >= 0 ? row[firstCorrectDateIdx]?.trim() : '';
    const shortText = questionShortTextIdx >= 0 ? row[questionShortTextIdx]?.trim() : '';

    if (!userId || !questionContent) continue;

    // Binary scoring: only CORRECT = true
    const isCorrect = bestScore === 'CORRECT';

    // Match question to DB
    const normalizedContent = normalizeForMatch(questionContent);
    let matchedQuestionId: string | undefined;

    // Try exact match
    matchedQuestionId = questionMap.get(normalizedContent);

    // Fallback: prefix match (first 80 chars)
    if (!matchedQuestionId) {
      const prefix = normalizedContent.substring(0, 80);
      matchedQuestionId = prefixMap.get(prefix);
    }

    if (!matchedQuestionId) {
      const label = shortText || questionContent.substring(0, 50);
      result.warnings.push({
        row: i + 1,
        message: `Question not found: "${label}"`,
      });
      continue;
    }

    // Parse date
    let attemptedAt = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) attemptedAt = parsed;
    }

    result.rows.push({
      studentId: userId,
      studentName: `Student ${userId.substring(0, 6)}`,
      questionText: questionContent,
      isCorrect,
      solutionScore: isCorrect ? 1.0 : 0.0,
      independenceLevel: 'independent' as IndependenceLevel,
      attemptedAt,
    });
  }

  return result;
}

// --- Standard format parser ---
function parseStandardFormat(
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

  if (!result.valid) return result;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const studentId = row[columnIndices['student_id']]?.trim();
    const studentName = row[columnIndices['student_name']]?.trim();
    const questionText = row[columnIndices['question_text']]?.trim();
    const isCorrectStr = row[columnIndices['is_correct']]?.trim().toLowerCase();
    const attemptedAtStr = row[columnIndices['attempted_at']]?.trim();

    const independenceLevel: IndependenceLevel = 'independent';
    const isCorrect = isCorrectStr === 'true' || isCorrectStr === '1' || isCorrectStr === 'yes';
    const solutionScore = isCorrect ? 1.0 : 0.0;

    if (!studentId) { result.errors.push({ row: i + 1, field: 'student_id', message: 'Student ID is required' }); result.valid = false; continue; }
    if (!studentName) { result.errors.push({ row: i + 1, field: 'student_name', message: 'Student name is required' }); result.valid = false; continue; }
    if (!questionText) { result.errors.push({ row: i + 1, field: 'question_text', message: 'Question text is required' }); result.valid = false; continue; }

    const normalizedText = questionText.toLowerCase().trim();
    let matchedQuestionId: string | undefined;
    for (const [text, id] of questionMap) {
      if (text.toLowerCase().trim() === normalizedText) {
        matchedQuestionId = id;
        break;
      }
    }

    if (!matchedQuestionId) {
      result.warnings.push({ row: i + 1, message: `Question not found in graph: "${questionText.substring(0, 50)}..."` });
      continue;
    }

    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(isCorrectStr)) {
      result.errors.push({ row: i + 1, field: 'is_correct', message: `Invalid value: ${isCorrectStr}` });
      result.valid = false;
      continue;
    }

    const attemptedAt = new Date(attemptedAtStr);
    if (isNaN(attemptedAt.getTime())) {
      result.errors.push({ row: i + 1, field: 'attempted_at', message: `Invalid date: ${attemptedAtStr}` });
      result.valid = false;
      continue;
    }

    result.rows.push({ studentId, studentName, questionText, isCorrect, solutionScore, independenceLevel, attemptedAt });
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
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState<'standard' | 'custom' | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({ title: 'Invalid file', description: 'Please upload a CSV file', variant: 'destructive' });
      return;
    }

    // Load questions from DB
    const { data: questionsData, error } = await supabase
      .from('questions')
      .select('id, question_text')
      .eq('graph_id', graphId);

    if (error) {
      console.error('Error loading questions:', error);
      toast({ title: 'Error', description: 'Failed to load questions from graph', variant: 'destructive' });
      return;
    }

    // Build question map: normalized text -> id
    const questionMap = new Map<string, string>();
    (questionsData || []).forEach(q => {
      questionMap.set(normalizeForMatch(q.question_text), q.id);
    });

    const text = await file.text();
    const rows = parseCSVRobust(text);

    if (rows.length === 0) {
      toast({ title: 'Empty file', description: 'CSV contains no data', variant: 'destructive' });
      return;
    }

    // Auto-detect format
    const custom = isCustomFormat(rows[0]);
    setDetectedFormat(custom ? 'custom' : 'standard');

    const validationResult = custom
      ? parseCustomFormat(rows, questionMap)
      : parseStandardFormat(rows, questionMap);

    setValidation(validationResult);
  }, [graphId, toast]);

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
      // Load questions with skill mappings for mastery calculation
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, graph_id, question_text, skills, primary_skills, skill_weights')
        .eq('graph_id', graphId);

      const qMap = new Map<string, string>();
      (questionsData || []).forEach(q => {
        qMap.set(normalizeForMatch(q.question_text), q.id);
      });

      // Insert attempts
      const attempts = validation.rows.map(row => {
        const qId = qMap.get(normalizeForMatch(row.questionText));
        return qId ? {
          graph_id: graphId,
          class_id: classId || null,
          student_id: row.studentId,
          question_id: qId,
          is_correct: row.isCorrect,
          solution_score: row.solutionScore,
          independence_level: row.independenceLevel,
          independence_score: 1.0,
          attempted_at: row.attemptedAt.toISOString(),
        } : null;
      }).filter(Boolean) as any[];

      if (attempts.length === 0) {
        toast({ title: 'No valid attempts', description: 'No questions matched in the graph', variant: 'destructive' });
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
          await supabase.from('class_students').upsert({
            class_id: classId, student_id: studentId, student_name: studentName,
          }, { onConflict: 'class_id,student_id' });
        }
      }

      // Calculate and persist mastery for each student
      if (questionsData && questionsData.length > 0) {
        const questionsMap = buildQuestionsMap(questionsData);
        const attemptsByStudent = new Map<string, StudentAttempt[]>();

        for (const row of validation.rows) {
          const questionId = qMap.get(normalizeForMatch(row.questionText));
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

        for (const [studentId, studentAttempts] of attemptsByStudent) {
          await calculateAndPersistMastery(graphId, studentId, studentAttempts, questionsMap);
        }
      }

      toast({
        title: 'Upload complete',
        description: `Imported ${attempts.length} attempts and calculated mastery`,
      });

      setValidation(null);
      setDetectedFormat(null);
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
            <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            Supports standard format and NxtWave platform exports
          </p>
        </div>

        {/* Format Detection */}
        {detectedFormat && (
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded">
            Detected format: <span className="font-medium">{detectedFormat === 'custom' ? 'NxtWave Platform Export' : 'Standard CSV'}</span>
          </div>
        )}

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
                  {validation.warnings.length > 0 && (
                    <span className="text-muted-foreground text-sm ml-1">
                      ({validation.warnings.length} unmatched skipped)
                    </span>
                  )}
                </div>
              </div>
            )}

            {validation.valid && validation.rows.length > 0 && (
              <Button onClick={handleUpload} disabled={uploading} className="w-full">
                {uploading ? 'Uploading...' : `Import ${validation.rows.length} Attempts`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
