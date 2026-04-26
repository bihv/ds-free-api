"use client";

interface ModelDistributionProps {
  data: { model: string; count: number }[];
}

const COLORS = [
  "#c96442", // Terracotta
  "#d97757", // Coral
  "#538d53", // Muted Green
  "#c98e42", // Warm Amber
  "#b53333", // Warm Crimson
  "#87867f", // Stone Gray
  "#5e5d59", // Olive Gray
  "#b0aea5", // Warm Silver
];

export default function ModelDistribution({ data }: ModelDistributionProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-surface-300 bg-surface-100 p-6 shadow-whisper">
        <h3 className="font-serif text-lg text-text-primary mb-4">Model Distribution</h3>
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-text-muted font-sans">No data yet</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-xl border border-surface-300 bg-surface-100 p-6 shadow-whisper flex flex-col justify-between">
      <div className="mb-6">
        <h3 className="font-serif text-lg text-text-primary">Model Distribution</h3>
        <p className="text-sm text-text-secondary mt-1 font-sans">Usage by model type</p>
      </div>

      {/* Bar chart */}
      <div className="space-y-3">
        {data.map((item, i) => {
          const pct = (item.count / total) * 100;
          const color = COLORS[i % COLORS.length];
          return (
            <div key={item.model} className="group mb-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                  {item.model || "unknown"}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-text-muted">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium" style={{ color }}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-300">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    boxShadow: `0 0 8px ${color}40`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
