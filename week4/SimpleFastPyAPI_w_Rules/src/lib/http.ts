import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ValidationIssue {
  loc: Array<string | number>;
  msg: string;
  type: string;
}

export function sendValidationError(context: Context, issues: ValidationIssue[]): Response {
  const response = context.json({ detail: issues }, 422);
  context.res = response;
  return response;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

export function validateStringFields(
  context: Context,
  value: unknown,
  fields: string[],
  form = false,
): Record<string, string> | undefined {
  if (value === undefined && !form) {
    sendValidationError(context, [{ loc: ["body"], msg: "field required", type: "value_error.missing" }]);
    return undefined;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    sendValidationError(context, [{
      loc: ["body"],
      msg: "value is not a valid dict",
      type: "type_error.dict",
    }]);
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const parsed: Record<string, string> = {};
  const issues: ValidationIssue[] = [];
  for (const field of fields) {
    if (!Object.hasOwn(record, field)) {
      issues.push({ loc: ["body", field], msg: "field required", type: "value_error.missing" });
      continue;
    }
    const raw = record[field];
    const fieldValue = form && Array.isArray(raw) ? raw[0] : raw;
    const converted = stringValue(fieldValue);
    if (converted === undefined) {
      issues.push({ loc: ["body", field], msg: "str type expected", type: "type_error.str" });
      continue;
    }
    parsed[field] = converted;
  }
  if (issues.length) {
    sendValidationError(context, issues);
    return undefined;
  }
  return parsed;
}

export async function readJsonFields(
  context: Context,
  fields: string[],
): Promise<Record<string, string> | undefined> {
  try {
    return validateStringFields(context, await context.req.json(), fields);
  } catch {
    sendValidationError(context, [{
      loc: ["body", 0],
      msg: "Expecting value: line 1 column 1 (char 0)",
      type: "value_error.jsondecode",
    }]);
    return undefined;
  }
}

export async function readFormFields(
  context: Context,
  requiredFields: string[],
  defaults: Record<string, string> = {},
): Promise<Record<string, string> | undefined> {
  let body: Record<string, unknown>;
  try {
    body = await context.req.parseBody() as Record<string, unknown>;
  } catch {
    body = {};
  }
  const parsed = validateStringFields(context, body, requiredFields, true);
  if (!parsed) return undefined;
  for (const [field, fallback] of Object.entries(defaults)) {
    const raw = body[field];
    const value = Array.isArray(raw) ? raw[0] : raw;
    parsed[field] = value === undefined ? fallback : stringValue(value) ?? fallback;
  }
  return parsed;
}

export function parseInteger(
  context: Context,
  raw: string | undefined,
  source: "path" | "query",
  name: string,
  defaultValue?: number,
): number | null {
  if (raw === undefined && defaultValue !== undefined) return defaultValue;
  if (raw !== undefined && /^[+-]?\d+$/.test(raw)) {
    const parsed = Number(raw);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  sendValidationError(context, [{
    loc: [source, name],
    msg: "value is not a valid integer",
    type: "type_error.integer",
  }]);
  return null;
}

export function publicError(
  context: Context,
  status: ContentfulStatusCode,
  detail: string,
): Response {
  return context.json({ detail }, status);
}
