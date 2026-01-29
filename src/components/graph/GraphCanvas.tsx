import { useCallback, useMemo, useState } from 'react';
import { GraphNode, GraphEdge } from '@/types/graph';
import { GraphNodeComponent } from './GraphNode';
import { GraphEdgeComponent } from './GraphEdge';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  courseNodeIds?: Set<string>;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  highlightedPath?: string[];
}

interface NodePosition {
  x: number;
  y: number;
}

export function GraphCanvas({
  nodes,
  edges,
  courseNodeIds,
  selectedNodeId,
  onNodeSelect,
  highlightedPath,
}: GraphCanvasProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Calculate node positions based on level
  const nodePositions = useMemo(() => {
    const positions: Record<string, NodePosition> = {};
    const levelGroups: Record<number, GraphNode[]> = {};

    // Group nodes by level
    nodes.forEach((node) => {
      if (!levelGroups[node.level]) {
        levelGroups[node.level] = [];
      }
      levelGroups[node.level].push(node);
    });

    const levels = Object.keys(levelGroups)
      .map(Number)
      .sort((a, b) => a - b);
    const canvasWidth = 1000;
    const canvasHeight = 600;
    const levelHeight = canvasHeight / (levels.length + 1);

    levels.forEach((level, levelIndex) => {
      const nodesAtLevel = levelGroups[level];
      const levelWidth = canvasWidth / (nodesAtLevel.length + 1);

      nodesAtLevel.forEach((node, nodeIndex) => {
        positions[node.id] = {
          x: levelWidth * (nodeIndex + 1),
          y: levelHeight * (levelIndex + 1),
        };
      });
    });

    return positions;
  }, [nodes]);

  // Determine which edges should be highlighted
  const highlightedEdges = useMemo(() => {
    if (!highlightedPath || highlightedPath.length < 2) return new Set<string>();
    const edgeSet = new Set<string>();
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      edgeSet.add(`${highlightedPath[i]}-${highlightedPath[i + 1]}`);
    }
    return edgeSet;
  }, [highlightedPath]);

  const getNodeState = useCallback(
    (nodeId: string) => {
      if (selectedNodeId === nodeId) return 'selected';
      if (highlightedPath?.includes(nodeId)) return 'highlighted';
      if (hoveredNodeId === nodeId) return 'hovered';
      if (courseNodeIds && !courseNodeIds.has(nodeId)) return 'dimmed';
      return 'default';
    },
    [selectedNodeId, highlightedPath, hoveredNodeId, courseNodeIds]
  );

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onNodeSelect(null);
    }
  };

  return (
    <div className="graph-container w-full h-full" onClick={handleCanvasClick}>
      <svg
        className="w-full h-full"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid meet"
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

            return (
              <GraphNodeComponent
                key={node.id}
                node={node}
                x={pos.x}
                y={pos.y}
                state={getNodeState(node.id)}
                onClick={() => onNodeSelect(node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
