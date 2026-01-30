import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface QuickQuestionInputProps {
  onGenerate: (questions: string[]) => void;
  isLoading: boolean;
  isLandingMode?: boolean;
}

export function QuickQuestionInput({ onGenerate, isLoading, isLandingMode = false }: QuickQuestionInputProps) {
  const [questionsText, setQuestionsText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (!questionsText.trim()) return;
    
    const questions = questionsText
      .split(/\n\s*\n/)  // Split on blank lines
      .map(q => q.trim())
      .filter(q => q.length > 0);
    
    if (questions.length === 0) return;
    
    onGenerate(questions);
    setQuestionsText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  if (isLandingMode) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Add Your Questions</h2>
            <p className="text-muted-foreground">
              Enter coding questions below (separate with blank lines) to generate a knowledge graph
            </p>
          </div>
          
          <Textarea
            placeholder="Write a function to check if a key exists in a dictionary.&#10;The function should handle nested dictionaries.&#10;&#10;Implement a function to count word frequencies.&#10;It should ignore case and punctuation."
            value={questionsText}
            onChange={(e) => setQuestionsText(e.target.value)}
            className="min-h-[200px] text-sm resize-none"
            onKeyDown={handleKeyDown}
          />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {questionsText.split(/\n\s*\n/).filter(q => q.trim()).length} question(s)
            </span>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !questionsText.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Graph...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Generate Knowledge Graph
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col gap-2 p-3 rounded-lg border border-border bg-card shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
    >
      <span className="text-sm font-medium text-foreground">Add More Questions</span>
      
      <Textarea
        placeholder="Enter questions (separate with blank lines)"
        value={questionsText}
        onChange={(e) => setQuestionsText(e.target.value)}
        className="min-h-[80px] text-sm resize-none"
        onKeyDown={handleKeyDown}
      />
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {questionsText.split(/\n\s*\n/).filter(q => q.trim()).length} question(s) · ⌘+Enter to submit
        </span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isLoading || !questionsText.trim()}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
