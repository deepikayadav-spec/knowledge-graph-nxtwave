import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, BookOpen, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { KnowledgeGraph } from '@/types/graph';

interface QuestionInputPanelProps {
  onGraphGenerated: (graph: KnowledgeGraph) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function QuestionInputPanel({ onGraphGenerated, isOpen, onClose }: QuestionInputPanelProps) {
  const [courseName, setCourseName] = useState('');
  const [questionsText, setQuestionsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!courseName.trim()) {
      toast({
        title: "Course name required",
        description: "Please enter a course name.",
        variant: "destructive",
      });
      return;
    }

    const questions = questionsText
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (questions.length < 1) {
      toast({
        title: "Questions required",
        description: "Please enter at least one coding question.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-graph', {
        body: { courseName: courseName.trim(), questions },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Transform the response to match our expected format
      const graph: KnowledgeGraph = {
        globalNodes: data.globalNodes || [],
        edges: data.edges || [],
        courses: data.courses || {},
        questionPaths: data.questionPaths || {},
      };

      onGraphGenerated(graph);
      onClose();
      
      toast({
        title: "Graph generated!",
        description: `Created ${graph.globalNodes.length} concept nodes with ${graph.edges.length} relationships.`,
      });
    } catch (error) {
      console.error('Graph generation error:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate knowledge graph.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-2xl mx-4 shadow-2xl border-border/50">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-accent-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Generate Knowledge Graph</CardTitle>
              <CardDescription>
                Paste your coding questions and we'll analyze them using IPA methodology
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="courseName" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Course Name
            </Label>
            <Input
              id="courseName"
              placeholder="e.g., Python Fundamentals, Data Structures 101"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="questions" className="flex items-center gap-2">
              <Code className="h-4 w-4 text-muted-foreground" />
              Coding Questions (one per line)
            </Label>
            <Textarea
              id="questions"
              placeholder={`Write a function that checks if a key exists in a dictionary
Implement a function to count word frequencies in a text
Create a function that merges two sorted lists
Write code to find the most common element in a list`}
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              disabled={isLoading}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter each coding question on a new line. The AI will analyze mental steps needed to solve each.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex-1 gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing Questions...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Graph
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
