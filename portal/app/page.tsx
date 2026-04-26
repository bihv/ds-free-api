"use client";

import { useCallback, useEffect, useState } from "react";
import StatCard from "./components/StatCard";
import RequestChart from "./components/RequestChart";
import ModelDistribution from "./components/ModelDistribution";
import RequestTable from "./components/RequestTable";
import AccountList from "./components/AccountList";

interface StatsData {
  total_requests: number;
  today_requests: number;
  success_rate: number;
  avg_duration_ms: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  requests_by_model: { model: string; count: number }[];
  requests_by_status: { status_code: number; count: number }[];
  recent_errors: { timestamp: string; path: string; model: string; error: string }[];
  accounts: { email: string; mobile: string }[];
  total_accounts: number;
  upstream_url: string;
}

interface TimelinePoint {
  time: string;
  count: number;
  errors: number;
}

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
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [timeRange, setTimeRange] = useState("24h");
  const [requests, setRequests] = useState<RequestEntry[]>([]);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [requestsPage, setRequestsPage] = useState(1);
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from document
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  }, []);

  const fetchTimeline = useCallback(async (range: string) => {
    try {
      const res = await fetch(`/api/timeline?range=${range}`);
      const data = await res.json();
      setTimeline(data);
    } catch (e) {
      console.error("Failed to fetch timeline:", e);
    }
  }, []);

  const fetchRequests = useCallback(async (page: number, model: string, status: string) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "30",
      });
      if (model !== "all") params.set("model", model);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();
      setRequests(data.data);
      setRequestsTotal(data.total);
    } catch (e) {
      console.error("Failed to fetch requests:", e);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchTimeline(timeRange),
      fetchRequests(requestsPage, modelFilter, statusFilter),
    ]);
    setLastUpdated(new Date());
    setIsRefreshing(false);
    setLoading(false);
  }, [fetchStats, fetchTimeline, fetchRequests, timeRange, requestsPage, modelFilter, statusFilter]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleRangeChange = (range: string) => {
    setTimeRange(range);
    fetchTimeline(range);
  };

  const handlePageChange = (page: number) => {
    setRequestsPage(page);
    fetchRequests(page, modelFilter, statusFilter);
  };

  const handleFilterChange = (model: string, status: string) => {
    setModelFilter(model);
    setStatusFilter(status);
    setRequestsPage(1);
    fetchRequests(1, model, status);
  };

  const handleResetData = async () => {
    if (window.confirm("Are you sure you want to delete all tracking data? This cannot be undone.")) {
      try {
        setIsRefreshing(true);
        await fetch("/api/reset", { method: "POST" });
        await fetchAll();
      } catch (e) {
        console.error("Failed to reset data:", e);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-surface-300 border-t-accent-primary" />
          <p className="text-sm text-text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-surface-300/50 bg-surface-50/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-primary shadow-whisper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#faf9f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-serif text-text-primary mb-0.5 mt-0.5 tracking-tight">DS Free API Portal</h1>
              <p className="text-xs text-text-muted font-sans">
                Monitoring &bull; <span className="font-mono">{stats?.upstream_url || "http://127.0.0.1:5317"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-lg bg-surface-200 px-3 py-1.5 text-text-secondary shadow-ring transition-all hover:bg-surface-300 hover:text-text-primary"
              title="Toggle Theme"
            >
              {isDarkMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Connection status */}
            <div className="flex items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 border border-surface-300 hidden sm:flex">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(83,141,83,0.5)]" />
              <span className="text-xs text-text-secondary font-medium">
                {stats?.total_accounts || 0} accounts
              </span>
            </div>

            {/* Last updated */}
            <div className="hidden items-center gap-2 text-xs text-text-muted sm:flex">
              {isRefreshing && (
                <div className="h-3 w-3 animate-spin rounded-full border border-surface-400 border-t-accent-primary" />
              )}
              {lastUpdated && (
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              )}
            </div>

            {/* Manual refresh */}
            <button
              onClick={fetchAll}
              disabled={isRefreshing}
              className="rounded-lg bg-surface-200 px-3 py-1.5 text-text-secondary shadow-ring transition-all hover:bg-surface-300 hover:text-text-primary disabled:opacity-50"
              title="Refresh"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isRefreshing ? "animate-spin" : ""}
              >
                <path d="M21 12a9 9 0 11-6.22-8.56" />
                <path d="M21 3v9h-9" />
              </svg>
            </button>
            <button
              onClick={handleResetData}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger shadow-[0_0_0_1px_rgba(181,51,51,0.2)] transition-all hover:bg-danger/20 disabled:opacity-50"
              title="Reset Data"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Requests"
            value={stats?.total_requests || 0}
            subtitle="All time"
            color="indigo"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          />
          <StatCard
            title="Today"
            value={stats?.today_requests || 0}
            subtitle={`${new Date().toLocaleDateString()}`}
            color="green"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
          />
          <StatCard
            title="Success Rate"
            value={`${(stats?.success_rate || 100).toFixed(1)}%`}
            subtitle="200 OK responses"
            color={(stats?.success_rate || 100) >= 95 ? "green" : (stats?.success_rate || 100) >= 80 ? "amber" : "red"}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
          <StatCard
            title="Avg Duration"
            value={stats?.avg_duration_ms ? `${(stats.avg_duration_ms / 1000).toFixed(1)}s` : "—"}
            subtitle="Successful requests"
            color="amber"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            title="Prompt Tokens"
            value={(stats?.total_prompt_tokens || 0).toLocaleString()}
            subtitle="Total accumulated"
            color="indigo"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            }
          />
          <StatCard
            title="Completion Tokens"
            value={(stats?.total_completion_tokens || 0).toLocaleString()}
            subtitle="Total accumulated"
            color="green"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            }
          />
        </div>

        {/* Charts & Lists row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Main Visuals Column */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            <div className="flex-1">
              <RequestChart
                data={timeline}
                range={timeRange}
                onRangeChange={handleRangeChange}
              />
            </div>
            {/* Recent errors */}
            {stats?.recent_errors && stats.recent_errors.length > 0 && (
              <div className="rounded-xl border border-danger/30 bg-surface-100 p-6 shadow-whisper shrink-0">
                <h3 className="font-serif text-lg text-danger mb-4">Recent Errors</h3>
                <div className="space-y-3">
                  {stats.recent_errors.slice(0, 5).map((err, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="shrink-0 font-mono text-text-muted">{err.timestamp}</span>
                      <span className="shrink-0 text-text-secondary">{err.model || "—"}</span>
                      <span className="truncate text-danger">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Side Info Column */}
          <div className="space-y-4">
            <ModelDistribution data={stats?.requests_by_model || []} />
            <AccountList accounts={stats?.accounts || []} />
          </div>
        </div>

        {/* Request log table */}
        <RequestTable
          data={requests}
          total={requestsTotal}
          page={requestsPage}
          limit={30}
          onPageChange={handlePageChange}
          onFilterChange={handleFilterChange}
          models={stats?.requests_by_model.map((m) => m.model) || []}
        />
      </main>

      {/* Footer */}
      <footer className="mt-8 py-8 text-center text-sm text-text-muted font-sans border-t border-surface-300">
        DS Free API Monitoring Portal
      </footer>
    </div>
  );
}
