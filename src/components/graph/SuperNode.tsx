import type { SuperNode } from '@/lib/graph/groupedView';

interface SuperNodeComponentProps {
  node: SuperNode;
  x: number;
  y: number;
  state: 'default' | 'selected' | 'hovered' | 'connected' | 'highlighted' | 'dimmed';
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function SuperNodeComponent({
  node,
  x,
  y,
  state,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: SuperNodeComponentProps) {
  const radius = Math.max(30, 20 + node.skillCount * 3);
  const opacity = state === 'dimmed' ? 0.3 : 1;
  const strokeWidth = state === 'selected' || state === 'hovered' ? 3 : 2;
  const strokeColor = state === 'selected' ? 'hsl(var(--accent))' : state === 'hovered' ? 'hsl(var(--accent) / 0.7)' : node.color;

  return (
    <g
      data-node-id={node.id}
      transform={`translate(${x}, ${y})`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer', opacity }}
    >
      {/* Hexagon-ish shape for distinction */}
      <circle
        r={radius}
        fill={node.color}
        fillOpacity={0.15}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={node.type === 'topic' ? '8 4' : 'none'}
      />
      <circle r={radius - 6} fill={node.color} fillOpacity={0.08} stroke="none" />

      {/* Name */}
      <text
        textAnchor="middle"
        dy="-4"
        className="text-xs font-semibold fill-foreground pointer-events-none"
        style={{ fontSize: Math.max(9, 11 - Math.floor(node.name.length / 8)) }}
      >
        {node.name.length > 18 ? node.name.slice(0, 16) + '…' : node.name}
      </text>

      {/* Skill count badge */}
      <text
        textAnchor="middle"
        dy="12"
        className="text-[10px] fill-muted-foreground pointer-events-none"
      >
        {node.skillCount} skill{node.skillCount !== 1 ? 's' : ''}
      </text>
    </g>
  );
}
