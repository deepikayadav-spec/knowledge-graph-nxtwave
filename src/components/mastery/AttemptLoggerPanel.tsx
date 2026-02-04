// Manual attempt logger panel for recording student attempts

import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, Check, X } from 'lucide-react';
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
  const [isCorrect, setIsCorrect] = useState<boolean>(true);
  const [independenceLevel, setIndependenceLevel] = useState<IndependenceLevel>('independent');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load questions for this graph
  useEffect(() => {
    if (!graphId) return;

    const loadQuestions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('id, graph_id, question_text, skills, primary_skills, skill_weights')
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
      const { error } = await supabase.from('student_attempts').insert({
        graph_id: graphId,
        class_id: classId || null,
        student_id: studentId,
        question_id: selectedQuestionId,
        is_correct: isCorrect,
        independence_level: independenceLevel,
        attempted_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Attempt recorded',
        description: `${isCorrect ? 'Correct' : 'Incorrect'} answer logged for ${studentName}`,
      });

      // Reset form
      setSelectedQuestionId('');
      setIsCorrect(true);
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
              Skills: {selectedQuestion.skills.join(', ')}
            </div>
          )}
        </div>

        {/* Correct/Incorrect Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="is-correct">Answer</Label>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm flex items-center gap-1 ${
                !isCorrect ? 'text-destructive font-medium' : 'text-muted-foreground'
              }`}
            >
              <X className="h-4 w-4" />
              Wrong
            </span>
            <Switch
              id="is-correct"
              checked={isCorrect}
              onCheckedChange={setIsCorrect}
            />
            <span
              className={`text-sm flex items-center gap-1 ${
                isCorrect ? 'text-green-600 font-medium' : 'text-muted-foreground'
              }`}
            >
              <Check className="h-4 w-4" />
              Correct
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
