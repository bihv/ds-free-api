"use client";

import { useEffect, useRef, useState } from "react";

interface TimelinePoint {
  time: string;
  count: number;
  errors: number;
}

interface RequestChartProps {
  data: TimelinePoint[];
  range: string;
  onRangeChange: (range: string) => void;
}

const ranges = [
  { value: "1h", label: "1H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

export default function RequestChart({ data, range, onRangeChange }: RequestChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; time: string; count: number; errors: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, width, height);

    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const stepX = chartWidth / Math.max(data.length - 1, 1);
    const getX = (index: number) => (data.length === 1 ? padding.left + chartWidth / 2 : padding.left + index * stepX);

    // Grid lines + unique Y labels (avoid duplicated levels when maxCount is small)
    ctx.strokeStyle = "rgba(135, 134, 127, 0.08)";
    ctx.lineWidth = 1;
    const gridLines = 5;
    const tickValues = Array.from(
      new Set(
        Array.from({ length: gridLines + 1 }, (_, i) =>
          Math.round((maxCount * (gridLines - i)) / gridLines)
        )
      )
    ).sort((a, b) => b - a);

    tickValues.forEach((val) => {
      const y = padding.top + chartHeight - (val / maxCount) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(135, 134, 127, 0.5)";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(val.toString(), padding.left - 8, y + 4);
    });

    // X labels
    ctx.fillStyle = "rgba(135, 134, 127, 0.5)";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    const labelInterval = Math.max(1, Math.floor(data.length / 8));
    data.forEach((point, i) => {
      if (i % labelInterval === 0 || i === data.length - 1) {
        const x = getX(i);
        const label = formatTimeLabel(point.time, range);
        ctx.fillText(label, x, height - padding.bottom + 20);
      }
    });

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, "rgba(201, 100, 66, 0.2)"); // Terracotta
    gradient.addColorStop(1, "rgba(201, 100, 66, 0.0)");

    // Area
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    data.forEach((point, i) => {
      const x = getX(i);
      const y = padding.top + chartHeight - (point.count / maxCount) * chartHeight;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(getX(data.length - 1), padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = "#c96442"; // Terracotta
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    data.forEach((point, i) => {
      const x = getX(i);
      const y = padding.top + chartHeight - (point.count / maxCount) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    if (data.length === 1) {
      const point = data[0];
      const x = getX(0);
      const y = padding.top + chartHeight - (point.count / maxCount) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#c96442";
      ctx.fill();
    }

    // Error dots
    data.forEach((point, i) => {
      if (point.errors > 0) {
        const x = getX(i);
        const y = padding.top + chartHeight - (point.count / maxCount) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    });

    // Mouse handler
    const handleMouse = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;

      const idx = data.length === 1 ? 0 : Math.round((mx - padding.left) / stepX);
      if (idx >= 0 && idx < data.length) {
        const point = data[idx];
        const x = getX(idx);
        const y = padding.top + chartHeight - (point.count / maxCount) * chartHeight;

        // Draw hover dot
        // For now just show tooltip
        setTooltip({ x, y: y, time: point.time, count: point.count, errors: point.errors });
      } else {
        setTooltip(null);
      }
    };

    const handleLeave = () => setTooltip(null);

    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseleave", handleLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [data, range]);

  return (
    <div className="rounded-xl border border-surface-300 bg-surface-100 p-6 shadow-whisper h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-serif text-lg text-text-primary">Request Timeline</h3>
          <p className="text-sm text-text-secondary mt-1 font-sans">Request volume over time</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-200 p-0.5">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => onRangeChange(r.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                range === r.value
                  ? "bg-surface-300 text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-300/50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 min-h-[280px] w-full">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ display: "block" }}
        />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-surface-300 bg-surface-200 px-3 py-2 text-xs shadow-xl"
            style={{
              left: tooltip.x,
              top: tooltip.y - 60,
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-text-secondary">{tooltip.time}</p>
            <p className="font-semibold text-accent-primary">{tooltip.count} requests</p>
            {tooltip.errors > 0 && (
              <p className="font-semibold text-danger">{tooltip.errors} errors</p>
            )}
          </div>
        )}

        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-text-muted">No data yet. Send some requests to see the timeline.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeLabel(time: string, range: string): string {
  if (range === "30d") {
    // Date only
    return time.slice(5); // MM-DD
  }
  // Hour format
  const parts = time.split(" ");
  if (parts.length >= 2) {
    return parts[1].slice(0, 5); // HH:MM
  }
  return time.slice(-5);
}
