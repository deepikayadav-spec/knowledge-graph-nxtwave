import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { GraphNode, GraphEdge, NodeType } from '@/types/graph';
import { GraphNodeComponent } from './GraphNode';
import { GraphEdgeComponent } from './GraphEdge';
import { ZoomControls } from './ZoomControls';
import { LassoSelector } from './LassoSelector';
import { GroupingToolbar } from './GroupingToolbar';
import { SuperNodeComponent } from './SuperNode';
import type { SkillSubtopic } from '@/types/grouping';
import type { KPMastery } from '@/types/mastery';
import type { ViewMode } from './ViewModeToggle';
import type { GroupedGraphData, SuperNode } from '@/lib/graph/groupedView';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  courseNodeIds?: Set<string>;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  highlightedPath?: string[];
  // Edit mode props
  isEditMode?: boolean;
  selectedGroupingNodeIds?: Set<string>;
  onNodeSelectionChange?: (nodeIds: Set<string>) => void;
  onCreateSubtopic?: (name: string, color: string) => void;
  subtopics?: SkillSubtopic[];
  skillSubtopicMap?: Map<string, string>;
  // Mastery visualization props
  studentMastery?: Map<string, KPMastery>;
  showMasteryVisuals?: boolean;
  // Grouped view props
  viewMode?: ViewMode;
  groupedData?: GroupedGraphData | null;
}

interface NodePosition {
  x: number;
  y: number;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

const LEVEL_HEIGHT = 160;
const NODE_SPACING = 180;
const LEFT_MARGIN = 130;
const TOP_MARGIN = 60;

export function GraphCanvas({
  nodes,
  edges,
  courseNodeIds,
  selectedNodeId,
  onNodeSelect,
  highlightedPath,
  isEditMode = false,
  selectedGroupingNodeIds = new Set(),
  onNodeSelectionChange,
  onCreateSubtopic,
  subtopics = [],
  skillSubtopicMap = new Map(),
  studentMastery,
  showMasteryVisuals = false,
  viewMode = 'skills',
  groupedData,
}: GraphCanvasProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(null);
  const [lassoEnd, setLassoEnd] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute levels based on prerequisite relationships
  const computedLevels = useMemo(() => {
    const inDegree: Record<string, Set<string>> = {};
    
    // Build prerequisite map: edge.from is prerequisite of edge.to
    edges.forEach(edge => {
      if (!inDegree[edge.to]) inDegree[edge.to] = new Set();
      inDegree[edge.to].add(edge.from);
    });
    
    const levels: Record<string, number> = {};
    
    // Level = 0 for nodes with no prerequisites
    // Level = 1 + max(level of all prerequisites)
    const getLevel = (nodeId: string, visited: Set<string>): number => {
      if (levels[nodeId] !== undefined) return levels[nodeId];
      if (visited.has(nodeId)) return 0; // Cycle detection
      
      visited.add(nodeId);
      const prereqs = inDegree[nodeId];
      if (!prereqs || prereqs.size === 0) {
        levels[nodeId] = 0;
      } else {
        const maxPrereqLevel = Math.max(
          ...Array.from(prereqs).map(p => getLevel(p, new Set(visited)))
        );
        levels[nodeId] = maxPrereqLevel + 1;
      }
      return levels[nodeId];
    };
    
    nodes.forEach(node => getLevel(node.id, new Set()));
    return levels;
  }, [nodes, edges]);

  // Determine node types based on graph position
  const nodeTypes = useMemo(() => {
    const types: Record<string, NodeType> = {};
    const hasPrerequisites = new Set<string>();
    const hasDependents = new Set<string>();
    
    edges.forEach(edge => {
      hasPrerequisites.add(edge.to);
      hasDependents.add(edge.from);
    });
    
    nodes.forEach(node => {
      const isRoot = !hasPrerequisites.has(node.id);
      const isLeaf = !hasDependents.has(node.id);
      
      if (isRoot) {
        types[node.id] = 'root';
      } else if (isLeaf) {
        types[node.id] = 'leaf';
      } else {
        types[node.id] = 'intermediate';
      }
    });
    
    return types;
  }, [nodes, edges]);

  // Group nodes by computed level
  const levelGroups = useMemo(() => {
    const groups: Record<number, GraphNode[]> = {};
    nodes.forEach((node) => {
      const level = computedLevels[node.id] ?? 0;
      if (!groups[level]) {
        groups[level] = [];
      }
      groups[level].push(node);
    });
    return groups;
  }, [nodes, computedLevels]);

  // Calculate canvas dimensions based on content
  const { canvasWidth, canvasHeight, levels } = useMemo(() => {
    const allLevels = Object.keys(levelGroups)
      .map(Number)
      .sort((a, b) => b - a); // Reverse sort: highest level at top
    const maxNodesAtLevel = Math.max(
      ...Object.values(levelGroups).map((g) => g.length),
      1
    );

    const width = Math.max(1000, LEFT_MARGIN + maxNodesAtLevel * NODE_SPACING + 100);
    const height = Math.max(600, TOP_MARGIN + (allLevels.length) * LEVEL_HEIGHT + 60);

    return { canvasWidth: width, canvasHeight: height, levels: allLevels };
  }, [levelGroups]);

  // Calculate node positions based on level
  const nodePositions = useMemo(() => {
    const positions: Record<string, NodePosition> = {};

    levels.forEach((level, levelIndex) => {
      const nodesAtLevel = levelGroups[level] || [];
      const levelY = TOP_MARGIN + levelIndex * LEVEL_HEIGHT + LEVEL_HEIGHT / 2;

      nodesAtLevel.forEach((node, nodeIndex) => {
        const nodeX = LEFT_MARGIN + (nodeIndex + 0.5) * NODE_SPACING;
        positions[node.id] = { x: nodeX, y: levelY };
      });
    });

    return positions;
  }, [levelGroups, levels]);

  // Removed level bands - no longer displaying levels

  // Determine which edges should be highlighted
  const highlightedEdges = useMemo(() => {
    if (!highlightedPath || highlightedPath.length < 2) return new Set<string>();
    const edgeSet = new Set<string>();
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      edgeSet.add(`${highlightedPath[i]}-${highlightedPath[i + 1]}`);
    }
    return edgeSet;
  }, [highlightedPath]);

