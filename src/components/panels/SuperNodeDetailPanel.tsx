import type { SuperNode } from '@/lib/graph/groupedView';
import type { GraphNode } from '@/types/graph';
import type { TopicScoreRange } from '@/types/grouping';
import { X, Layers, FolderOpen, BarChart3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface SuperNodeDetailPanelProps {
  superNode: SuperNode;
  skills: GraphNode[];
  onClose: () => void;
  onSkillSelect: (skillId: string) => void;
  scoreRange?: TopicScoreRange;
}

export function SuperNodeDetailPanel({
  superNode,
  skills,
  onClose,
  onSkillSelect,
  scoreRange,
}: SuperNodeDetailPanelProps) {
  const typeLabel = superNode.type === 'topic' ? 'Topic' : 'Subtopic';
  const TypeIcon = superNode.type === 'topic' ? Layers : FolderOpen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: superNode.color + '22', border: `2px solid ${superNode.color}` }}
            >
              <TypeIcon className="h-5 w-5" style={{ color: superNode.color }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{superNode.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>
                <span className="text-xs text-muted-foreground">
                  {superNode.skillCount} knowledge point{superNode.skillCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Score range stats for topic nodes */}
        {superNode.type === 'topic' && scoreRange && (
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
            <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Min:</span>{' '}
                <span className="font-semibold text-foreground">{scoreRange.minScore}</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div>
                <span className="text-muted-foreground">Max:</span>{' '}
                <span className="font-semibold text-foreground">{scoreRange.maxScore}</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div>
                <span className="text-muted-foreground">{scoreRange.uniqueQuestions} question{scoreRange.uniqueQuestions !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        )}

        {/* Skill list */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-3 space-y-1">
            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No knowledge points found.</p>
            ) : (
              skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => onSkillSelect(skill.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/70 transition-colors group"
                >
                  <div className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                    {skill.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                    {skill.id}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
