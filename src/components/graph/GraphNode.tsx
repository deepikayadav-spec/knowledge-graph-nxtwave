import { GraphNode, NodeType, NODE_TYPE_COLORS, LE } from '@/types/graph';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface MasteryData {
  mastery: number;
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
  isEditMode?: boolean;
  isSelected?: boolean;
  subtopicColor?: string | null;
  masteryData?: MasteryData;
  showMasteryIndicator?: boolean;
}

const DEFAULT_LE_MINUTES = 20;

const getEffectiveLE = (le?: LE): number => {
  if (!le) return DEFAULT_LE_MINUTES;
  if (le.estimated) {
    return le.estimatedMinutes ?? DEFAULT_LE_MINUTES;
  }
  return le.measuredMinutes || le.finalLE || le.estimatedMinutes || DEFAULT_LE_MINUTES;
};

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

  const getMasteryOpacity = () => {
    if (!showMasteryIndicator || !masteryData) return 1;
    return 0.3 + masteryData.mastery * 0.7;
  };

  const getMasteryBorderColor = () => {
    if (!showMasteryIndicator || !masteryData) return null;
    const mastery = masteryData.mastery;
    if (mastery >= 0.8) return 'hsl(142, 76%, 36%)';
    if (mastery >= 0.6) return null;
    if (mastery >= 0.4) return 'hsl(38, 92%, 50%)';
    return 'hsl(0, 84%, 60%)';
  };

  const getOpacity = () => {
    if (showMasteryIndicator && masteryData) return getMasteryOpacity();
    return state === 'dimmed' ? 0.3 : 1;
  };

  const getStrokeWidth = () => {
    switch (state) {
      case 'selected': return 4;
      case 'highlighted': return 5;
      case 'hovered': return 3;
      case 'connected': return 2.5;
      default: return 2;
    }
  };

  const getStrokeColor = () => {
    const masteryBorderColor = getMasteryBorderColor();
    if (masteryBorderColor && state === 'default') return masteryBorderColor;
    
    switch (state) {
      case 'selected': return 'hsl(45, 93%, 47%)';
      case 'highlighted': return 'hsl(280, 87%, 60%)';
      case 'hovered': return nodeColor;
      case 'connected': return 'hsl(199, 89%, 48%)';
      default: return masteryBorderColor || 'hsl(214, 32%, 91%)';
    }
  };

  const getScale = () => {
    switch (state) {
      case 'selected': return 1.1;
      case 'highlighted': return 1.12;
      case 'hovered': return 1.05;
      case 'connected': return 1.03;
      default: return 1;
    }
  };

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
      {subtopicColor && !isEditMode && (
        <circle cx={0} cy={0} r={nodeRadius + 6} fill="none" stroke={subtopicColor} strokeWidth={3} opacity={0.7} />
      )}

      {isEditMode && isSelected && (
        <circle cx={0} cy={0} r={nodeRadius + 8} fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth={3} className="animate-pulse-soft" />
      )}

      {state === 'selected' && !isEditMode && (
        <circle cx={0} cy={0} r={nodeRadius + 8} fill="none" stroke={getStrokeColor()} strokeWidth={2} opacity={0.3} className="animate-pulse-soft" />
      )}

      {state === 'highlighted' && (
        <>
          <circle cx={0} cy={0} r={nodeRadius + 14} fill="none" stroke="hsl(280, 87%, 60%)" strokeWidth={2} opacity={0.2} className="animate-pulse-soft" />
          <circle cx={0} cy={0} r={nodeRadius + 8} fill="none" stroke="hsl(280, 87%, 60%)" strokeWidth={3} opacity={0.5} className="animate-pulse-soft" />
        </>
      )}

      {state === 'connected' && (
        <circle cx={0} cy={0} r={nodeRadius + 5} fill="none" stroke="hsl(199, 89%, 48%)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
      )}

      <defs>
        <radialGradient id={`gradient-${node.id}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor={nodeColor} stopOpacity="0.15" />
        </radialGradient>
      </defs>
      
      <circle
        cx={0} cy={0} r={nodeRadius}
        fill={`url(#gradient-${node.id})`}
        stroke={state === 'default' ? (getMasteryBorderColor() || nodeColor) : getStrokeColor()}
        strokeWidth={getStrokeWidth()}
        className="transition-all duration-200"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
      />

      <circle cx={0} cy={0} r={nodeRadius - 4} fill="none" stroke={nodeColor} strokeWidth={2} opacity={0.3} />

      <foreignObject x={-60} y={nodeRadius + 4} width={120} height={44}>
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

      {isEditMode && isSelected && (
        <foreignObject x={nodeRadius - 12} y={-nodeRadius - 4} width={24} height={24}>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md">
            <Check className="h-4 w-4" />
          </div>
        </foreignObject>
      )}

      {/* Mastery percentage badge */}
      {showMasteryIndicator && masteryData && (
        <foreignObject x={-24} y={nodeRadius + 36} width={48} height={20}>
          <div className={cn(
            "flex items-center justify-center h-5 rounded text-[10px] font-bold shadow-sm",
            masteryData.mastery >= 0.8 
              ? "bg-green-100 text-green-700"
              : masteryData.mastery >= 0.6 
                ? "bg-yellow-100 text-yellow-700"
                : masteryData.mastery >= 0.4
                  ? "bg-orange-100 text-orange-700"
                  : "bg-red-100 text-red-700"
          )}>
            {Math.round(masteryData.mastery * 100)}%
          </div>
        </foreignObject>
      )}

      {/* Mastered KP glow (90%+) */}
      {showMasteryIndicator && masteryData && masteryData.mastery >= 0.9 && (
        <circle cx={0} cy={0} r={nodeRadius + 6} fill="none" stroke="hsl(142, 76%, 36%)" strokeWidth={2} opacity={0.4} className="animate-pulse-soft" />
      )}
    </g>
  );
}
