import { RefreshCw, ChevronDown, ChevronRight, User } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TopicScoreRange } from '@/types/grouping';
import { getGradeBoundaries } from '@/lib/mastery/gradeScale';
import { calculateStudentTopicGrades, type TopicGrade } from '@/lib/mastery/studentTopicGrades';
import { supabase } from '@/integrations/supabase/client';

interface TopicScoreTableProps {
  topicScoreRanges: TopicScoreRange[];
  graphId: string;
  onRecalculate: () => void;
  isRecalculating?: boolean;
}

export function TopicScoreTable({ topicScoreRanges, graphId, onRecalculate, isRecalculating }: TopicScoreTableProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [students, setStudents] = useState<Array<{ student_id: string; student_name: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [topicGrades, setTopicGrades] = useState<TopicGrade[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // Load unique students for this graph
  useEffect(() => {
    if (!graphId) return;
    (async () => {
      const { data } = await supabase
        .from('student_attempts')
        .select('student_id')
        .eq('graph_id', graphId);
      
      if (data) {
        // Get unique student IDs
        const uniqueIds = [...new Set(data.map(d => d.student_id))];
        // Look up names from class_students
        const { data: names } = await supabase
          .from('class_students')
          .select('student_id, student_name')
          .in('student_id', uniqueIds);
        
        const nameMap = new Map((names || []).map(n => [n.student_id, n.student_name]));
        setStudents(uniqueIds.map(id => ({
          student_id: id,
          student_name: nameMap.get(id) || id,
        })));
      }
    })();
  }, [graphId]);

  // Load topic grades when student is selected
  const loadGrades = useCallback(async (studentId: string) => {
    if (!studentId || !graphId) {
      setTopicGrades([]);
      return;
    }
    setLoadingGrades(true);
    try {
      const grades = await calculateStudentTopicGrades(studentId, graphId);
      setTopicGrades(grades);
    } catch (err) {
      console.error('Error loading topic grades:', err);
    }
    setLoadingGrades(false);
  }, [graphId]);

  useEffect(() => {
    if (selectedStudent) loadGrades(selectedStudent);
  }, [selectedStudent, loadGrades]);

  if (topicScoreRanges.length === 0) return null;

  const toggleExpand = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const showStudentView = selectedStudent && topicGrades.length > 0;

  return (
    <div className="w-[280px] shrink-0 border-l border-border bg-card/50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground">Topic Scores & Grades</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRecalculate}
          disabled={isRecalculating}
        >
          <RefreshCw className={`h-3 w-3 ${isRecalculating ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Student Selector */}
      {students.length > 0 && (
        <div className="px-3 py-2 border-b border-border">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="h-7 text-[11px]">
              <User className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Select student..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">All (no student)</SelectItem>
              {students.map(s => (
                <SelectItem key={s.student_id} value={s.student_id}>
                  {s.student_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {showStudentView ? (
          /* Student mastery view */
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] h-8 px-2">Topic</TableHead>
                <TableHead className="text-[10px] h-8 px-2 text-right">Mastery</TableHead>
                <TableHead className="text-[10px] h-8 px-2 text-right">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingGrades ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                topicGrades.map(tg => {
                  const isExpanded = expandedTopics.has(tg.topicId);
                  return (
                    <>
                      <TableRow
                        key={tg.topicId}
                        className="cursor-pointer"
                        onClick={() => toggleExpand(tg.topicId)}
                      >
                        <TableCell className="text-[11px] px-2 py-1.5 max-w-[120px]">
                          <div className="flex items-center gap-1">
                            {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                            <span className="truncate" title={tg.topicName}>{tg.topicName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] px-2 py-1.5 text-right font-medium">
                          {Math.round(tg.masteryPercent * 100)}%
                        </TableCell>
                        <TableCell className="text-[11px] px-2 py-1.5 text-right">
                          <Badge
                            className="text-[9px] px-1.5 py-0 h-4 font-bold border-0"
                            style={{ backgroundColor: tg.gradeColor, color: '#fff' }}
                          >
                            {tg.grade}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {isExpanded && tg.subtopics.map(st => (
                        <TableRow key={st.subtopicId} className="bg-muted/30">
                          <TableCell className="text-[10px] px-2 py-1 pl-7 max-w-[120px]">
                            <span className="truncate block" title={st.subtopicName}>{st.subtopicName}</span>
                          </TableCell>
                          <TableCell className="text-[10px] px-2 py-1 text-right text-muted-foreground">
                            {Math.round(st.masteryPercent * 100)}%
                          </TableCell>
                          <TableCell className="text-[10px] px-2 py-1 text-right" />
                        </TableRow>
                      ))}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        ) : (
          /* Default view: topic score ranges */
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] h-8 px-2">Topic</TableHead>
                <TableHead className="text-[10px] h-8 px-2 text-right">Max</TableHead>
                <TableHead className="text-[10px] h-8 px-2 text-right">Qs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topicScoreRanges.map(range => {
                const isExpanded = expandedTopics.has(range.topicId);
                const boundaries = getGradeBoundaries(range.maxScore);
                return (
                  <>
                    <TableRow
                      key={range.topicId}
                      className="cursor-pointer"
                      onClick={() => toggleExpand(range.topicId)}
                    >
                      <TableCell className="text-[11px] px-2 py-1.5 max-w-[140px]">
                        <div className="flex items-center gap-1">
                          {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                          <span className="truncate" title={range.topicName}>{range.topicName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] px-2 py-1.5 text-right font-medium">
                        {range.maxScore}
                      </TableCell>
                      <TableCell className="text-[11px] px-2 py-1.5 text-right text-muted-foreground">
                        {range.uniqueQuestions}
                      </TableCell>
                    </TableRow>
                    {isExpanded && boundaries.map(b => (
                      <TableRow key={`${range.topicId}-${b.grade}`} className="bg-muted/30">
                        <TableCell colSpan={2} className="text-[10px] px-2 py-1 pl-7">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className="text-[9px] px-1.5 py-0 h-4 font-bold border-0"
                              style={{ backgroundColor: b.color, color: '#fff' }}
                            >
                              {b.grade}
                            </Badge>
                            <span className="text-muted-foreground">{b.minScore}+</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] px-2 py-1 text-right text-muted-foreground">
                          {b.grade === 'F' ? `0–${boundaries[boundaries.length - 2].minScore - 1}` : `${b.minScore}–${range.maxScore}`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
