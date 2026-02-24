// Mastery sidebar container that manages state and renders mastery panels

import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, GraduationCap, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttemptLoggerPanel } from './AttemptLoggerPanel';
import { BulkUploadPanel } from './BulkUploadPanel';
import { MasteryOverview } from './MasteryOverview';
import { ClassAnalyticsPanel } from './ClassAnalyticsPanel';
import { HierarchicalMasteryView } from './HierarchicalMasteryView';
import { useClassAnalytics } from '@/hooks/useClassAnalytics';
import { useSkillGrouping } from '@/hooks/useSkillGrouping';
import type { GraphNode } from '@/types/graph';
import type { KPMastery } from '@/types/mastery';


interface MasterySidebarProps {
  graphId: string;
  classId: string;
  className?: string;
  studentId: string | null;
  studentName: string | null;
  skills: GraphNode[];
  // Edit mode props
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  // Mastery from parent (lifted hook)
  studentMastery: Map<string, KPMastery>;
  onMasteryRefresh: () => void;
}

export function MasterySidebar({
  graphId,
  classId,
  className,
  studentId,
  studentName,
  skills,
  isEditMode = false,
  onToggleEditMode,
  studentMastery,
  onMasteryRefresh,
}: MasterySidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('log');
  // Create skill names map
  const skillNames = useMemo(() => {
    const map: Record<string, string> = {};
    skills.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [skills]);

  // Create mastery records array from the map passed from parent
  const masteryRecords = useMemo(
    () => Array.from(studentMastery.values()),
    [studentMastery]
  );

  // Fetch class analytics
  const classAnalyticsHook = useClassAnalytics({
    classId,
    autoLoad: true,
  });

  // Skill grouping
  const groupingHook = useSkillGrouping({
    graphId,
    autoLoad: true,
  });

  // Refetch on attempt recorded
  const handleAttemptRecorded = () => {
    onMasteryRefresh();
    classAnalyticsHook.loadAnalytics();
  };

  // Handle creating a topic
  const handleCreateTopic = useCallback(async (name: string, color: string) => {
    await groupingHook.createTopic(name, color);
  }, [groupingHook]);

  // Handle deleting a topic
  const handleDeleteTopic = useCallback(async (topicId: string) => {
    await groupingHook.deleteTopic(topicId);
  }, [groupingHook]);

  // Handle deleting a subtopic
  const handleDeleteSubtopic = useCallback(async (subtopicId: string) => {
    await groupingHook.deleteSubtopic(subtopicId);
  }, [groupingHook]);

  // Handle assigning subtopic to topic
  const handleAssignSubtopicToTopic = useCallback(async (subtopicId: string, topicId: string | null) => {
    await groupingHook.assignSubtopicToTopic(subtopicId, topicId);
  }, [groupingHook]);

  return (
    <div className="w-96 border-l border-border bg-card/50 flex flex-col overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex flex-col flex-1">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors shrink-0">
            <span className="font-medium text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Mastery Tracking
              {studentName && (
                <Badge variant="secondary" className="text-xs">
                  {studentName}
                </Badge>
              )}
              {!studentId && (
                <Badge variant="outline" className="text-xs">
                  Class Average
                </Badge>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="mx-4 mt-4 shrink-0">
              <TabsTrigger value="log" className="flex-1">Log</TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
              <TabsTrigger value="groups" className="flex-1">Groups</TabsTrigger>
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            </TabsList>

            <div className="flex-1 p-4 overflow-y-auto">
              <TabsContent value="log" className="mt-0 space-y-4">
                {studentId && studentName ? (
                  <AttemptLoggerPanel
                    graphId={graphId}
                    classId={classId}
                    studentId={studentId}
                    studentName={studentName}
                    onAttemptRecorded={handleAttemptRecorded}
                  />
                ) : (
                  <div className="text-center text-muted-foreground p-4">
                    <p className="text-sm">Select a student to log attempts</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upload" className="mt-0 space-y-4">
                <BulkUploadPanel
                  graphId={graphId}
                  classId={classId}
                  onUploadComplete={handleAttemptRecorded}
                />
              </TabsContent>

              <TabsContent value="groups" className="mt-0 space-y-4">
                {/* Edit Groups button */}
                {onToggleEditMode && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground flex-1">
                      {isEditMode ? 'Select knowledge points on the graph to create subtopics' : 'Organize knowledge points into subtopics and topics'}
                    </p>
                    <Button
                      size="sm"
                      variant={isEditMode ? 'default' : 'outline'}
                      onClick={onToggleEditMode}
                      className="gap-1.5"
                    >
                      <Pencil className="h-4 w-4" />
                      {isEditMode ? 'Done' : 'Edit'}
                    </Button>
                  </div>
                )}

                <HierarchicalMasteryView
                  topics={groupingHook.topics}
                  subtopics={groupingHook.subtopics}
                  skillMastery={studentId ? studentMastery : new Map()}
                  skillToSubtopic={groupingHook.skillSubtopicMap}
                  skillNames={skillNames}
                  onCreateTopic={handleCreateTopic}
                  onDeleteTopic={handleDeleteTopic}
                  onDeleteSubtopic={handleDeleteSubtopic}
                  onAssignSubtopicToTopic={handleAssignSubtopicToTopic}
                />
              </TabsContent>

              <TabsContent value="overview" className="mt-0 space-y-4">
                {studentId && studentName ? (
                  <MasteryOverview
                    studentId={studentId}
                    studentName={studentName}
                    masteryRecords={masteryRecords}
                    skillNames={skillNames}
                  />
                ) : (
                  <ClassAnalyticsPanel
                    analytics={classAnalyticsHook.analytics}
                    studentSummaries={classAnalyticsHook.studentSummaries}
                    skillNames={skillNames}
                    loading={classAnalyticsHook.loading}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
