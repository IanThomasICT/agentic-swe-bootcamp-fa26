import { serve } from "@hono/node-server";
import { createApp } from "./lib/app";

const port = Number(process.env.PORT ?? 8000);
const hostname = process.env.HOST ?? "127.0.0.1";
const server = serve({ fetch: createApp().fetch, port, hostname }, (address) => {
  process.stdout.write(`Listening on http://${hostname}:${address.port}\n`);
});

process.once("SIGINT", () => server.close());
process.once("SIGTERM", () => server.close());
