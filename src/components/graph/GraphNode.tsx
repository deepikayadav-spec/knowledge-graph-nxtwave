import { GraphNode, NodeType, NODE_TYPE_COLORS, LE } from '@/types/graph';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, Clock } from 'lucide-react';
import type { RetentionStatus } from '@/types/mastery';

interface MasteryData {
  effectiveMastery: number;
  retentionStatus: RetentionStatus;
}

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
  // Edit mode props
  isEditMode?: boolean;
  isSelected?: boolean;
  subtopicColor?: string | null;
  // Mastery visualization props
  masteryData?: MasteryData;
  showMasteryIndicator?: boolean;
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
  isEditMode = false,
  isSelected = false,
  subtopicColor = null,
  masteryData,
  showMasteryIndicator = false,
}: GraphNodeComponentProps) {
  const nodeRadius = getNodeRadius(node.le);
  const nodeColor = NODE_TYPE_COLORS[nodeType];

  // Calculate mastery-based opacity (30% to 100% based on mastery level)
  const getMasteryOpacity = () => {
    if (!showMasteryIndicator || !masteryData) return 1;
    const mastery = masteryData.effectiveMastery;
    return 0.3 + mastery * 0.7; // 30% at 0%, 100% at 100%
  };

  // Get mastery-based border color
  const getMasteryBorderColor = () => {
    if (!showMasteryIndicator || !masteryData) return null;
    const mastery = masteryData.effectiveMastery;
    if (mastery >= 0.8) return 'hsl(142, 76%, 36%)'; // Green for mastered
    if (mastery >= 0.6) return null; // Normal
    if (mastery >= 0.4) return 'hsl(38, 92%, 50%)'; // Orange
    return 'hsl(0, 84%, 60%)'; // Red for low mastery
  };

  // Get border style based on retention status
  const getRetentionBorderStyle = () => {
    if (!showMasteryIndicator || !masteryData) return undefined;
    switch (masteryData.retentionStatus) {
      case 'aging': return '6 3'; // Dashed
      case 'expired': return '2 2'; // Dotted
      default: return undefined; // Solid
    }
  };

  const getOpacity = () => {
    if (showMasteryIndicator && masteryData) {
      return getMasteryOpacity();
    }
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
    // If in mastery mode and we have mastery-based color, use it
    const masteryBorderColor = getMasteryBorderColor();
    if (masteryBorderColor && state === 'default') {
      return masteryBorderColor;
    }
    
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
        return masteryBorderColor || 'hsl(214, 32%, 91%)';
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
      {/* Subtopic color ring (when node belongs to a subtopic) */}
      {subtopicColor && !isEditMode && (
        <circle
          cx={0}
          cy={0}
          r={nodeRadius + 6}
          fill="none"
          stroke={subtopicColor}
          strokeWidth={3}
          opacity={0.7}
        />
      )}

      {/* Edit mode selection highlight */}
      {isEditMode && isSelected && (
        <circle
          cx={0}
          cy={0}
          r={nodeRadius + 8}
          fill="hsl(var(--primary) / 0.15)"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          className="animate-pulse-soft"
        />
      )}

      {/* Glow effect for selected */}
      {state === 'selected' && !isEditMode && (
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
        stroke={state === 'default' ? (getMasteryBorderColor() || nodeColor) : getStrokeColor()}
        strokeWidth={getStrokeWidth()}
        strokeDasharray={getRetentionBorderStyle()}
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

      {/* Edit mode selection checkmark */}
      {isEditMode && isSelected && (
        <foreignObject
          x={nodeRadius - 12}
          y={-nodeRadius - 4}
          width={24}
          height={24}
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md">
            <Check className="h-4 w-4" />
          </div>
        </foreignObject>
      )}

      {/* Mastery percentage badge (when in mastery mode) */}
      {showMasteryIndicator && masteryData && (
        <foreignObject
          x={-24}
          y={nodeRadius + 36}
          width={48}
          height={20}
        >
          <div className={cn(
            "flex items-center justify-center h-5 rounded text-[10px] font-bold shadow-sm",
            masteryData.effectiveMastery >= 0.8 
              ? "bg-green-100 text-green-700"
              : masteryData.effectiveMastery >= 0.6 
                ? "bg-yellow-100 text-yellow-700"
                : masteryData.effectiveMastery >= 0.4
                  ? "bg-orange-100 text-orange-700"
                  : "bg-red-100 text-red-700"
          )}>
            {Math.round(masteryData.effectiveMastery * 100)}%
          </div>
        </foreignObject>
      )}

      {/* Retention warning icons */}
      {showMasteryIndicator && masteryData && masteryData.retentionStatus === 'aging' && (
        <foreignObject
          x={nodeRadius - 8}
          y={nodeRadius - 8}
          width={16}
          height={16}
        >
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 shadow">
            <Clock className="h-2.5 w-2.5 text-amber-600" />
          </div>
        </foreignObject>
      )}

      {showMasteryIndicator && masteryData && masteryData.retentionStatus === 'expired' && (
        <foreignObject
          x={nodeRadius - 8}
          y={nodeRadius - 8}
          width={16}
          height={16}
        >
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-red-100 shadow">
            <AlertTriangle className="h-2.5 w-2.5 text-red-600" />
          </div>
        </foreignObject>
      )}

      {/* Mastered skill glow (90%+ mastery) */}
      {showMasteryIndicator && masteryData && masteryData.effectiveMastery >= 0.9 && masteryData.retentionStatus === 'current' && (
        <circle
          cx={0}
          cy={0}
          r={nodeRadius + 6}
          fill="none"
          stroke="hsl(142, 76%, 36%)"
          strokeWidth={2}
          opacity={0.4}
          className="animate-pulse-soft"
        />
      )}
    </g>
  );
}
