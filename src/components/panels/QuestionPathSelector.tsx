import { ChevronDown, Route, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { QuestionPath } from '@/types/graph';
import { useState } from 'react';

interface QuestionPathSelectorProps {
  questions: Record<string, QuestionPath | string[]>;
  selectedQuestion: string | null;
  onQuestionSelect: (question: string | null) => void;
  onQuestionRemove?: (question: string) => void;
}

// Helper to get the path array from either format
const getPathArray = (path: QuestionPath | string[]): string[] => {
  if (Array.isArray(path)) {
    return path;
  }
  return path.executionOrder || path.requiredNodes || [];
};

// Helper to get step count
const getStepCount = (path: QuestionPath | string[]): number => {
  return getPathArray(path).length;
};

export function QuestionPathSelector({
  questions,
  selectedQuestion,
  onQuestionSelect,
  onQuestionRemove,
}: QuestionPathSelectorProps) {
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState<string | null>(null);
  const questionList = Object.keys(questions);

  if (questionList.length === 0) {
    return null;
  }

  const handleConfirmDelete = () => {
    if (deleteConfirmQuestion && onQuestionRemove) {
      onQuestionRemove(deleteConfirmQuestion);
      if (selectedQuestion === deleteConfirmQuestion) {
        onQuestionSelect(null);
      }
      setDeleteConfirmQuestion(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Route className="h-4 w-4" />
            {selectedQuestion ? 'Question Path' : 'View Question Path'}
            <Badge variant="secondary" className="ml-1 text-xs">
              {questionList.length}
            </Badge>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 max-h-[300px] overflow-y-auto bg-popover border border-border shadow-lg z-50">
          {questionList.map((question) => (
            <DropdownMenuItem
              key={question}
              className="flex items-start justify-between gap-2 cursor-pointer"
              onClick={() => onQuestionSelect(question)}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm line-clamp-2">{question}</span>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {getStepCount(questions[question])} steps
                  </Badge>
                  {!Array.isArray(questions[question]) && (questions[question] as QuestionPath).validationStatus && (
                    <Badge 
                      variant={(questions[question] as QuestionPath).validationStatus === 'valid' ? 'default' : 'destructive'} 
                      className="text-xs"
                    >
                      {(questions[question] as QuestionPath).validationStatus}
                    </Badge>
                  )}
                </div>
              </div>
              {onQuestionRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmQuestion(question);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmQuestion} onOpenChange={() => setDeleteConfirmQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Question?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will remove the question from the graph:</p>
              <p className="font-medium text-foreground">"{deleteConfirmQuestion}"</p>
              <p className="text-sm text-muted-foreground">
                Skills that are only used by this question will also be removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
