// Bulk CSV upload panel for importing student attempts

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// --- Deep normalize text for lenient matching ---
function normalizeForMatch(text: string): string {
  return text
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Strip leading numbers/bullets like "2. " or "- " or "* "
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/^\s*[-*•]\s*/, '')
    // Strip markdown images ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Strip markdown links [text](url) -> text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Strip markdown formatting (bold, italic, code)
    .replace(/[*_`#]+/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// --- Extract a short signature for contains-based matching ---
function extractSignature(normalized: string, len = 60): string {
  // Take first `len` chars of the normalized text as a matching signature
  return normalized.substring(0, len);
}

// --- Parse custom format CSV and match to DB questions ---
function parseCustomFormat(
  rows: string[][],
  dbQuestions: Array<{ id: string; question_text: string }>,
  studentName: string
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

  // Pre-normalize all DB questions for matching
  const normalizedDb = dbQuestions.map(q => ({
    id: q.id,
    normalized: normalizeForMatch(q.question_text),
    sig: extractSignature(normalizeForMatch(q.question_text)),
  }));

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

    // Match question to DB using lenient contains-based approach
    const normalizedContent = normalizeForMatch(questionContent);
    const csvSig = extractSignature(normalizedContent);
    let matchedQuestionId: string | undefined;

    // 1. Try exact normalized match
    for (const dbQ of normalizedDb) {
      if (dbQ.normalized === normalizedContent) {
        matchedQuestionId = dbQ.id;
        break;
      }
    }

    // 2. Try signature (first 60 chars) match
    if (!matchedQuestionId) {
      for (const dbQ of normalizedDb) {
        if (dbQ.sig === csvSig && csvSig.length >= 20) {
          matchedQuestionId = dbQ.id;
          break;
        }
      }
    }

    // 3. Try contains-based: does DB contain CSV sig or vice versa?
    if (!matchedQuestionId) {
      for (const dbQ of normalizedDb) {
        if (csvSig.length >= 20 && dbQ.normalized.includes(csvSig)) {
          matchedQuestionId = dbQ.id;
          break;
        }
        if (dbQ.sig.length >= 20 && normalizedContent.includes(dbQ.sig)) {
          matchedQuestionId = dbQ.id;
          break;
        }
      }
    }

    // 4. Try short text match against DB question text
    if (!matchedQuestionId && shortText) {
      const normalizedShort = normalizeForMatch(shortText);
      if (normalizedShort.length >= 10) {
        for (const dbQ of normalizedDb) {
          if (dbQ.normalized.includes(normalizedShort)) {
            matchedQuestionId = dbQ.id;
            break;
          }
        }
      }
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
      studentName: studentName || `Student ${userId.substring(0, 6)}`,
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
  const [studentName, setStudentName] = useState('');

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

    const text = await file.text();
    const rows = parseCSVRobust(text);

    if (rows.length === 0) {
      toast({ title: 'Empty file', description: 'CSV contains no data', variant: 'destructive' });
      return;
    }

    // Auto-detect format
    const custom = isCustomFormat(rows[0]);
    setDetectedFormat(custom ? 'custom' : 'standard');

    if (custom) {
      const validationResult = parseCustomFormat(rows, questionsData || [], studentName);
      setValidation(validationResult);
    } else {
      // Build question map for standard format
      const questionMap = new Map<string, string>();
      (questionsData || []).forEach(q => {
        questionMap.set(normalizeForMatch(q.question_text), q.id);
      });
      const validationResult = parseStandardFormat(rows, questionMap);
      setValidation(validationResult);
    }
  }, [graphId, toast, studentName]);

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

      // Build a text->id map for matching
      const dbQuestions = questionsData || [];
      const normalizedDb = dbQuestions.map(q => ({
        id: q.id,
        normalized: normalizeForMatch(q.question_text),
        sig: extractSignature(normalizeForMatch(q.question_text)),
      }));

      // Match each row to a question ID using lenient matching
      const matchQuestion = (text: string): string | undefined => {
        const norm = normalizeForMatch(text);
        const sig = extractSignature(norm);
        // exact
        for (const dbQ of normalizedDb) {
          if (dbQ.normalized === norm) return dbQ.id;
        }
        // sig
        for (const dbQ of normalizedDb) {
          if (dbQ.sig === sig && sig.length >= 20) return dbQ.id;
        }
        // contains
        for (const dbQ of normalizedDb) {
          if (sig.length >= 20 && dbQ.normalized.includes(sig)) return dbQ.id;
          if (dbQ.sig.length >= 20 && norm.includes(dbQ.sig)) return dbQ.id;
        }
        return undefined;
      };

      // Insert attempts
      const attempts = validation.rows.map(row => {
        const qId = matchQuestion(row.questionText);
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

      // Auto-enroll students in class
      if (classId) {
        const uniqueStudents = new Map<string, string>();
        validation.rows.forEach(row => {
          if (!uniqueStudents.has(row.studentId)) {
            uniqueStudents.set(row.studentId, row.studentName);
          }
        });
        for (const [sid, sname] of uniqueStudents) {
          await supabase.from('class_students').upsert({
            class_id: classId, student_id: sid, student_name: sname,
          }, { onConflict: 'class_id,student_id' });
        }
      }

      // Calculate and persist mastery for each student
      if (dbQuestions.length > 0) {
        const questionsMap = buildQuestionsMap(dbQuestions);
        const attemptsByStudent = new Map<string, StudentAttempt[]>();

        for (const row of validation.rows) {
          const questionId = matchQuestion(row.questionText);
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

        for (const [sid, studentAttempts] of attemptsByStudent) {
          await calculateAndPersistMastery(graphId, sid, studentAttempts, questionsMap);
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
        {/* Student Name Input */}
        <div className="space-y-1.5">
          <Label htmlFor="student-name" className="text-xs">Student Name</Label>
          <Input
            id="student-name"
            placeholder="Enter student name..."
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="h-8 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">Used for NxtWave CSV imports (overrides auto-generated name)</p>
        </div>

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
