// Mastery sidebar container that manages state and renders mastery panels

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttemptLoggerPanel } from './AttemptLoggerPanel';
import { BulkUploadPanel } from './BulkUploadPanel';
import { MasteryOverview } from './MasteryOverview';
import { ClassAnalyticsPanel } from './ClassAnalyticsPanel';
import { useStudentMastery } from '@/hooks/useStudentMastery';
import { useClassAnalytics } from '@/hooks/useClassAnalytics';
import type { GraphNode } from '@/types/graph';

interface MasterySidebarProps {
  graphId: string;
  classId: string;
  className?: string;
  studentId: string | null;
  studentName: string | null;
  skills: GraphNode[];
}

export function MasterySidebar({
  graphId,
  classId,
  className,
  studentId,
  studentName,
  skills,
}: MasterySidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('log');

  // Create skill names map
  const skillNames = useMemo(() => {
    const map: Record<string, string> = {};
    skills.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [skills]);

  // Fetch student mastery data
  const studentMasteryHook = useStudentMastery({
    graphId,
    studentId: studentId || '',
    autoLoad: !!studentId,
  });
  const masteryRecords = useMemo(
    () => Array.from(studentMasteryHook.mastery.values()),
    [studentMasteryHook.mastery]
  );

  // Fetch class analytics
  const classAnalyticsHook = useClassAnalytics({
    classId,
    autoLoad: true,
  });

  // Refetch on attempt recorded
  const handleAttemptRecorded = () => {
    studentMasteryHook.loadMastery();
    classAnalyticsHook.loadAnalytics();
  };

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
