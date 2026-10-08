import { Elysia, t } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { StillwaveDB } from "./db";
import { SceneService } from "./scenes/service";
import { createSceneController } from "./scenes/controller";
import { SessionService } from "./sessions/service";
import { createSessionController } from "./sessions/controller";
import { createOriginGuard } from "./cors";
import { createStaticPlugin } from "./static";
import { ApiError, ErrorResponse } from "./models";
import { resolve } from "node:path";

const DEFAULT_DB_PATH = "data/stillwave.sqlite";

export function createApp(dbPath?: string) {
  const resolvedDbPath = dbPath ?? process.env.DB_PATH ?? DEFAULT_DB_PATH;
  const distDir = resolve(process.cwd(), "dist");
  const db = new StillwaveDB(resolvedDbPath);
  const scenes = new SceneService(db);
  const sessions = new SessionService(db);

  const app = new Elysia()
    .decorate("studio", { db, scenes, sessions })
    .use(createOriginGuard())
    .use(
      openapi({
        path: "/api/docs",
        documentation: {
          info: {
            title: "Stillwave API",
            version: "1.0.0",
            description: "Local-first soundscape & focus studio API.",
          },
          tags: [
            { name: "scenes", description: "Soundscape scenes" },
            { name: "sessions", description: "Focus sessions" },
            { name: "health", description: "Service health" },
          ],
        },
      }),
    )
    .model({ error: ErrorResponse })
    // Global error handler: safe messages, no stack leaks.
    .onError(({ code, error, status }) => {
      if (error instanceof ApiError) {
        return status(error.code, { error: error.message });
      }
      if (code === "VALIDATION") {
        return status(422, { error: "Request validation failed." });
      }
      if (code === "NOT_FOUND") {
        // Unknown /api route → JSON 404; static fallback handles SPA below.
        return status(404, { error: "Not found" });
      }
      // Never leak internal error details or stack traces.
      return status(500, { error: "Internal server error." });
    })
    .get(
      "/api/health",
      () => ({ status: "ok", time: new Date().toISOString() }),
      {
        response: {
          200: t.Object({ status: t.String(), time: t.String() }),
        },
        detail: { tags: ["health"], summary: "Service health check" },
      },
    )
    .use(createSceneController(scenes))
    .use(createSessionController(sessions))
    // Static serving registered LAST so it never masks /api routes.
    .use(createStaticPlugin(distDir));

  return app;
}
