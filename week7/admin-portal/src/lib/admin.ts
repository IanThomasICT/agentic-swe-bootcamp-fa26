import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { DatabaseSync } from "node:sqlite";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getAdminToken,
} from "./config";
import {
  createSessionValue,
  isAdmin,
  requireAdmin,
  safeNext,
  tokenMatches,
  type AdminTokenGetter,
  hashPassword,
} from "./security";
import { readFormFields, readJsonFields, parseInteger, publicError } from "./http";
import type { PublicUser, User } from "./types";
import { renderLoginPage, renderUserEditPage, renderUsersPage } from "../pages/admin";

const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 100;

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function toResponse(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

function findUser(database: DatabaseSync, userId: number): User | undefined {
  return database.prepare("SELECT id, name, email, password FROM users WHERE id = ?").get(userId) as
    | User
    | undefined;
}

function emailTaken(database: DatabaseSync, email: string, excludeId?: number): boolean {
  const row = excludeId === undefined
    ? database.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(email)
    : database.prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1").get(email, excludeId);
  return row !== undefined;
}

function listUsers(
  database: DatabaseSync,
  queryText = "",
  skip = 0,
  limit = DEFAULT_PAGE_SIZE,
): User[] {
  const query = clean(queryText);
  const offset = Math.max(skip, 0);
  if (query) {
    const pattern = `%${query}%`;
    return database
      .prepare(
        "SELECT id, name, email, password FROM users WHERE name LIKE ? COLLATE NOCASE OR email LIKE ? COLLATE NOCASE ORDER BY id LIMIT ? OFFSET ?",
      )
      .all(pattern, pattern, limit, offset) as unknown as User[];
  }
  return database
    .prepare("SELECT id, name, email, password FROM users ORDER BY id LIMIT ? OFFSET ?")
    .all(limit, offset) as unknown as User[];
}

function countUsers(database: DatabaseSync): number {
  return (database.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number }).count;
}

function loginPage(
  context: Context,
  getToken: AdminTokenGetter,
  error: string | null = null,
  nextUrl = "/admin/",
  statusCode: ContentfulStatusCode = 200,
): Response {
  return context.html(
    renderLoginPage({ error, nextUrl: safeNext(nextUrl), tokenConfigured: Boolean(getToken()) }),
    statusCode,
  );
}

