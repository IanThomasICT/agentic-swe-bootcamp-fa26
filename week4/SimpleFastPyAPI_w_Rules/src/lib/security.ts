import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./config";

export const TOKEN_HEADER = "X-Admin-Token";
export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;

export type AdminTokenGetter = () => string | null;

const SCRYPT_N = 2 ** 14;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, SCRYPT_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${salt.toString("hex")}$${digest.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || !/^(?:[\da-fA-F]{2})+$/.test(parts[1])) return false;
  try {
    const salt = Buffer.from(parts[1], "hex");
    const candidate = scryptSync(password, salt, SCRYPT_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: 64 * 1024 * 1024,
    });
    const candidateHex = Buffer.from(candidate.toString("hex"));
    const storedHex = Buffer.from(parts[2]);
    return candidateHex.length === storedHex.length && timingSafeEqual(candidateHex, storedHex);
  } catch {
    return false;
  }
}

export function tokenMatches(candidate: string | undefined, expected: string | null): boolean {
  if (!candidate || !expected) return false;
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

export function createSessionValue(token: string, issuedAt = Math.floor(Date.now() / 1000)): string {
  const payload = String(issuedAt);
  return `${payload}.${createHmac("sha256", token).update(payload).digest("hex")}`;
}

export function verifySessionValue(
  value: string | undefined,
  token: string | null,
  maxAge = 8 * 60 * 60,
  now = Date.now() / 1000,
): boolean {
  if (!value || !token) return false;
  const separator = value.indexOf(".");
  if (separator < 0) return false;
  const issuedAtText = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!signature) return false;
  const expected = createHmac("sha256", token).update(issuedAtText).digest("hex");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return false;
  }
  if (!/^[+-]?\d+$/.test(issuedAtText)) return false;
  const issued = Number(issuedAtText);
  if (!Number.isSafeInteger(issued)) return false;
  const age = now - issued;
  return age >= -60 && age <= maxAge;
}

function cookieValue(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}

export function extractHeaderToken(headers: Headers): string | undefined {
  const header = headers.get(TOKEN_HEADER);
  if (header) return header.trim();
  const authorization = headers.get("Authorization") ?? "";
  const separator = authorization.indexOf(" ");
  if (separator < 0 || authorization.slice(0, separator).toLowerCase() !== "bearer") {
    return undefined;
  }
  return authorization.slice(separator + 1).trim();
}

export function isAdmin(request: Request, getToken: AdminTokenGetter): boolean {
  const token = getToken();
  if (!token) return false;
  if (tokenMatches(extractHeaderToken(request.headers), token)) return true;
  return verifySessionValue(cookieValue(request, SESSION_COOKIE_NAME), token);
}

export function requireAdmin(getToken: AdminTokenGetter): MiddlewareHandler {
  return async (context, next) => {
    if (!getToken()) return context.json({ detail: "Admin portal is not configured" }, 503);
    if (!isAdmin(context.req.raw, getToken)) {
      context.header("WWW-Authenticate", TOKEN_HEADER);
      return context.json({ detail: "Admin token required" }, 401);
    }
    await next();
  };
}

export function safeNext(url: string | undefined): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/admin/";
  if (!url.startsWith("/admin")) return "/admin/";
  return url;
}
