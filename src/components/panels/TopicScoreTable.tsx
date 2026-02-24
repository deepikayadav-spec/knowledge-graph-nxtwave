import { RefreshCw, ChevronDown, ChevronRight, User } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getGradeBoundaries } from '@/lib/mastery/gradeScale';
import { calculateStudentTopicGrades, type TopicGrade } from '@/lib/mastery/studentTopicGrades';
import { supabase } from '@/integrations/supabase/client';

interface TopicScoreTableProps {
  graphId: string;
  onRecalculate: () => void;
  isRecalculating?: boolean;
}

interface TopicInfo {
  id: string;
  name: string;
  questionCount: number;
}

export function TopicScoreTable({ graphId, onRecalculate, isRecalculating }: TopicScoreTableProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [students, setStudents] = useState<Array<{ student_id: string; student_name: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [topicGrades, setTopicGrades] = useState<TopicGrade[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [topics, setTopics] = useState<TopicInfo[]>([]);

  // Load topics with question counts
  useEffect(() => {
    if (!graphId) return;
    (async () => {
      // Load topics
      const { data: topicsData } = await supabase
        .from('skill_topics')
        .select('id, name')
        .eq('graph_id', graphId);

      if (!topicsData || topicsData.length === 0) { setTopics([]); return; }

      // Load subtopics, skills, questions for counting
      const [{ data: subtopics }, { data: skills }, { data: questions }] = await Promise.all([
        supabase.from('skill_subtopics').select('id, topic_id').eq('graph_id', graphId).not('topic_id', 'is', null),
        supabase.from('skills').select('skill_id, subtopic_id').eq('graph_id', graphId).not('subtopic_id', 'is', null),
        supabase.from('questions').select('id, skills').eq('graph_id', graphId),
      ]);

      const subtopicToTopic = new Map<string, string>();
      (subtopics || []).forEach(st => { if (st.topic_id) subtopicToTopic.set(st.id, st.topic_id); });

      const skillToTopic = new Map<string, string>();
      (skills || []).forEach(s => {
        if (s.subtopic_id) {
          const topicId = subtopicToTopic.get(s.subtopic_id);
          if (topicId) skillToTopic.set(s.skill_id, topicId);
        }
      });

      const topicQuestions = new Map<string, Set<string>>();
      topicsData.forEach(t => topicQuestions.set(t.id, new Set()));

      (questions || []).forEach(q => {
        for (const skillId of (q.skills || [])) {
          const topicId = skillToTopic.get(skillId);
          if (topicId) topicQuestions.get(topicId)?.add(q.id);
        }
      });

      setTopics(topicsData.map(t => ({
        id: t.id,
        name: t.name,
        questionCount: topicQuestions.get(t.id)?.size || 0,
      })));
    })();
  }, [graphId]);

  // Load unique students for this graph
  useEffect(() => {
    if (!graphId) return;
    (async () => {
      const { data } = await supabase
        .from('student_attempts')
        .select('student_id')
        .eq('graph_id', graphId);
      
      if (data) {
        const uniqueIds = [...new Set(data.map(d => d.student_id))];
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

  if (topics.length === 0) return null;

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
        <h3 className="text-xs font-semibold text-foreground">Topic Grades</h3>
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
          /* Default view: simple topic list with question counts */
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] h-8 px-2">Topic</TableHead>
                <TableHead className="text-[10px] h-8 px-2 text-right">Questions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map(topic => (
                <TableRow key={topic.id}>
                  <TableCell className="text-[11px] px-2 py-1.5 max-w-[160px]">
                    <span className="truncate block" title={topic.name}>{topic.name}</span>
                  </TableCell>
                  <TableCell className="text-[11px] px-2 py-1.5 text-right font-medium text-muted-foreground">
                    {topic.questionCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
