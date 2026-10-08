import { Elysia, t } from "elysia";
import type { SceneService } from "./service";
import { CreateSceneModel, SceneModel, ErrorResponse } from "../models";

export function createSceneController(service: SceneService) {
  return new Elysia({ prefix: "/api/scenes", name: "scenes" })
    .model({
      "scene.create": CreateSceneModel,
      scene: SceneModel,
    })
    .get("/", () => service.list(), {
      response: { 200: t.Array(SceneModel) },
      detail: {
        tags: ["scenes"],
        summary: "List all scenes (built-in presets + saved)",
      },
    })
    .post("/", ({ body, status }) => status(201, service.create(body)), {
      body: "scene.create",
      response: { 201: "scene", 409: ErrorResponse, 422: ErrorResponse },
      detail: { tags: ["scenes"], summary: "Create a user scene" },
    })
    .delete(
      "/:id",
      ({ params: { id }, set }) => {
        service.remove(id);
        set.status = 204;
      },
      {
        params: t.Object({ id: t.String() }),
        response: { 403: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["scenes"],
          summary: "Delete a user scene (built-in forbidden)",
        },
      },
    );
}
