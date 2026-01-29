import { COMPUTED_LEVEL_LABELS } from '@/types/graph';

interface LevelBandProps {
  level: number;
  y: number;
  height: number;
  nodeCount: number;
  width: number;
}

const levelBandColors = [
  'hsl(152 69% 41% / 0.08)',  // Green for foundational
  'hsl(199 89% 48% / 0.06)',  // Blue
  'hsl(221 83% 53% / 0.06)',  // Indigo
  'hsl(262 83% 58% / 0.06)',  // Purple
  'hsl(35 92% 53% / 0.08)',   // Orange for advanced
  'hsl(330 81% 60% / 0.06)',
];

export function LevelBand({ level, y, height, nodeCount, width }: LevelBandProps) {
  const bandColor = levelBandColors[Math.min(level, levelBandColors.length - 1)];
  const levelName = COMPUTED_LEVEL_LABELS[level] || `Level ${level}`;

  return (
    <g className="level-band">
      {/* Background band */}
      <rect
        x={0}
        y={y}
        width={width}
        height={height}
        fill={bandColor}
        className="transition-all duration-300"
      />
      
      {/* Level separator line */}
      <line
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="hsl(var(--border))"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.5}
      />
      
      {/* Level label on left side */}
      <g transform={`translate(12, ${y + height / 2})`}>
        <rect
          x={-4}
          y={-24}
          width={100}
          height={48}
          fill="hsl(var(--card) / 0.95)"
          rx={6}
          className="drop-shadow-sm"
        />
        <text
          y={-8}
          fontSize={11}
          fontWeight={600}
          fill="hsl(var(--foreground))"
          className="font-sans"
        >
          Level {level}
        </text>
        <text
          y={8}
          fontSize={9}
          fill="hsl(var(--muted-foreground))"
          className="font-sans"
        >
          {levelName}
        </text>
        <text
          y={22}
          fontSize={8}
          fill="hsl(var(--muted-foreground))"
          className="font-mono"
        >
          {nodeCount} node{nodeCount !== 1 ? 's' : ''}
        </text>
      </g>
    </g>
  );
}
