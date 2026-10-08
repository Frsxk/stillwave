import { describe, expect, test } from "bun:test";
import type { AnyElysia } from "elysia";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "../index";
import { presets } from "../shared";

function send(
  app: AnyElysia,
  path: string,
  method = "GET",
  body?: unknown,
  origin?: string,
) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}

describe("personal studio boundaries", () => {
  test("untrusted hostnames cannot read the studio or mutate it with a matching Origin", async () => {
    const app = createApp(":memory:");
    try {
      for (const path of ["/api/scenes", "/", "/api/docs"]) {
        const response = await app.handle(
          new Request(`http://rebound.example:3000${path}`),
        );
        expect(response.status).toBe(403);
      }
      const response = await app.handle(
        new Request("http://rebound.example:3000/api/scenes", {
          method: "POST",
          headers: {
            Origin: "http://rebound.example:3000",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Untrusted mix",
            description: "",
            landscape: "coast",
            mix: presets[0]!.mix,
          }),
        }),
      );
      expect(response.status).toBe(403);
      const scenes = await (await send(app, "/api/scenes")).json();
      expect(
        scenes.some(
          (scene: { name: string }) => scene.name === "Untrusted mix",
        ),
      ).toBe(false);
    } finally {
      app.decorator.studio.db.close();
    }
  });

  test("a first launch creates nested storage and scenes survive reopening the database", async () => {
    mkdirSync("data", { recursive: true });
    const directory = mkdtempSync(join(process.cwd(), "data", "regression-"));
    const path = join(directory, "new", "studio.sqlite");
    const first = createApp(path);
    try {
      const saved = await send(first, "/api/scenes", "POST", {
        name: "A persistent quiet",
        description: "Still here tomorrow",
        landscape: "night",
        mix: presets[2]!.mix,
      });
      const scene = await saved.json();
      first.decorator.studio.db.close();
      const reopened = createApp(path);
      try {
        const scenes = await (await send(reopened, "/api/scenes")).json();
        expect(
          scenes.find((item: { id: string }) => item.id === scene.id),
        ).toEqual(scene);
      } finally {
        reopened.decorator.studio.db.close();
      }
    } finally {
      first.decorator.studio.db.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("saved mixes round-trip exact channel values and built-in scenes remain immutable", async () => {
    const app = createApp(":memory:");
    const mix = { rain: 5, waves: 15, wind: 25, fire: 35, birds: 45, pads: 55 };
    const saved = await send(app, "/api/scenes", "POST", {
      name: "My still morning",
      description: "A personal place",
      landscape: "forest",
      mix,
    });
    expect(saved.status).toBe(201);
    const scene = await saved.json();
    const all = await (await send(app, "/api/scenes")).json();
    expect(
      all.find((item: { id: string }) => item.id === scene.id).mix,
    ).toEqual(mix);
    expect(
      (await send(app, `/api/scenes/${presets[0]!.id}`, "DELETE")).status,
    ).toBe(403);
    expect((await send(app, `/api/scenes/${scene.id}`, "DELETE")).status).toBe(
      204,
    );
    expect((await send(app, `/api/scenes/${scene.id}`, "DELETE")).status).toBe(
      404,
    );
  });

  test("invalid levels and cross-origin requests cannot mutate scenes", async () => {
    const app = createApp(":memory:");
    const body = {
      name: "Out of bounds",
      description: "",
      landscape: "coast",
      mix: { ...presets[0]!.mix, rain: 101 },
    };
    expect((await send(app, "/api/scenes", "POST", body)).status).toBe(422);
    expect(
      (
        await send(
          app,
          "/api/scenes",
          "POST",
          { ...body, mix: presets[0]!.mix },
          "https://untrusted.example",
        )
      ).status,
    ).toBe(403);
    expect((await (await send(app, "/api/scenes")).json()).length).toBe(
      presets.length,
    );
  });

  test("focus cannot finish prematurely, overlap, or change after cancellation", async () => {
    const app = createApp(":memory:");
    const start = await send(app, "/api/sessions", "POST", {
      sceneName: "Golden hour",
      plannedSeconds: 60,
    });
    expect(start.status).toBe(201);
    const session = await start.json();
    expect(
      (
        await send(app, "/api/sessions", "POST", {
          sceneName: "Fireside",
          plannedSeconds: 60,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await send(app, `/api/sessions/${session.id}/finish`, "POST", {
          status: "completed",
        })
      ).status,
    ).toBe(409);
    const cancelled = await send(
      app,
      `/api/sessions/${session.id}/finish`,
      "POST",
      { status: "cancelled" },
    );
    expect(cancelled.status).toBe(200);
    expect((await cancelled.json()).status).toBe("cancelled");
    expect(
      (
        await send(app, `/api/sessions/${session.id}/finish`, "POST", {
          status: "completed",
        })
      ).status,
    ).toBe(409);
    const history = await (await send(app, "/api/sessions")).json();
    expect(history.stats).toEqual({
      completedSessions: 0,
      focusSeconds: 0,
      todaySeconds: 0,
    });
    expect(history.sessions[0].status).toBe("cancelled");
    expect(
      (
        await send(app, "/api/sessions", "POST", {
          sceneName: "A new moment",
          plannedSeconds: 1,
        })
      ).status,
    ).toBe(201);
  });
});
