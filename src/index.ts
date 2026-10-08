export { createApp } from "./server/app";

import { createApp } from "./server/app";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";

if (import.meta.main) {
  const app = createApp();
  const server = app.listen({ port: PORT, hostname: HOST });

  const url = `http://${HOST}:${PORT}/`;
  console.log(`Stillwave listening on ${url}`);
  console.log(`OpenAPI docs at ${url}api/docs`);

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down…`);
    server.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
