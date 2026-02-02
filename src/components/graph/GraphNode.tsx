import { GraphNode, NodeType, NODE_TYPE_COLORS, LE } from '@/types/graph';
import { cn } from '@/lib/utils';

interface GraphNodeComponentProps {
  node: GraphNode;
  x: number;
  y: number;
  state: 'default' | 'selected' | 'highlighted' | 'hovered' | 'dimmed' | 'connected';
  nodeType: NodeType;
  onClick: () => void;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

// Default LE value for nodes without LE data
const DEFAULT_LE_MINUTES = 20;

// Get effective LE value from either estimated or measured data
const getEffectiveLE = (le?: LE): number => {
  if (!le) return DEFAULT_LE_MINUTES;
  if (le.estimated) {
    return le.estimatedMinutes ?? DEFAULT_LE_MINUTES;
  }
  return le.measuredMinutes || le.finalLE || le.estimatedMinutes || DEFAULT_LE_MINUTES;
};

// Calculate node radius based on Learning Effort (LE)
const getNodeRadius = (le?: LE) => {
  const leValue = getEffectiveLE(le);
  const baseRadius = 22;
  const maxRadius = 40;
  const leMin = 5;
  const leMax = 60;
  const normalized = Math.max(0, Math.min(1, (leValue - leMin) / (leMax - leMin)));
  return baseRadius + normalized * (maxRadius - baseRadius);
};

export function GraphNodeComponent({
  node,
  x,
  y,
  state,
  nodeType,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
}: GraphNodeComponentProps) {
  const nodeRadius = getNodeRadius(node.le);
  const nodeColor = NODE_TYPE_COLORS[nodeType];

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
        return 5;
      case 'hovered':
        return 3;
      case 'connected':
        return 2.5;
      default:
        return 2;
    }
  };

  const getStrokeColor = () => {
    switch (state) {
      case 'selected':
        return 'hsl(45, 93%, 47%)';
      case 'highlighted':
        return 'hsl(280, 87%, 60%)';
      case 'hovered':
        return nodeColor;
      case 'connected':
        return 'hsl(199, 89%, 48%)';
      default:
        return 'hsl(214, 32%, 91%)';
    }
  };

  const getScale = () => {
    switch (state) {
      case 'selected':
        return 1.1;
      case 'highlighted':
        return 1.12;
      case 'hovered':
        return 1.05;
      case 'connected':
        return 1.03;
      default:
        return 1;
    }
  };

  // Truncate name for display
  const displayName = node.name.length > 25 
    ? node.name.substring(0, 22) + '...' 
    : node.name;

  return (
    <g
      data-node-id={node.id}
      className="graph-node cursor-pointer"
      style={{ 
        opacity: getOpacity(),
        transform: `translate(${x}px, ${y}px) scale(${getScale()})`,
        transformOrigin: 'center',
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Glow effect for selected */}
      {state === 'selected' && (
        <circle
          cx={0}
          cy={0}
          r={nodeRadius + 8}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={2}
          opacity={0.3}
          className="animate-pulse-soft"
        />
      )}

      {/* Enhanced glow effect for highlighted path nodes */}
      {state === 'highlighted' && (
        <>
          {/* Outer glow ring */}
          <circle
            cx={0}
            cy={0}
            r={nodeRadius + 14}
            fill="none"
            stroke="hsl(280, 87%, 60%)"
            strokeWidth={2}
            opacity={0.2}
            className="animate-pulse-soft"
          />
          {/* Inner glow ring */}
          <circle
            cx={0}
            cy={0}
            r={nodeRadius + 8}
            fill="none"
            stroke="hsl(280, 87%, 60%)"
            strokeWidth={3}
            opacity={0.5}
            className="animate-pulse-soft"
          />
        </>
      )}

      {/* Connected indicator ring */}
      {state === 'connected' && (
        <circle
          cx={0}
          cy={0}
          r={nodeRadius + 5}
          fill="none"
          stroke="hsl(199, 89%, 48%)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}

      {/* Main node circle with gradient based on node type */}
      <defs>
        <radialGradient id={`gradient-${node.id}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor={nodeColor} stopOpacity="0.15" />
        </radialGradient>
      </defs>
      
      <circle
        cx={0}
        cy={0}
        r={nodeRadius}
        fill={`url(#gradient-${node.id})`}
        stroke={state === 'default' ? nodeColor : getStrokeColor()}
        strokeWidth={getStrokeWidth()}
        className="transition-all duration-200"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
      />

      {/* Node type indicator (colored inner ring) */}
      <circle
        cx={0}
        cy={0}
        r={nodeRadius - 4}
        fill="none"
        stroke={nodeColor}
        strokeWidth={2}
        opacity={0.3}
      />

      {/* Node label */}
      <foreignObject
        x={-60}
        y={nodeRadius + 4}
        width={120}
        height={44}
      >
        <div className="flex items-start justify-center">
          <span
            className={cn(
              "text-[11px] leading-tight text-center font-semibold px-1",
              state === 'dimmed' ? "text-muted-foreground/50" : "text-foreground"
            )}
            style={{ 
              wordBreak: 'break-word',
              textShadow: '0 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6)'
            }}
          >
            {displayName}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}
