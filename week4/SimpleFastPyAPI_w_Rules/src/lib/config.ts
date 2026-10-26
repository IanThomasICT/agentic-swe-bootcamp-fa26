import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const PROJECT_ROOT = resolve(process.cwd());
export const ADMIN_TOKEN_ENV_VAR = "ADMIN_TOKEN";
export const SESSION_COOKIE_NAME = "admin_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function parseEnvFile(filePath: string): Record<string, string> {
  let contents: string;
  try {
    contents = readFileSync(filePath, "utf8");
  } catch {
    return {};
  }

  const values: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const separator = line.indexOf("=");
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (value.length > 1 && value[0] === value.at(-1) && ["\"", "'"].includes(value[0])) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function getAdminToken(): string | null {
  const configured = Object.hasOwn(process.env, ADMIN_TOKEN_ENV_VAR)
    ? process.env[ADMIN_TOKEN_ENV_VAR]
    : parseEnvFile(resolve(PROJECT_ROOT, ".env"))[ADMIN_TOKEN_ENV_VAR];
  return configured?.trim() || null;
}
