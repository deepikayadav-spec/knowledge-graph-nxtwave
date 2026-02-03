// Hook for managing multi-select and lasso selection in edit mode

import { useState, useCallback, useEffect } from 'react';
import type { GroupingEditState } from '@/types/grouping';

interface NodePosition {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export function useGroupingEditMode() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(null);
  const [lassoEnd, setLassoEnd] = useState<{ x: number; y: number } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Track shift key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => {
      if (prev) {
        // Exiting edit mode - clear selection
        setSelectedNodeIds(new Set());
        setLassoStart(null);
        setLassoEnd(null);
      }
      return !prev;
    });
  }, []);

  // Toggle a single node's selection
  const toggleNodeSelection = useCallback((nodeId: string, addToSelection = false) => {
    setSelectedNodeIds(prev => {
      const next = new Set(addToSelection ? prev : []);
      if (prev.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Select multiple nodes (e.g., from lasso)
  const selectNodes = useCallback((nodeIds: string[], addToSelection = false) => {
    setSelectedNodeIds(prev => {
      const next = new Set(addToSelection ? prev : []);
      nodeIds.forEach(id => next.add(id));
      return next;
    });
  }, []);

  // Clear all selection
  const clearSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
  }, []);

  // Start lasso selection
  const startLasso = useCallback((x: number, y: number) => {
    setLassoStart({ x, y });
    setLassoEnd({ x, y });
  }, []);

  // Update lasso end point
  const updateLasso = useCallback((x: number, y: number) => {
    setLassoEnd({ x, y });
  }, []);

  // End lasso and select nodes within rectangle
  const endLasso = useCallback((nodePositions: NodePosition[]) => {
    if (!lassoStart || !lassoEnd) {
      setLassoStart(null);
      setLassoEnd(null);
      return;
    }

    // Calculate lasso rectangle bounds
    const minX = Math.min(lassoStart.x, lassoEnd.x);
    const maxX = Math.max(lassoStart.x, lassoEnd.x);
    const minY = Math.min(lassoStart.y, lassoEnd.y);
    const maxY = Math.max(lassoStart.y, lassoEnd.y);

    // Find nodes within the rectangle
    const selectedIds = nodePositions
      .filter(node => {
        // Check if node center is within rectangle
        return node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY;
      })
      .map(node => node.id);

    // Add to selection if shift is pressed, otherwise replace
    selectNodes(selectedIds, isShiftPressed);

    // Clear lasso
    setLassoStart(null);
    setLassoEnd(null);
  }, [lassoStart, lassoEnd, isShiftPressed, selectNodes]);

  // Cancel lasso without selecting
  const cancelLasso = useCallback(() => {
    setLassoStart(null);
    setLassoEnd(null);
  }, []);

  // Get the lasso rectangle for rendering
  const getLassoRect = useCallback(() => {
    if (!lassoStart || !lassoEnd) return null;

    return {
      x: Math.min(lassoStart.x, lassoEnd.x),
      y: Math.min(lassoStart.y, lassoEnd.y),
      width: Math.abs(lassoEnd.x - lassoStart.x),
      height: Math.abs(lassoEnd.y - lassoStart.y),
    };
  }, [lassoStart, lassoEnd]);

  // Check if a specific node is selected
  const isNodeSelected = useCallback((nodeId: string) => {
    return selectedNodeIds.has(nodeId);
  }, [selectedNodeIds]);

  // Get current edit state
  const getEditState = useCallback((): GroupingEditState => ({
    isEditMode,
    selectedNodeIds,
    lassoStart,
    lassoEnd,
  }), [isEditMode, selectedNodeIds, lassoStart, lassoEnd]);

  return {
    isEditMode,
    selectedNodeIds,
    selectedCount: selectedNodeIds.size,
    isShiftPressed,
    lassoRect: getLassoRect(),
    isLassoActive: lassoStart !== null,
    toggleEditMode,
    setEditMode: setIsEditMode,
    toggleNodeSelection,
    selectNodes,
    clearSelection,
    startLasso,
    updateLasso,
    endLasso,
    cancelLasso,
    isNodeSelected,
    getEditState,
  };
}
