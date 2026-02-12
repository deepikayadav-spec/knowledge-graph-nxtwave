// Manual attempt logger panel with coding solution scoring rubric

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck } from 'lucide-react';
import { CODING_RUBRIC_DIMENSIONS, CODING_RUBRIC_TOTAL } from '@/lib/mastery/constants';
import type { IndependenceLevel, QuestionWithWeights } from '@/types/mastery';

interface AttemptLoggerPanelProps {
  graphId: string;
  studentId: string;
  studentName: string;
  classId?: string;
  onAttemptRecorded?: () => void;
}

export function AttemptLoggerPanel({
  graphId,
  studentId,
  studentName,
  classId,
  onAttemptRecorded,
}: AttemptLoggerPanelProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuestionWithWeights[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [independenceLevel, setIndependenceLevel] = useState<IndependenceLevel>('independent');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Rubric state: marks selected per dimension (index-aligned with CODING_RUBRIC_DIMENSIONS)
  const [rubricMarks, setRubricMarks] = useState<number[]>(
    CODING_RUBRIC_DIMENSIONS.map(() => 0)
  );

  const totalMarks = useMemo(() => rubricMarks.reduce((s, m) => s + m, 0), [rubricMarks]);
  const solutionScore = totalMarks / CODING_RUBRIC_TOTAL;
  const solutionPercent = Math.round(solutionScore * 100);

  // Load questions for this graph
  useEffect(() => {
    if (!graphId) return;

    const loadQuestions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('id, graph_id, question_text, skills, primary_skills, skill_weights, weightage_multiplier')
          .eq('graph_id', graphId);

        if (error) throw error;

        setQuestions(
          (data || []).map(q => ({
            id: q.id,
            graphId: q.graph_id,
            questionText: q.question_text,
            skills: q.skills || [],
            primarySkills: q.primary_skills || [],
            skillWeights: (q.skill_weights as Record<string, number>) || {},
            weightageMultiplier: q.weightage_multiplier ?? 1.0,
          }))
        );
      } catch (err) {
        console.error('Error loading questions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [graphId]);

  const handleSubmit = async () => {
    if (!selectedQuestionId || !studentId) {
      toast({
        title: 'Missing information',
        description: 'Please select a question',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const isCorrect = solutionScore >= 0.5;

      const { error } = await supabase.from('student_attempts').insert({
        graph_id: graphId,
        class_id: classId || null,
        student_id: studentId,
        question_id: selectedQuestionId,
        is_correct: isCorrect,
        solution_score: solutionScore,
        independence_level: independenceLevel,
        attempted_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Attempt recorded',
        description: `Score ${solutionPercent}% logged for ${studentName}`,
      });

      // Reset form
      setSelectedQuestionId('');
      setRubricMarks(CODING_RUBRIC_DIMENSIONS.map(() => 0));
      setIndependenceLevel('independent');

      onAttemptRecorded?.();
    } catch (err) {
      console.error('Error recording attempt:', err);
      toast({
        title: 'Error',
        description: 'Failed to record attempt',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" />
          Log Attempt for {studentName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question Selection */}
        <div className="space-y-2">
          <Label>Question</Label>
          <Select
            value={selectedQuestionId}
            onValueChange={setSelectedQuestionId}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a question" />
            </SelectTrigger>
            <SelectContent>
              {questions.map(q => (
                <SelectItem key={q.id} value={q.id}>
                  <span className="line-clamp-1">
                    {q.questionText.substring(0, 60)}
                    {q.questionText.length > 60 ? '...' : ''}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedQuestion && (
            <div className="text-xs text-muted-foreground mt-1">
              KPs: {selectedQuestion.skills.join(', ')}
            </div>
          )}
        </div>

        {/* Coding Solution Rubric */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Solution Scoring Rubric</Label>
          {CODING_RUBRIC_DIMENSIONS.map((dim, dimIdx) => (
            <div key={dim.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{dim.name}</span>
                <span className="text-xs text-muted-foreground">
                  {rubricMarks[dimIdx]} / {dim.maxMarks}
                </span>
              </div>
              <RadioGroup
                value={String(rubricMarks[dimIdx])}
                onValueChange={(v) => {
                  const newMarks = [...rubricMarks];
                  newMarks[dimIdx] = parseFloat(v);
                  setRubricMarks(newMarks);
                }}
                className="flex flex-wrap gap-2"
              >
                {dim.levels.map(level => (
                  <div key={level.label} className="flex items-center space-x-1">
                    <RadioGroupItem
                      value={String(level.marks)}
                      id={`${dim.name}-${level.label}`}
                    />
                    <Label
                      htmlFor={`${dim.name}-${level.label}`}
                      className="font-normal cursor-pointer text-xs"
                    >
                      {level.label} ({level.marks})
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}

          {/* Live Score */}
          <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
            <span className="text-sm font-medium">Solution Score</span>
            <span className={`text-sm font-bold ${
              solutionPercent >= 70 ? 'text-green-600 dark:text-green-400' :
              solutionPercent >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {totalMarks} / {CODING_RUBRIC_TOTAL} = {solutionPercent}%
            </span>
          </div>
        </div>

        {/* Independence Level */}
        <div className="space-y-2">
          <Label>Independence Level</Label>
          <RadioGroup
            value={independenceLevel}
            onValueChange={(v) => setIndependenceLevel(v as IndependenceLevel)}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="independent" id="independent" />
              <Label htmlFor="independent" className="font-normal cursor-pointer">
                Independent (100% credit)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lightly_scaffolded" id="lightly_scaffolded" />
              <Label htmlFor="lightly_scaffolded" className="font-normal cursor-pointer">
                Lightly Scaffolded (70% credit)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="heavily_assisted" id="heavily_assisted" />
              <Label htmlFor="heavily_assisted" className="font-normal cursor-pointer">
                Heavily Assisted (40% credit)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="solution_driven" id="solution_driven" />
              <Label htmlFor="solution_driven" className="font-normal cursor-pointer">
                Solution-Driven (20% credit)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!selectedQuestionId || submitting}
          className="w-full"
        >
          {submitting ? 'Recording...' : 'Record Attempt'}
        </Button>
      </CardContent>
    </Card>
  );
}
