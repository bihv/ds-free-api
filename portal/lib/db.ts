import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "stats.sqlite");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("busy_timeout = 5000");

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now', 'localtime')),
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      model TEXT DEFAULT '',
      stream INTEGER DEFAULT 0,
      status_code INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      error TEXT DEFAULT '',
      account TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
    CREATE INDEX IF NOT EXISTS idx_requests_model ON requests(model);
    CREATE INDEX IF NOT EXISTS idx_requests_path ON requests(path);
  `);

  try {
    _db.exec("ALTER TABLE requests ADD COLUMN account TEXT DEFAULT ''");
  } catch (e) {
    // Column already exists
  }

  return _db;
}

export function resetData() {
  const db = getDb();
  db.exec("DELETE FROM requests");
}

export interface RequestLog {
  method: string;
  path: string;
  model: string;
  stream: boolean;
  status_code: number;
  duration_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  error: string;
  account: string;
}

export function logRequest(req: RequestLog) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO requests (method, path, model, stream, status_code, duration_ms, prompt_tokens, completion_tokens, total_tokens, error, account)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    req.method,
    req.path,
    req.model,
    req.stream ? 1 : 0,
    req.status_code,
    req.duration_ms,
    req.prompt_tokens,
    req.completion_tokens,
    req.total_tokens,
    req.error,
    req.account || ""
  );
}

export interface StatsOverview {
  total_requests: number;
  today_requests: number;
  success_rate: number;
  avg_duration_ms: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  requests_by_model: { model: string; count: number }[];
  requests_by_status: { status_code: number; count: number }[];
  recent_errors: { timestamp: string; path: string; model: string; error: string }[];
}

export function getStatsOverview(): StatsOverview {
  const db = getDb();

  const total = db.prepare("SELECT COUNT(*) as count FROM requests").get() as { count: number };
  const today = db.prepare(
    "SELECT COUNT(*) as count FROM requests WHERE date(timestamp) = date('now', 'localtime')"
  ).get() as { count: number };
  const success = db.prepare(
    "SELECT COUNT(*) as count FROM requests WHERE status_code >= 200 AND status_code < 400"
  ).get() as { count: number };
  const avgDuration = db.prepare(
    "SELECT AVG(duration_ms) as avg FROM requests WHERE status_code >= 200 AND status_code < 400"
  ).get() as { avg: number | null };
  const totalPromptTokens = db.prepare(
    "SELECT SUM(prompt_tokens) as total FROM requests"
  ).get() as { total: number | null };
  const totalCompletionTokens = db.prepare(
    "SELECT SUM(completion_tokens) as total FROM requests"
  ).get() as { total: number | null };

  const byModel = db.prepare(
    "SELECT model, COUNT(*) as count FROM requests WHERE model != '' GROUP BY model ORDER BY count DESC"
  ).all() as { model: string; count: number }[];

  const byStatus = db.prepare(
    "SELECT status_code, COUNT(*) as count FROM requests GROUP BY status_code ORDER BY status_code"
  ).all() as { status_code: number; count: number }[];

  const recentErrors = db.prepare(
    "SELECT timestamp, path, model, error FROM requests WHERE status_code >= 400 OR error != '' ORDER BY id DESC LIMIT 10"
  ).all() as { timestamp: string; path: string; model: string; error: string }[];

  return {
    total_requests: total.count,
    today_requests: today.count,
    success_rate: total.count > 0 ? (success.count / total.count) * 100 : 100,
    avg_duration_ms: Math.round(avgDuration.avg || 0),
    total_prompt_tokens: totalPromptTokens.total || 0,
    total_completion_tokens: totalCompletionTokens.total || 0,
    requests_by_model: byModel,
    requests_by_status: byStatus,
    recent_errors: recentErrors,
  };
}

export interface TimelinePoint {
  time: string;
  count: number;
  errors: number;
}

export function getTimeline(range: string): TimelinePoint[] {
  const db = getDb();

  let groupBy: string;
  let where: string;

  switch (range) {
    case "1h":
      groupBy = "strftime('%Y-%m-%d %H:%M', timestamp)";
      where = "timestamp >= datetime('now', 'localtime', '-1 hour')";
      break;
    case "24h":
      groupBy = "strftime('%Y-%m-%d %H:00', timestamp)";
      where = "timestamp >= datetime('now', 'localtime', '-24 hours')";
      break;
    case "7d":
      groupBy = "strftime('%Y-%m-%d %H:00', timestamp)";
      where = "timestamp >= datetime('now', 'localtime', '-7 days')";
      break;
    case "30d":
      groupBy = "date(timestamp)";
      where = "timestamp >= datetime('now', 'localtime', '-30 days')";
      break;
    default:
      groupBy = "strftime('%Y-%m-%d %H:00', timestamp)";
      where = "timestamp >= datetime('now', 'localtime', '-24 hours')";
  }

  const rows = db.prepare(`
    SELECT
      ${groupBy} as time,
      COUNT(*) as count,
      SUM(CASE WHEN status_code >= 400 OR error != '' THEN 1 ELSE 0 END) as errors
    FROM requests
    WHERE ${where}
    GROUP BY time
    ORDER BY time
  `).all() as TimelinePoint[];

  return rows;
}

export interface RequestEntry {
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
  account: string;
}

export function getRequests(page: number, limit: number, model?: string, status?: string): { data: RequestEntry[]; total: number } {
  const db = getDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (model && model !== "all") {
    conditions.push("model = ?");
    params.push(model);
  }
  if (status === "success") {
    conditions.push("status_code >= 200 AND status_code < 400");
  } else if (status === "error") {
    conditions.push("(status_code >= 400 OR error != '')");
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const offset = (page - 1) * limit;

  const total = db.prepare(`SELECT COUNT(*) as count FROM requests ${whereClause}`).get(...params) as { count: number };
  const data = db.prepare(
    `SELECT * FROM requests ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as RequestEntry[];

  return { data, total: total.count };
}
