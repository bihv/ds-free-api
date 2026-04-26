"use client";

import { useMemo, useState } from "react";

interface RequestEntry {
  id: number;
  timestamp: string;
  method: string;
  path: string;
  model: string;
  stream: number;
  status_code: number;
  duration_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  error: string;
  account?: string;
}

interface RequestTableProps {
  data: RequestEntry[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onFilterChange: (model: string, status: string) => void;
  models: string[];
}

export default function RequestTable({
  data,
  total,
  page,
  limit,
  onPageChange,
  onFilterChange,
  models,
}: RequestTableProps) {
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const statusClassMap = useMemo(
    () => ({
      success: "bg-success/10 text-success",
      error: "bg-danger/10 text-danger",
      other: "bg-warning/10 text-warning",
    }),
    []
  );

  const handleModelChange = (value: string) => {
    setModelFilter(value);
    onFilterChange(value, statusFilter);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    onFilterChange(modelFilter, value);
  };

  const getStatusTone = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 400) return statusClassMap.success;
    if (statusCode >= 400) return statusClassMap.error;
    return statusClassMap.other;
  };

  const formatDuration = (durationMs: number) => {
    if (durationMs <= 0) return "-";
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const baseCellClass = "px-4 py-3";

  return (
    <div className="rounded-xl border border-surface-300 bg-surface-100 shadow-whisper mt-4">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-surface-300 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-serif text-lg text-text-primary">Request Log</h3>
          <p className="text-sm text-text-secondary mt-1 font-sans">
            {total.toLocaleString()} total requests
            {total > 0 ? ` · Showing ${from}-${to}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={modelFilter}
            onChange={(e) => handleModelChange(e.target.value)}
            className="rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary shadow-sm"
          >
            <option value="all">All Models</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary shadow-sm"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead>
            <tr className="border-b border-surface-300 bg-surface-50">
              <th className="px-6 py-4 text-left font-medium text-text-secondary">Time</th>
              <th className="px-4 py-4 text-left font-medium text-text-secondary">Method</th>
              <th className="px-4 py-4 text-left font-medium text-text-secondary">Path</th>
              <th className="px-4 py-4 text-left font-medium text-text-secondary">Model</th>
              <th className="px-4 py-4 text-center font-medium text-text-secondary">Stream</th>
              <th className="px-4 py-4 text-center font-medium text-text-secondary">Status</th>
              <th className="px-4 py-4 text-left font-medium text-text-secondary">Account</th>
              <th className="px-4 py-4 text-right font-medium text-text-secondary">Duration</th>
              <th className="px-4 py-4 text-right font-medium text-text-secondary">Tokens (In / Out)</th>
              <th className="px-6 py-4 text-left font-medium text-text-secondary">Error</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-text-muted">
                  No requests recorded yet. Send requests through the proxy to see them here.
                </td>
              </tr>
            ) : (
              data.map((req, i) => (
                <tr
                  key={req.id}
                  className={`border-b border-surface-300/20 transition-colors hover:bg-surface-200/50 ${
                    i % 2 === 0 ? "bg-transparent" : "bg-surface-200/20"
                  }`}
                >
                  <td className="whitespace-nowrap px-6 py-3 font-mono text-text-secondary">
                    {req.timestamp}
                  </td>
                  <td className={baseCellClass}>
                    <span className="rounded-md bg-surface-200 px-2 py-0.5 font-mono text-text-secondary">
                      {req.method}
                    </span>
                  </td>
                  <td className={`max-w-[220px] truncate font-mono text-text-secondary ${baseCellClass}`}>
                    {req.path}
                  </td>
                  <td className={`${baseCellClass} text-text-secondary`}>{req.model || "-"}</td>
                  <td className={`${baseCellClass} text-center`}>
                    {req.stream ? (
                      <span className="inline-block h-2 w-2 rounded-full bg-accent-secondary" title="Streaming" />
                    ) : (
                      <span className="inline-block h-2 w-2 rounded-full bg-surface-300" title="Non-streaming" />
                    )}
                  </td>
                  <td className={`${baseCellClass} text-center`}>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono font-medium ${getStatusTone(req.status_code)}`}>
                      {req.status_code}
                    </span>
                  </td>
                  <td className={`whitespace-nowrap font-mono text-text-secondary ${baseCellClass}`}>
                    {req.account || "-"}
                  </td>
                  <td className={`whitespace-nowrap text-right font-mono text-text-secondary ${baseCellClass}`}>
                    {formatDuration(req.duration_ms)}
                  </td>
                  <td className={`whitespace-nowrap text-right font-mono text-text-muted ${baseCellClass}`}>
                    {req.total_tokens > 0 ? (
                      <div className="flex flex-col items-end">
                        <span>{req.total_tokens.toLocaleString()}</span>
                        <span className="text-[11px] text-text-muted/80 whitespace-nowrap">
                          {req.prompt_tokens.toLocaleString()} In | {req.completion_tokens.toLocaleString()} Out
                        </span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="max-w-[200px] truncate px-6 py-3 text-danger" title={req.error}>
                    {req.error || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-surface-300 p-6 mt-2">
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-lg bg-surface-200 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-300 shadow-sm disabled:opacity-30 disabled:hover:bg-surface-200"
            >
              ← Prev
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded-lg bg-surface-200 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-300 shadow-sm disabled:opacity-30 disabled:hover:bg-surface-200"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
