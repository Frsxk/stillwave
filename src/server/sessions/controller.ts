import { Elysia, t } from "elysia";
import type { SessionService } from "./service";
import {
  CreateSessionModel,
  FinishSessionModel,
  SessionModel,
  SessionListResponse,
  ErrorResponse,
} from "../models";

export function createSessionController(service: SessionService) {
  return new Elysia({ prefix: "/api/sessions", name: "sessions" })
    .model({
      "session.create": CreateSessionModel,
      "session.finish": FinishSessionModel,
      session: SessionModel,
      "session.list": SessionListResponse,
    })
    .get("/", () => service.list(), {
      response: { 200: "session.list" },
      detail: {
        tags: ["sessions"],
        summary: "List sessions, last active, and stats",
      },
    })
    .post("/", ({ body, status }) => status(201, service.start(body)), {
      body: "session.create",
      response: { 201: "session", 409: ErrorResponse, 422: ErrorResponse },
      detail: { tags: ["sessions"], summary: "Start a focus session" },
    })
    .post(
      "/:id/finish",
      ({ params: { id }, body, status }) =>
        status(200, service.finish(id, body.status)),
      {
        params: t.Object({ id: t.String() }),
        body: "session.finish",
        response: { 200: "session", 404: ErrorResponse, 409: ErrorResponse },
        detail: {
          tags: ["sessions"],
          summary: "Finish a focus session (completed or cancelled)",
        },
      },
    );
}
