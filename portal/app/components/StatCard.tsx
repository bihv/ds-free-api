"use client";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: "indigo" | "green" | "amber" | "red";
}

const colorMap = {
  indigo: "bg-surface-200 text-text-secondary ring-1 ring-surface-300",
  green: "bg-success/10 text-success ring-1 ring-success/20",
  amber: "bg-warning/10 text-warning ring-1 ring-warning/20",
  red: "bg-danger/10 text-danger ring-1 ring-danger/20",
};

const iconColorMap = {
  indigo: "text-text-secondary",
  green: "text-success",
  amber: "text-warning",
  red: "text-danger",
};

export default function StatCard({ title, value, subtitle, icon, color = "indigo" }: StatCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl bg-surface-100 p-6 
        shadow-whisper border border-surface-300 
        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-surface-400
      `}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text-secondary font-sans">{title}</p>
          <p className="text-3xl font-serif text-text-primary tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-sm text-text-muted mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-xl p-2.5 ${colorMap[color]} shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
