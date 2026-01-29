import { GraphNode } from '@/types/graph';
import { cn } from '@/lib/utils';

interface GraphNodeComponentProps {
  node: GraphNode;
  x: number;
  y: number;
  state: 'default' | 'selected' | 'highlighted' | 'hovered' | 'dimmed';
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const levelColors = [
  'hsl(173, 58%, 39%)',  // Level 0 - Teal
  'hsl(199, 89%, 48%)',  // Level 1 - Sky blue
  'hsl(221, 83%, 53%)',  // Level 2 - Blue
  'hsl(262, 83%, 58%)',  // Level 3 - Purple
  'hsl(292, 84%, 61%)',  // Level 4 - Magenta
  'hsl(330, 81%, 60%)',  // Level 5 - Pink
];

export function GraphNodeComponent({
  node,
  x,
  y,
  state,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: GraphNodeComponentProps) {
  const nodeRadius = 28;
  const levelColor = levelColors[node.level] || levelColors[5];

  const getOpacity = () => {
    switch (state) {
      case 'dimmed':
        return 0.3;
      default:
        return 1;
    }
  };

  const getStrokeWidth = () => {
    switch (state) {
      case 'selected':
        return 4;
      case 'highlighted':
        return 3;
      case 'hovered':
        return 3;
      default:
        return 2;
    }
  };

  const getStrokeColor = () => {
    switch (state) {
      case 'selected':
        return 'hsl(45, 93%, 47%)';
      case 'highlighted':
        return 'hsl(173, 58%, 39%)';
      case 'hovered':
        return levelColor;
      default:
        return 'hsl(214, 32%, 91%)';
    }
  };

  // Truncate name for display
  const displayName = node.name.length > 25 
    ? node.name.substring(0, 22) + '...' 
    : node.name;

  return (
    <g
      className="graph-node cursor-pointer transition-all duration-200"
      style={{ opacity: getOpacity() }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Glow effect for selected/highlighted */}
      {(state === 'selected' || state === 'highlighted') && (
        <circle
          cx={x}
          cy={y}
          r={nodeRadius + 8}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={2}
          opacity={0.3}
          className="animate-pulse-soft"
        />
      )}

      {/* Main node circle */}
      <circle
        cx={x}
        cy={y}
        r={nodeRadius}
        fill="white"
        stroke={getStrokeColor()}
        strokeWidth={getStrokeWidth()}
        className="transition-all duration-200"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
      />

      {/* Level indicator */}
      <circle
        cx={x}
        cy={y - nodeRadius + 6}
        r={8}
        fill={levelColor}
        stroke="white"
        strokeWidth={2}
      />
      <text
        x={x}
        y={y - nodeRadius + 10}
        textAnchor="middle"
        fontSize={9}
        fontWeight="600"
        fill="white"
      >
        {node.level}
      </text>

      {/* CME indicator (mastery level) */}
      <g transform={`translate(${x + nodeRadius - 8}, ${y - nodeRadius + 6})`}>
        <circle r={7} fill="hsl(222, 47%, 20%)" stroke="white" strokeWidth={1.5} />
        <text
          y={3}
          textAnchor="middle"
          fontSize={8}
          fontWeight="600"
          fill="white"
        >
          {node.cme.highestConceptLevel}
        </text>
      </g>

      {/* Node label */}
      <foreignObject
        x={x - 50}
        y={y + nodeRadius + 4}
        width={100}
        height={40}
      >
        <div className="flex items-start justify-center">
          <span
            className={cn(
              "text-[10px] leading-tight text-center font-medium px-1",
              state === 'dimmed' ? "text-muted-foreground/50" : "text-foreground"
            )}
            style={{ wordBreak: 'break-word' }}
          >
            {displayName}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}