export function createAdminApp(
  database: DatabaseSync,
  getToken: AdminTokenGetter = getAdminToken,
): Hono {
  const router = new Hono();
  const api = new Hono();
  const requireApiAdmin = requireAdmin(getToken);

  api.get("/users", requireApiAdmin, async (context) => {
    const skip = parseInteger(context, context.req.query("skip"), "query", "skip", 0);
    if (skip === null) return context.res;
    const limit = parseInteger(context, context.req.query("limit"), "query", "limit", DEFAULT_PAGE_SIZE);
    if (limit === null) return context.res;
    const boundedLimit = Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
    const users = listUsers(database, context.req.query("q"), skip, boundedLimit).map(toResponse);
    return context.json(users);
  });

  api.post("/users", requireApiAdmin, async (context) => {
    const payload = await readJsonFields(context, ["name", "email", "password"]);
    if (!payload) return context.res;
    const name = clean(payload.name);
    const email = clean(payload.email);
    if (!name || !email || !payload.password) {
      return publicError(context, 400, "Name, email and password are required");
    }
    if (emailTaken(database, email)) {
      return publicError(context, 409, "Email already registered");
    }
    const result = database
      .prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
      .run(name, email, hashPassword(payload.password));
    const user = findUser(database, Number(result.lastInsertRowid));
    return context.json(toResponse(user!), 201);
  });

  api.get("/users/:user_id", requireApiAdmin, (context) => {
    const userId = parseInteger(context, context.req.param("user_id"), "path", "user_id");
    if (userId === null) return context.res;
    const user = findUser(database, userId);
    if (!user) return publicError(context, 404, "User not found");
    return context.json(toResponse(user));
  });

  api.put("/users/:user_id", requireApiAdmin, async (context) => {
    const userId = parseInteger(context, context.req.param("user_id"), "path", "user_id");
    if (userId === null) return context.res;
    const payload = await readJsonFields(context, ["name", "email"]);
    if (!payload) return context.res;
    const user = findUser(database, userId);
    if (!user) return publicError(context, 404, "User not found");
    const name = clean(payload.name);
    const email = clean(payload.email);
    if (!name || !email) return publicError(context, 400, "Name and email are required");
    if (emailTaken(database, email, userId)) {
      return publicError(context, 409, "Email already registered");
    }
    database.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, userId);
    return context.json(toResponse(findUser(database, userId)!));
  });

  api.delete("/users/:user_id", requireApiAdmin, (context) => {
    const userId = parseInteger(context, context.req.param("user_id"), "path", "user_id");
    if (userId === null) return context.res;
    if (!findUser(database, userId)) return publicError(context, 404, "User not found");
    database.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return context.json({ message: "User deleted successfully" });
  });

  api.post("/users/:user_id/password", requireApiAdmin, async (context) => {
    const userId = parseInteger(context, context.req.param("user_id"), "path", "user_id");
    if (userId === null) return context.res;
    const payload = await readJsonFields(context, ["password"]);
    if (!payload) return context.res;
    const user = findUser(database, userId);
    if (!user) return publicError(context, 404, "User not found");
    if (!payload.password) return publicError(context, 400, "Password must not be empty");
    database.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashPassword(payload.password), userId);
    return context.json(toResponse(findUser(database, userId)!));
  });

  router.get("/login", (context) => {
    const nextUrl = context.req.query("next_url") ?? "/admin/";
    if (isAdmin(context.req.raw, getToken)) return context.redirect(safeNext(nextUrl), 303);
    return loginPage(context, getToken, null, nextUrl);
  });

  router.post("/login", async (context) => {
    const form = await readFormFields(context, ["token"], { next_url: "/admin/" });
    if (!form) return context.res;
    const expected = getToken();
    if (!expected) {
      return loginPage(
        context,
        getToken,
        "The admin portal is not configured. Set ADMIN_TOKEN and restart.",
        form.next_url,
        503,
      );
    }
    if (!tokenMatches(form.token, expected)) {
      return loginPage(context, getToken, "That admin token is not valid.", form.next_url, 401);
    }
    setCookie(context, SESSION_COOKIE_NAME, createSessionValue(expected), {
      maxAge: SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: "Lax",
      secure: new URL(context.req.url).protocol === "https:",
      path: "/admin",
    });
    return context.redirect(safeNext(form.next_url), 303);
  });

  router.post("/logout", (context) => {
    deleteCookie(context, SESSION_COOKIE_NAME, { path: "/admin" });
    return context.redirect("/admin/login", 303);
  });

  router.get("/", (context) => {
    if (!isAdmin(context.req.raw, getToken)) return context.redirect("/admin/login", 303);
    const query = clean(context.req.query("q"));
    return context.html(renderUsersPage({
      users: listUsers(database, query).map(toResponse),
      total: countUsers(database),
      query,
      notice: context.req.query("notice") ?? "",
      error: context.req.query("error") ?? "",
    }));
  });

  router.get("/users/:user_id", (context) => {
    if (!isAdmin(context.req.raw, getToken)) return context.redirect("/admin/login", 303);
    const userId = parseInteger(context, context.req.param("user_id"), "path", "user_id");
    if (userId === null) return context.res;
    const user = findUser(database, userId);
    if (!user) return publicError(context, 404, "User not found");
    return context.html(renderUserEditPage({
      user: toResponse(user),
      notice: context.req.query("notice") ?? "",
      error: context.req.query("error") ?? "",
    }));
  });

  router.post("/users", async (context) => {
    if (!isAdmin(context.req.raw, getToken)) return publicError(context, 401, "Admin token required");
    const form = await readFormFields(context, ["name", "email", "password"]);
    if (!form) return context.res;
    const name = clean(form.name);
    const email = clean(form.email);
    if (!name || !email || !form.password) {
      return context.redirect("/admin/?error=Name%2C+email+and+password+are+required", 303);
    }
    if (emailTaken(database, email)) {
      return context.redirect("/admin/?error=That+email+is+already+registered", 303);
    }
    database.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
      .run(name, email, hashPassword(form.password));
    return context.redirect("/admin/?notice=User+created", 303);
  });

  router.post("/users/:user_id", async (context) => {
    if (!isAdmin(context.req.raw, getToken)) return publicError(context, 401, "Admin token required");
    const userId = parseInteger(context, context.req.param("user_id"), "path", "user_id");
    if (userId === null) return context.res;
    const form = await readFormFields(context, ["name", "email"], { password: "" });
    if (!form) return context.res;
    const user = findUser(database, userId);
    if (!user) return publicError(context, 404, "User not found");
    const name = clean(form.name);
    const email = clean(form.email);
    if (!name || !email) {
      return context.redirect(`/admin/users/${userId}?error=Name+and+email+are+required`, 303);
    }
    if (emailTaken(database, email, userId)) {
      return context.redirect(`/admin/users/${userId}?error=That+email+is+already+registered`, 303);
    }
    if (form.password) {
      database.prepare("UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?")
        .run(name, email, hashPassword(form.password), userId);
    } else {
      database.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, userId);
    }
    return context.redirect(`/admin/users/${userId}?notice=User+updated`, 303);
  });

  router.post("/users/:user_id/delete", (context) => {
    if (!isAdmin(context.req.raw, getToken)) return publicError(context, 401, "Admin token required");
    const userId = parseInteger(context, context.req.param("user_id"), "path", "user_id");
    if (userId === null) return context.res;
    if (!findUser(database, userId)) return publicError(context, 404, "User not found");
    database.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return context.redirect("/admin/?notice=User+deleted", 303);
  });

  router.route("/api", api);
  return router;
}
