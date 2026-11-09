import { getRequestListener } from "@hono/node-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";

type MiddlewareNext = (error?: unknown) => void;
type RequestListener = ReturnType<typeof getRequestListener>;

function viteInternalRequest(request: IncomingMessage): boolean {
  const path = request.url?.split("?", 1)[0] ?? "/";
  return path.startsWith("/@") || path.startsWith("/node_modules/");
}

export function honoDevPlugin(): Plugin {
  return {
    name: "hono-vite-runtime",
    configureServer(server: ViteDevServer) {
      let listener: RequestListener | undefined;
      let loading: Promise<RequestListener> | undefined;

      const getListener = (): Promise<RequestListener> => {
        if (!loading) {
          loading = server.ssrLoadModule("/src/lib/app.ts").then(({ createApp }) => {
            const app = createApp();
            listener = getRequestListener(app.fetch);
            return listener;
          }).catch((error: unknown) => {
            loading = undefined;
            throw error;
          });
        }
        return loading;
      };

      server.watcher.on("change", (filePath) => {
        if (filePath.replaceAll("\\", "/").includes("/src/")) {
          listener = undefined;
          loading = undefined;
        }
      });

      server.middlewares.use((request, response, next) => {
        if (viteInternalRequest(request)) {
          next();
          return;
        }
        void getListener()
          .then((handler) => handler(request as IncomingMessage, response as ServerResponse))
          .catch((error: unknown) => (next as MiddlewareNext)(error));
      });
    },
  };
}
