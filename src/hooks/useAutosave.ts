import { useEffect, useRef, useState, useCallback } from 'react';
import { KnowledgeGraph } from '@/types/graph';

interface AutosaveOptions {
  /** Delay in ms before autosave triggers after a change (default: 30000 = 30s) */
  debounceMs?: number;
  /** Minimum interval between saves in ms (default: 10000 = 10s) */
  minIntervalMs?: number;
  /** Whether autosave is enabled */
  enabled?: boolean;
}

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutosaveReturn {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  triggerSave: () => void;
}

export function useAutosave(
  graph: KnowledgeGraph | null,
  currentGraphId: string | null,
  saveGraph: (graph: KnowledgeGraph, name: string, description?: string, existingId?: string) => Promise<string | null>,
  graphName: string | undefined,
  options: AutosaveOptions = {}
): UseAutosaveReturn {
  const {
    debounceMs = 30000,
    minIntervalMs = 10000,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const graphSnapshotRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);

  // Generate a hash/snapshot of the graph to detect changes
  const getGraphSnapshot = useCallback((g: KnowledgeGraph): string => {
    return JSON.stringify({
      nodes: g.globalNodes.length,
      edges: g.edges.length,
      questions: Object.keys(g.questionPaths).length,
      // Include a sample of IDs to detect actual content changes
      nodeIds: g.globalNodes.slice(0, 10).map(n => n.id).join(','),
      edgeKeys: g.edges.slice(0, 10).map(e => `${e.from}-${e.to}`).join(','),
    });
  }, []);

  // Perform the actual save
  const performSave = useCallback(async () => {
    if (!graph || !currentGraphId || !graphName || isSavingRef.current) {
      return;
    }

    // Check minimum interval
    const now = Date.now();
    if (now - lastSaveTimeRef.current < minIntervalMs) {
      return;
    }

    // Check if graph actually changed since last save
    const currentSnapshot = getGraphSnapshot(graph);
    if (currentSnapshot === graphSnapshotRef.current) {
      setStatus('idle');
      return;
    }

    isSavingRef.current = true;
    setStatus('saving');

    try {
      const result = await saveGraph(graph, graphName, undefined, currentGraphId);
      if (result) {
        lastSaveTimeRef.current = Date.now();
        graphSnapshotRef.current = currentSnapshot;
        setLastSavedAt(new Date());
        setStatus('saved');
        
        // Reset to idle after showing "saved" briefly
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('[Autosave] Error:', error);
      setStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [graph, currentGraphId, graphName, saveGraph, minIntervalMs, getGraphSnapshot]);

  // Manual trigger
  const triggerSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    performSave();
  }, [performSave]);

  // Watch for graph changes and schedule autosave
  useEffect(() => {
    if (!enabled || !graph || !currentGraphId || !graphName) {
      return;
    }

    const currentSnapshot = getGraphSnapshot(graph);
    
    // If graph changed, schedule a save
    if (currentSnapshot !== graphSnapshotRef.current) {
      setStatus('pending');
      
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Schedule new save
      debounceTimerRef.current = setTimeout(() => {
        performSave();
      }, debounceMs);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [graph, currentGraphId, graphName, enabled, debounceMs, getGraphSnapshot, performSave]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (status === 'pending' && graph && currentGraphId && graphName) {
        // Attempt sync save (best effort)
        triggerSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status, graph, currentGraphId, graphName, triggerSave]);

  return {
    status,
    lastSavedAt,
    triggerSave,
  };
}
