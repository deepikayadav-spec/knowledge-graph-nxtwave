// SVG rectangle overlay for lasso selection

interface LassoSelectorProps {
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export function LassoSelector({ rect }: LassoSelectorProps) {
  if (!rect) return null;

  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill="hsl(var(--primary) / 0.1)"
      stroke="hsl(var(--primary))"
      strokeWidth={2}
      strokeDasharray="6 3"
      rx={4}
      ry={4}
      className="pointer-events-none"
    />
  );
}
