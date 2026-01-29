import { ChevronDown, Route, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface QuestionPathSelectorProps {
  questions: Record<string, string[]>;
  selectedQuestion: string | null;
  onQuestionSelect: (question: string | null) => void;
}

export function QuestionPathSelector({
  questions,
  selectedQuestion,
  onQuestionSelect,
}: QuestionPathSelectorProps) {
  const questionList = Object.keys(questions);

  if (questionList.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Route className="h-4 w-4" />
            {selectedQuestion ? 'Question Path' : 'View Question Path'}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 max-h-[300px] overflow-y-auto bg-popover border border-border shadow-lg z-50">
          {questionList.map((question) => (
            <DropdownMenuItem
              key={question}
              onClick={() => onQuestionSelect(question)}
              className="flex-col items-start gap-1"
            >
              <span className="text-sm">{question}</span>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  {questions[question].length} steps
                </Badge>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedQuestion && (
        <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-1.5">
          <span className="text-sm text-accent font-medium truncate max-w-xs">
            {selectedQuestion}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onQuestionSelect(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