  // Find connected nodes for hover highlighting
  const connectedNodes = useMemo(() => {
    if (!hoveredNodeId) return { prerequisites: new Set<string>(), dependents: new Set<string>() };
    
    const prerequisites = new Set<string>();
    const dependents = new Set<string>();
    
    edges.forEach((edge) => {
      if (edge.to === hoveredNodeId) {
        prerequisites.add(edge.from);
      }
      if (edge.from === hoveredNodeId) {
        dependents.add(edge.to);
      }
    });
    
    return { prerequisites, dependents };
  }, [hoveredNodeId, edges]);

  const getNodeState = useCallback(
    (nodeId: string) => {
      if (selectedNodeId === nodeId) return 'selected';
      if (highlightedPath?.includes(nodeId)) return 'highlighted';
      if (hoveredNodeId === nodeId) return 'hovered';
      if (connectedNodes.prerequisites.has(nodeId) || connectedNodes.dependents.has(nodeId)) {
        return 'connected';
      }
      if (courseNodeIds && !courseNodeIds.has(nodeId)) return 'dimmed';
      return 'default';
    },
    [selectedNodeId, highlightedPath, hoveredNodeId, courseNodeIds, connectedNodes]
  );

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as SVGElement).tagName === 'svg') {
      onNodeSelect(null);
    }
  };

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(3, prev.scale * 1.2),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.5, prev.scale / 1.2),
    }));
  }, []);

  const handleFitToView = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const scaleX = containerRect.width / canvasWidth;
    const scaleY = containerRect.height / canvasHeight;
    const newScale = Math.min(scaleX, scaleY, 1) * 0.9;

    setTransform({
      x: (containerRect.width - canvasWidth * newScale) / 2,
      y: (containerRect.height - canvasHeight * newScale) / 2,
      scale: newScale,
    });
  }, [canvasWidth, canvasHeight]);

  const handleReset = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(3, Math.max(0.5, prev.scale * delta)),
    }));
  }, []);

  // Track shift key for multi-select
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

  // Convert screen coordinates to SVG coordinates
  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - transform.x) / transform.scale;
    const y = (clientY - rect.top - transform.y) / transform.scale;
    return { x, y };
  }, [transform]);

  // Pan handlers - allow dragging from anywhere except nodes (or lasso in edit mode)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    const isNode = target.closest('[data-node-id]');
    
    if (e.button === 0 && !isNode) {
      if (isEditMode) {
        // Start lasso selection in edit mode
        const svgCoords = screenToSvg(e.clientX, e.clientY);
        setLassoStart(svgCoords);
        setLassoEnd(svgCoords);
      } else {
        setIsDragging(true);
        setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      }
    }
  }, [transform, isEditMode, screenToSvg]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (lassoStart && isEditMode) {
        // Update lasso end
        const svgCoords = screenToSvg(e.clientX, e.clientY);
        setLassoEnd(svgCoords);
      } else if (isDragging) {
        setTransform((prev) => ({
          ...prev,
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        }));
      }
    },
    [isDragging, dragStart, lassoStart, isEditMode, screenToSvg]
  );

  const handleMouseUp = useCallback(() => {
    if (lassoStart && lassoEnd && isEditMode) {
      // Complete lasso selection
      const minX = Math.min(lassoStart.x, lassoEnd.x);
      const maxX = Math.max(lassoStart.x, lassoEnd.x);
      const minY = Math.min(lassoStart.y, lassoEnd.y);
      const maxY = Math.max(lassoStart.y, lassoEnd.y);

      // Find nodes within lasso
      const nodesInLasso = nodes.filter(node => {
        const pos = nodePositions[node.id];
        return pos && pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
      });

      if (onNodeSelectionChange && nodesInLasso.length > 0) {
        const newSelection = new Set(isShiftPressed ? selectedGroupingNodeIds : []);
        nodesInLasso.forEach(n => newSelection.add(n.id));
        onNodeSelectionChange(newSelection);
      }

      setLassoStart(null);
      setLassoEnd(null);
    }
    setIsDragging(false);
  }, [lassoStart, lassoEnd, isEditMode, nodes, nodePositions, isShiftPressed, selectedGroupingNodeIds, onNodeSelectionChange]);

  // Attach wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Handle node click in edit mode
  const handleNodeClick = useCallback((nodeId: string) => {
    if (isEditMode && onNodeSelectionChange) {
      const newSelection = new Set(isShiftPressed ? selectedGroupingNodeIds : []);
      if (selectedGroupingNodeIds.has(nodeId) && isShiftPressed) {
        newSelection.delete(nodeId);
      } else {
        newSelection.add(nodeId);
      }
      onNodeSelectionChange(newSelection);
    } else {
      onNodeSelect(nodeId);
    }
  }, [isEditMode, isShiftPressed, selectedGroupingNodeIds, onNodeSelectionChange, onNodeSelect]);

  // Clear grouping selection
  const handleClearSelection = useCallback(() => {
    onNodeSelectionChange?.(new Set());
  }, [onNodeSelectionChange]);

  // Get subtopic color for a node
  const getSubtopicColor = useCallback((nodeId: string): string | null => {
    const subtopicId = skillSubtopicMap.get(nodeId);
    if (!subtopicId) return null;
    const subtopic = subtopics.find(st => st.id === subtopicId);
    return subtopic?.color || null;
  }, [skillSubtopicMap, subtopics]);

  // Calculate lasso rect for rendering
  const lassoRect = useMemo(() => {
    if (!lassoStart || !lassoEnd) return null;
    return {
      x: Math.min(lassoStart.x, lassoEnd.x),
      y: Math.min(lassoStart.y, lassoEnd.y),
      width: Math.abs(lassoEnd.x - lassoStart.x),
      height: Math.abs(lassoEnd.y - lassoStart.y),
    };
  }, [lassoStart, lassoEnd]);

  // Double-click to focus on node
  const handleNodeDoubleClick = useCallback(
    (nodeId: string) => {
      if (isEditMode) return; // Disable in edit mode
      const pos = nodePositions[nodeId];
      if (pos && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newScale = 1.5;
        setTransform({
          x: containerRect.width / 2 - pos.x * newScale,
          y: containerRect.height / 2 - pos.y * newScale,
          scale: newScale,
        });
        onNodeSelect(nodeId);
      }
    },
    [nodePositions, onNodeSelect, isEditMode]
  );

  return (
    <div
      ref={containerRef}
      className="graph-container w-full h-full relative"
      onClick={handleCanvasClick}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: isEditMode ? (lassoStart ? 'crosshair' : 'default') : (isDragging ? 'grabbing' : 'grab') }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {/* Edges */}
          <g className="edges">
            {edges.map((edge) => {
              const fromPos = nodePositions[edge.from];
              const toPos = nodePositions[edge.to];
              if (!fromPos || !toPos) return null;

              const isHighlighted = highlightedEdges.has(`${edge.from}-${edge.to}`);
              const isConnectedToHovered =
                hoveredNodeId === edge.from || hoveredNodeId === edge.to;

              return (
                <GraphEdgeComponent
                  key={`${edge.from}-${edge.to}`}
                  fromX={fromPos.x}
                  fromY={fromPos.y}
                  toX={toPos.x}
                  toY={toPos.y}
                  isHighlighted={isHighlighted}
                  isHovered={isConnectedToHovered}
                  reason={edge.reason}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {nodes.map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;

              // Check if this is a super node in grouped view
              if (groupedData?.isSuperNode(node.id)) {
                const sn = node as unknown as SuperNode;
                return (
                  <SuperNodeComponent
                    key={sn.id}
                    node={sn}
                    x={pos.x}
                    y={pos.y}
                    state={getNodeState(sn.id)}
                    onClick={() => handleNodeClick(sn.id)}
                    onMouseEnter={() => setHoveredNodeId(sn.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                  />
                );
              }

              // Get mastery data for this node if in mastery mode
              const nodeMastery = showMasteryVisuals && studentMastery ? studentMastery.get(node.id) : undefined;
              const masteryData = nodeMastery ? {
                mastery: nodeMastery.rawMastery ?? 0,
              } : undefined;

              return (
                <GraphNodeComponent
                  key={node.id}
                  node={node}
                  x={pos.x}
                  y={pos.y}
                  state={getNodeState(node.id)}
                  nodeType={nodeTypes[node.id] || 'intermediate'}
                  onClick={() => handleNodeClick(node.id)}
                  onDoubleClick={() => handleNodeDoubleClick(node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  isEditMode={isEditMode}
                  isSelected={selectedGroupingNodeIds.has(node.id)}
                  subtopicColor={getSubtopicColor(node.id)}
                  masteryData={masteryData}
                  showMasteryIndicator={showMasteryVisuals}
                />
              );
            })}
          </g>

          {/* Lasso selection rectangle */}
          {isEditMode && lassoRect && (
            <LassoSelector rect={lassoRect} />
          )}
        </g>
      </svg>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10">
        <ZoomControls
          scale={transform.scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToView={handleFitToView}
          onReset={handleReset}
        />
      </div>

      {/* Grouping Toolbar (edit mode) */}
      {isEditMode && onCreateSubtopic && (
        <GroupingToolbar
          selectedCount={selectedGroupingNodeIds.size}
          onCreateSubtopic={onCreateSubtopic}
          onClearSelection={handleClearSelection}
        />
      )}
    </div>
  );
}
