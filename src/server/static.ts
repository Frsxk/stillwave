import { Elysia, file } from "elysia";
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize, posix, resolve } from "node:path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

export function createStaticPlugin(distDir: string) {
  const root = resolve(distDir);

  return new Elysia({ name: "stillwave-static" }).get(
    "/*",
    ({ path, set, status }) => {
      // Never shadow API routes — they are registered before this wildcard.
      if (path === "/api" || path.startsWith("/api/")) {
        return status(404, { error: "Not found" });
      }

      const cleanPath = path === "/" ? "/index.html" : path;
      const decoded = decodeURIComponent(cleanPath.split("?")[0]);
      const normalized = normalize(posix.join("/", decoded));

      // posix normalized uses forward slashes; map to OS path under root.
      const target = join(root, normalized);

      // Path-traversal guard: resolved target must remain within dist root.
      if (!target.startsWith(root + "/") && target !== root) {
        return status(403, { error: "Forbidden" });
      }

      if (!existsSync(target) || !statSync(target).isFile()) {
        // SPA fallback to index.html for client-side routing, except assets.
        const ext = extname(cleanPath);
        if (ext === "" || ext === ".html") {
          const index = join(root, "index.html");
          if (existsSync(index)) {
            set.headers["content-type"] = "text/html; charset=utf-8";
            return file(index);
          }
        }
        return status(404, { error: "Not found" });
      }

      const ext = extname(target).toLowerCase();
      const mime = MIME[ext];
      if (mime) set.headers["content-type"] = mime;

      return file(target);
    },
    { detail: { hide: true } },
  );
}
