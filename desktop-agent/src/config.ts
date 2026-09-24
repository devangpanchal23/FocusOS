import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface AgentConfig {
  apiBase: string;
  deviceId: string | null;
  syncToken: string | null;
  pollIntervalMs: number;
  syncIntervalMs: number;
}

export const DEFAULT_API_BASE = "http://localhost:5000/api";
export const DEFAULT_POLL_INTERVAL_MS = 5_000;
export const DEFAULT_SYNC_INTERVAL_MS = 30_000;

const CONFIG_DIR = path.join(os.homedir(), ".focusos");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

function defaultConfig(): AgentConfig {
  return {
    apiBase: DEFAULT_API_BASE,
    deviceId: null,
    syncToken: null,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
    syncIntervalMs: DEFAULT_SYNC_INTERVAL_MS,
  };
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): AgentConfig {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    return defaultConfig();
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...defaultConfig(), ...parsed };
  } catch {
    // Corrupt config file - fall back to defaults rather than crashing the agent.
    return defaultConfig();
  }
}

export function saveConfig(config: AgentConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function updateConfig(patch: Partial<AgentConfig>): AgentConfig {
  const current = loadConfig();
  const next = { ...current, ...patch };
  saveConfig(next);
  return next;
}

export function isRegistered(config: AgentConfig): boolean {
  return Boolean(config.deviceId && config.syncToken);
}
