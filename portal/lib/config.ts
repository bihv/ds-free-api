import fs from "fs";
import path from "path";
import TOML from "toml";

export interface AccountInfo {
  email: string;
  mobile: string;
}

export interface PortalConfig {
  upstream_url: string;
  accounts: AccountInfo[];
}

/**
 * Read account list from the parent project's config.toml
 * This is read-only — we never modify the original config
 */
export function loadConfig(): PortalConfig {
  const upstream_url = process.env.UPSTREAM_URL || "http://127.0.0.1:5317";

  // Try to find config.toml in the parent directory
  const configPath = path.join(process.cwd(), "..", "config.toml");
  const accounts: AccountInfo[] = [];

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const parsed = TOML.parse(content);

      if (Array.isArray(parsed.accounts)) {
        for (const acc of parsed.accounts) {
          accounts.push({
            email: acc.email || "",
            mobile: acc.mobile || "",
          });
        }
      }
    }
  } catch (e) {
    console.warn("Failed to read config.toml:", e);
  }

  return { upstream_url, accounts };
}

// Cache config in memory
let _config: PortalConfig | null = null;

export function getConfig(): PortalConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}
