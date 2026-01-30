import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { KnowledgeGraph, GraphNode, GraphEdge, QuestionPath } from '@/types/graph';
import { Progress } from '@/components/ui/progress';

interface QuestionInputPanelProps {
  onGraphGenerated: (graph: KnowledgeGraph) => void;
  isOpen: boolean;
  onClose: () => void;
}

const BATCH_SIZE = 5; // Reduced to 5 for detailed multi-line questions

function mergeGraphs(graphs: KnowledgeGraph[]): KnowledgeGraph {
  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];
  const courses: Record<string, { nodes: { id: string; inCourse: boolean }[] }> = {};
  const questionPaths: Record<string, QuestionPath | string[]> = {};

  for (const graph of graphs) {
    // Merge nodes (dedupe by id)
    for (const node of graph.globalNodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      } else {
        // Merge appearsInQuestions arrays
        const existing = nodeMap.get(node.id)!;
        const existingQuestions = existing.knowledgePoint?.appearsInQuestions || [];
        const newQuestions = node.knowledgePoint?.appearsInQuestions || [];
        const merged = [...new Set([...existingQuestions, ...newQuestions])];
        existing.knowledgePoint = { ...existing.knowledgePoint, appearsInQuestions: merged };
      }
    }

    // Merge edges (dedupe by from+to)
    for (const edge of graph.edges) {
      const key = `${edge.from}:${edge.to}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push(edge);
      }
    }

    // Merge courses
    for (const [courseName, courseData] of Object.entries(graph.courses || {})) {
      if (!courses[courseName]) {
        courses[courseName] = { nodes: [] };
      }
      const existingIds = new Set(courses[courseName].nodes.map(n => n.id));
      for (const node of courseData.nodes) {
        if (!existingIds.has(node.id)) {
          courses[courseName].nodes.push(node);
          existingIds.add(node.id);
        }
      }
    }

    // Merge question paths
    Object.assign(questionPaths, graph.questionPaths || {});
  }

  return {
    globalNodes: Array.from(nodeMap.values()),
    edges,
    courses,
    questionPaths,
  };
}

export function QuestionInputPanel({ onGraphGenerated, isOpen, onClose }: QuestionInputPanelProps) {
  const [questionsText, setQuestionsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const handleGenerate = async () => {
    const questions = questionsText
      .split(/\n\s*\n/)  // Split on blank lines
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
    setProgress(0);

    try {
      // Split into batches if needed
      const batches: string[][] = [];
      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        batches.push(questions.slice(i, i + BATCH_SIZE));
      }

      const graphs: KnowledgeGraph[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setStatusText(`Processing batch ${i + 1} of ${batches.length} (${batch.length} questions)...`);
        setProgress(((i) / batches.length) * 100);

        const { data, error } = await supabase.functions.invoke('generate-graph', {
          body: { questions: batch },
        });

        if (error) {
          throw error;
        }

        if (data.error) {
          throw new Error(data.error);
        }

        graphs.push({
          globalNodes: data.globalNodes || [],
          edges: data.edges || [],
          courses: data.courses || {},
          questionPaths: data.questionPaths || {},
        });

        setProgress(((i + 1) / batches.length) * 100);
      }

      // Merge all batch results
      setStatusText('Merging results...');
      const mergedGraph = batches.length === 1 ? graphs[0] : mergeGraphs(graphs);

      onGraphGenerated(mergedGraph);
      onClose();
      
      toast({
        title: "Graph generated!",
        description: `Created ${mergedGraph.globalNodes.length} concept nodes with ${mergedGraph.edges.length} relationships.`,
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
      setProgress(0);
      setStatusText('');
    }
  };

  if (!isOpen) return null;

  const questionCount = questionsText.split(/\n\s*\n/).filter(q => q.trim().length > 0).length;
  const batchCount = Math.ceil(questionCount / BATCH_SIZE);

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
            <label htmlFor="questions" className="flex items-center gap-2 text-sm font-medium">
              <Code className="h-4 w-4 text-muted-foreground" />
              Coding Questions (separate with blank lines)
            </label>
            <Textarea
              id="questions"
              placeholder={`Write a function that checks if a key exists in a dictionary.
The function should handle nested dictionaries and return True/False.

Implement a function to count word frequencies in a text.
It should ignore case and punctuation.

Create a function that merges two sorted lists into one sorted list.`}
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              disabled={isLoading}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Separate each question with a blank line. Multi-line descriptions are supported.
              {questionCount > BATCH_SIZE && (
                <span className="block mt-1 text-primary">
                  {questionCount} questions will be processed in {batchCount} batches.
                </span>
              )}
            </p>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{statusText}</p>
            </div>
          )}

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
                  Analyzing...
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
