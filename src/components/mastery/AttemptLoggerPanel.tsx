// Manual attempt logger panel with binary scoring + granular independence

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck } from 'lucide-react';
import { calculateIndependenceScore } from '@/lib/mastery/constants';
import type { QuestionWithWeights } from '@/types/mastery';

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
  const [isCorrect, setIsCorrect] = useState(false);
  const [solutionViewed, setSolutionViewed] = useState(false);
  const [aiTutorCount, setAiTutorCount] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const independenceScore = useMemo(
    () => calculateIndependenceScore(solutionViewed, aiTutorCount, totalSubmissions),
    [solutionViewed, aiTutorCount, totalSubmissions]
  );

  // Derive independence level label
  const independenceLabel = useMemo(() => {
    if (solutionViewed) return 'Solution-Driven';
    if (aiTutorCount === 0) return 'Independent';
    if (aiTutorCount <= 2) return 'Lightly Scaffolded';
    return 'Heavily Scaffolded';
  }, [solutionViewed, aiTutorCount]);

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
      toast({ title: 'Missing information', description: 'Please select a question', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Derive independence level string for backward compat
      let independenceLevel = 'independent';
      if (solutionViewed) independenceLevel = 'solution_driven';
      else if (aiTutorCount >= 3) independenceLevel = 'heavily_assisted';
      else if (aiTutorCount >= 1) independenceLevel = 'lightly_scaffolded';

      const { error } = await supabase.from('student_attempts').insert({
        graph_id: graphId,
        class_id: classId || null,
        student_id: studentId,
        question_id: selectedQuestionId,
        is_correct: isCorrect,
        solution_score: isCorrect ? 1.0 : 0.0,
        independence_level: independenceLevel,
        solution_viewed: solutionViewed,
        ai_tutor_count: aiTutorCount,
        total_submissions: totalSubmissions,
        independence_score: independenceScore,
        attempted_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Attempt recorded',
        description: `${isCorrect ? '✓ Correct' : '✗ Incorrect'} • Independence: ${independenceScore.toFixed(1)} (${independenceLabel})`,
      });

      // Reset form
      setSelectedQuestionId('');
      setIsCorrect(false);
      setSolutionViewed(false);
      setAiTutorCount(0);
      setTotalSubmissions(1);

      onAttemptRecorded?.();
    } catch (err) {
      console.error('Error recording attempt:', err);
      toast({ title: 'Error', description: 'Failed to record attempt', variant: 'destructive' });
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
          <Select value={selectedQuestionId} onValueChange={setSelectedQuestionId} disabled={loading}>
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

        {/* Binary Score */}
        <div className="flex items-center justify-between">
          <Label htmlFor="is-correct">All Test Cases Pass?</Label>
          <Switch id="is-correct" checked={isCorrect} onCheckedChange={setIsCorrect} />
        </div>

        {/* Independence Inputs */}
        <div className="space-y-3 border rounded-lg p-3">
          <Label className="text-sm font-semibold">Independence Factors</Label>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="solution-viewed" className="text-sm font-normal">Solution Viewed?</Label>
            <Switch id="solution-viewed" checked={solutionViewed} onCheckedChange={setSolutionViewed} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ai-tutor" className="text-xs">AI Tutor Uses</Label>
              <Input
                id="ai-tutor"
                type="number"
                min={0}
                value={aiTutorCount}
                onChange={(e) => setAiTutorCount(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="total-subs" className="text-xs">Total Submissions</Label>
              <Input
                id="total-subs"
                type="number"
                min={0}
                value={totalSubmissions}
                onChange={(e) => setTotalSubmissions(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </div>

          {/* Live Independence Score */}
          <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
            <span className="text-sm font-medium">Independence Score</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{independenceLabel}</Badge>
              <span className="text-sm font-bold">{independenceScore.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button onClick={handleSubmit} disabled={!selectedQuestionId || submitting} className="w-full">
          {submitting ? 'Recording...' : 'Record Attempt'}
        </Button>
      </CardContent>
    </Card>
  );
}
