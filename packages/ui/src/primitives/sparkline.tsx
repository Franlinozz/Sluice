import * as React from "react";
import { cn } from "../cn.ts";

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Stroke color CSS value (default cool-steel). */
  stroke?: string;
  /** Subtle area fill under the line. */
  fill?: boolean;
}

/** Dependency-free inline sparkline (SVG). For richer charts, use Recharts in the app. */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  className,
  stroke = "var(--steel)",
  fill = false,
}: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pt = (v: number, i: number): [number, number] => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y];
  };
  const line = data.map((v, i) => pt(v, i).map((n) => n.toFixed(1)).join(",")).join(" ");
  const last = pt(data[data.length - 1]!, data.length - 1);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      {fill && (
        <polygon
          points={`0,${height} ${line} ${width},${height}`}
          fill={stroke}
          opacity={0.08}
        />
      )}
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={stroke} />
    </svg>
  );
}
