import os from "node:os";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { loadConfig, saveConfig, DEFAULT_API_BASE } from "./config.js";

type DesktopOs = "MACOS" | "WINDOWS" | "LINUX";

function detectOs(): DesktopOs {
  switch (os.platform()) {
    case "darwin":
      return "MACOS";
    case "win32":
      return "WINDOWS";
    default:
      return "LINUX";
  }
}

function parseArgs(argv: string[]): { token?: string; apiBase?: string; name?: string } {
  const out: { token?: string; apiBase?: string; name?: string } = {};
  for (const arg of argv) {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    const value = rest.join("=");
    if (key === "token") out.token = value;
    else if (key === "api-base") out.apiBase = value;
    else if (key === "name") out.name = value;
  }
  return out;
}

async function prompt(question: string, fallback?: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const suffix = fallback ? ` [${fallback}]` : "";
    const answer = (await rl.question(`${question}${suffix}: `)).trim();
    return answer || fallback || "";
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();

  let token = args.token ?? process.env.FOCUSOS_TOKEN;
  let apiBase = args.apiBase ?? process.env.FOCUSOS_API_BASE ?? config.apiBase ?? DEFAULT_API_BASE;
  let deviceName = args.name ?? process.env.FOCUSOS_DEVICE_NAME;

  const interactive = process.stdin.isTTY && !token;

  if (!token && interactive) {
    token = await prompt("Paste your FocusOS JWT access token");
  }
  if (!token) {
    console.error(
      "No token provided. Pass --token=<jwt>, set FOCUSOS_TOKEN, or run interactively."
    );
    process.exitCode = 1;
    return;
  }

  if (interactive) {
    apiBase = await prompt("API base URL", apiBase);
    deviceName = await prompt("Device name", deviceName ?? os.hostname());
  }
  apiBase = apiBase || DEFAULT_API_BASE;
  deviceName = deviceName || os.hostname();

  const body = {
    name: deviceName,
    deviceType: "DESKTOP" as const,
    os: detectOs(),
  };

  console.log(`Registering device "${deviceName}" (${body.os}) with ${apiBase} ...`);

  let response: Response;
  try {
    response = await fetch(`${apiBase}/v5/desktop/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`Failed to reach ${apiBase}: ${String(err)}`);
    process.exitCode = 1;
    return;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`Registration failed: HTTP ${response.status} ${text}`);
    process.exitCode = 1;
    return;
  }

  const data = (await response.json()) as { deviceId: string; syncToken: string };
  if (!data.deviceId || !data.syncToken) {
    console.error("Registration response missing deviceId/syncToken.");
    process.exitCode = 1;
    return;
  }

  saveConfig({
    ...config,
    apiBase,
    deviceId: data.deviceId,
    syncToken: data.syncToken,
  });

  console.log(`Registered successfully. deviceId=${data.deviceId}`);
  console.log(`Config saved. Run "npm start" to begin tracking.`);
}

main().catch((err) => {
  console.error("Unexpected error during registration:", err);
  process.exitCode = 1;
});
