import { Hono } from "hono";
import { createAdminApp } from "./admin";
import type { AdminTokenGetter } from "./security";
import { getAdminToken } from "./config";
import { database as defaultDatabase } from "./database";
import { readJsonFields, parseInteger, publicError } from "./http";
import { openApiDocument, redocHtml, swaggerHtml } from "./openapi";
import { hashPassword } from "./security";
import type { PublicUser, User } from "./types";

interface AppOptions {
  database?: import("node:sqlite").DatabaseSync;
  getAdminToken?: AdminTokenGetter;
}

interface RouteDefinition {
  pattern: RegExp;
  methods: string[];
}

const routeDefinitions: RouteDefinition[] = [
  { pattern: /^\/users\/$/, methods: ["GET", "POST"] },
  { pattern: /^\/users\/[^/]+$/, methods: ["GET", "PUT", "DELETE"] },
  { pattern: /^\/admin\/$/, methods: ["GET"] },
  { pattern: /^\/admin\/login$/, methods: ["GET", "POST"] },
  { pattern: /^\/admin\/logout$/, methods: ["POST"] },
  { pattern: /^\/admin\/users$/, methods: ["POST"] },
  { pattern: /^\/admin\/users\/[^/]+$/, methods: ["GET", "POST"] },
  { pattern: /^\/admin\/users\/[^/]+\/delete$/, methods: ["POST"] },
  { pattern: /^\/admin\/api\/users$/, methods: ["GET", "POST"] },
  { pattern: /^\/admin\/api\/users\/[^/]+$/, methods: ["GET", "PUT", "DELETE"] },
  { pattern: /^\/admin\/api\/users\/[^/]+\/password$/, methods: ["POST"] },
  { pattern: /^\/openapi\.json$/, methods: ["GET"] },
  { pattern: /^\/docs$/, methods: ["GET"] },
  { pattern: /^\/docs\/oauth2-redirect$/, methods: ["GET"] },
  { pattern: /^\/redoc$/, methods: ["GET"] },
];

function findUser(database: import("node:sqlite").DatabaseSync, userId: number): User | undefined {
  return database.prepare("SELECT id, name, email, password FROM users WHERE id = ?").get(userId) as
    | User
    | undefined;
}

function toResponse(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

function oauthRedirectHtml(): string {
  return `<!doctype html>
<html lang="en-US">
<head><title>Swagger UI: OAuth2 Redirect</title></head>
<body>
<script>
  'use strict';
  function run() {
    var oauth2 = window.opener.swaggerUIRedirectOauth2;
    var sentState = oauth2.state;
    var redirectUrl = oauth2.redirectUrl;
    var qp;
    if (/code|token|error/.test(window.location.hash)) {
      qp = window.location.hash.substring(1).replace(/\\+/g, ' ');
    } else {
      qp = window.location.search.substring(1).replace(/\\+/g, ' ');
    }
    var response = {};
    qp.split('&').forEach(function (part) {
      var pieces = part.split('=');
      response[decodeURIComponent(pieces[0])] = decodeURIComponent(pieces[1] || '');
    });
    var isValid = response.state === sentState;
    if ((oauth2.auth.schema.get('flow') === 'accessCode' || oauth2.auth.schema.get('flow') === 'authorizationCode') && !oauth2.auth.code) {
      if (response.code) {
        delete oauth2.state;
        oauth2.auth.code = response.code;
        oauth2.callback({ auth: oauth2.auth, redirectUrl: redirectUrl });
      } else {
        var message = response.error ? '[' + response.error + ']: ' + (response.error_description || 'no accessCode received from the server') : undefined;
        oauth2.callback({ auth: oauth2.auth, err: message, redirectUrl: redirectUrl });
      }
    } else {
      oauth2.callback({ auth: oauth2.auth, token: response, isValid: isValid, redirectUrl: redirectUrl });
    }
    window.close();
  }
  window.onload = run;
</script>
</body>
</html>`;
}

export function createApp(options: AppOptions = {}): Hono {
  const database = options.database ?? defaultDatabase;
  const getToken = options.getAdminToken ?? getAdminToken;
  const app = new Hono();

  app.use("*", async (context, next) => {
    const path = context.req.path;
    const alternate = path.endsWith("/") ? path.slice(0, -1) : `${path}/`;
    if (routeDefinitions.some((route) => route.pattern.test(alternate))) {
      const target = new URL(context.req.url);
      target.pathname = alternate;
      return context.redirect(target.toString(), 307);
    }
    await next();
  });

  app.get("/openapi.json", (context) => context.json(openApiDocument));
  app.get("/docs", (context) => context.html(swaggerHtml));
  app.get("/docs/oauth2-redirect", (context) => context.html(oauthRedirectHtml()));
  app.get("/redoc", (context) => context.html(redocHtml));

  app.get("/users/", (context) => {
    const users = database.prepare("SELECT id, name, email FROM users").all() as unknown as PublicUser[];
    return context.json(users);
  });

  app.get("/users/:user_id", (context) => {
    const userId = parseInteger(context, context.req.param("user_id"), "path", "user_id");
    if (userId === null) return context.res;
    const user = findUser(database, userId);
    if (!user) return publicError(context, 404, "User not found");
    return context.json(toResponse(user));
  });

  app.post("/users/", async (context) => {
    const payload = await readJsonFields(context, ["name", "email", "password"]);
    if (!payload) return context.res;
    const existing = database.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(payload.email);
    if (existing) return publicError(context, 409, "Email already registered");
    const result = database
      .prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
      .run(payload.name, payload.email, hashPassword(payload.password));
    return context.json(toResponse(findUser(database, Number(result.lastInsertRowid))!), 200);
  });

  app.put("/users/:user_id", async (context) => {
    const userId = parseInteger(context, context.req.param("user_id"), "path", "user_id");
    if (userId === null) return context.res;
    const payload = await readJsonFields(context, ["name", "email"]);
    if (!payload) return context.res;
    const user = findUser(database, userId);
    if (!user) return publicError(context, 404, "User not found");
    if (payload.email !== user.email) {
      const existing = database.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(payload.email);
      if (existing) return publicError(context, 409, "Email already registered");
    }
    database.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?")
      .run(payload.name, payload.email, userId);
    return context.json({ message: "User updated successfully" });
  });

  app.delete("/users/:user_id", (context) => {
    const userId = parseInteger(context, context.req.param("user_id"), "path", "user_id");
    if (userId === null) return context.res;
    if (!findUser(database, userId)) return publicError(context, 404, "User not found");
    database.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return context.json({ message: "User deleted successfully" });
  });

  app.route("/admin/", createAdminApp(database, getToken));

  app.all("*", (context) => {
    const route = routeDefinitions.find((entry) => entry.pattern.test(context.req.path));
    if (route) {
      context.header("Allow", route.methods.join(", "));
      return context.json({ detail: "Method Not Allowed" }, 405);
    }
    return context.json({ detail: "Not Found" }, 404);
  });

  app.onError((_error, context) => context.text("Internal Server Error", 500));
  return app;
}
