import { Elysia } from "elysia";

const MUTATION_METHODS: Record<string, true> = {
  POST: true,
  PUT: true,
  PATCH: true,
  DELETE: true,
};
export function createOriginGuard() {
  // A matching Origin is not sufficient: DNS rebinding can forge both hostnames.
  const allowedHosts: Record<string, true> = {
    localhost: true,
    "127.0.0.1": true,
    "[::1]": true,
  };
  if (process.env.HOST) allowedHosts[process.env.HOST.toLowerCase()] = true;

  return new Elysia({ name: "stillwave-origin-guard" })
    .onRequest(({ request, status }) => {
      if (!Object.hasOwn(allowedHosts, new URL(request.url).hostname)) {
        return status(403, { error: "Untrusted request hostname." });
      }
    })
    .as("global")
    .onBeforeHandle({ as: "scoped" }, ({ request, set, status }) => {
      if (!MUTATION_METHODS[request.method]) return;
      const origin = request.headers.get("origin");
      if (!origin) return;

      const url = new URL(request.url);
      if (origin === `${url.protocol}//${url.host}`) return;

      set.headers["vary"] = "Origin";
      return status(403, { error: "Cross-origin requests are not permitted." });
    });
}
