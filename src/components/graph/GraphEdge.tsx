interface GraphEdgeComponentProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isHighlighted: boolean;
  isHovered: boolean;
  reason: string;
}

export function GraphEdgeComponent({
  fromX,
  fromY,
  toX,
  toY,
  isHighlighted,
  isHovered,
}: GraphEdgeComponentProps) {
  // Calculate control points for a curved path
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  
  // Add some curvature
  const curvature = 0.2;
  const controlX = midX - dy * curvature;
  const controlY = midY + dx * curvature;

  // Offset to not overlap with node circles
  const nodeRadius = 28;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const startX = fromX + Math.cos(angle) * nodeRadius;
  const startY = fromY + Math.sin(angle) * nodeRadius;
  const endX = toX - Math.cos(angle) * nodeRadius;
  const endY = toY - Math.sin(angle) * nodeRadius;

  const strokeColor = isHighlighted
    ? 'hsl(173, 58%, 39%)'
    : isHovered
    ? 'hsl(215, 25%, 55%)'
    : 'hsl(215, 25%, 75%)';

  const strokeWidth = isHighlighted ? 3 : isHovered ? 2 : 1.5;
  const opacity = isHighlighted ? 1 : isHovered ? 0.8 : 0.5;

  // Arrow marker
  const arrowSize = 6;
  const arrowAngle = Math.atan2(endY - controlY, endX - controlX);

  return (
    <g className="transition-all duration-200" style={{ opacity }}>
      {/* Edge path */}
      <path
        d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className={isHighlighted ? 'animate-draw' : ''}
      />

      {/* Arrow head */}
      <polygon
        points={`
          ${endX},${endY}
          ${endX - arrowSize * Math.cos(arrowAngle - Math.PI / 6)},${
          endY - arrowSize * Math.sin(arrowAngle - Math.PI / 6)
        }
          ${endX - arrowSize * Math.cos(arrowAngle + Math.PI / 6)},${
          endY - arrowSize * Math.sin(arrowAngle + Math.PI / 6)
        }
        `}
        fill={strokeColor}
      />
    </g>
  );
}
