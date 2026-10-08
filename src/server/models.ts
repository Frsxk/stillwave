import { t } from "elysia";
import { channelIds } from "../shared";
import type { LandscapeId } from "../shared";

export const landscapeIds = [
  "coast",
  "forest",
  "night",
  "cabin",
] as const satisfies readonly LandscapeId[];

export const MixModel = t.Object({
  rain: t.Number({ minimum: 0, maximum: 100 }),
  waves: t.Number({ minimum: 0, maximum: 100 }),
  wind: t.Number({ minimum: 0, maximum: 100 }),
  fire: t.Number({ minimum: 0, maximum: 100 }),
  birds: t.Number({ minimum: 0, maximum: 100 }),
  pads: t.Number({ minimum: 0, maximum: 100 }),
});

export const LandscapeModel = t.UnionEnum(landscapeIds, {
  description: "Landscape identifier",
});

export const SceneModel = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.String(),
  landscape: LandscapeModel,
  mix: MixModel,
  builtIn: t.Boolean(),
});

export const CreateSceneModel = t.Object({
  name: t.String({ minLength: 1, maxLength: 60 }),
  description: t.String({ maxLength: 160 }),
  landscape: LandscapeModel,
  mix: MixModel,
});

export const SceneListResponse = t.Object({
  scenes: t.Array(SceneModel),
});

export const CreateSessionModel = t.Object({
  sceneName: t.String({ minLength: 1, maxLength: 60 }),
  plannedSeconds: t.Integer({ minimum: 1, maximum: 10800 }),
});

export const SessionModel = t.Object({
  id: t.String(),
  sceneName: t.String(),
  plannedSeconds: t.Integer(),
  elapsedSeconds: t.Integer(),
  startedAt: t.String(),
  endedAt: t.Union([t.String(), t.Null()]),
  status: t.Union([
    t.Literal("active"),
    t.Literal("completed"),
    t.Literal("cancelled"),
  ]),
});

export const FinishSessionModel = t.Object({
  status: t.Union([t.Literal("completed"), t.Literal("cancelled")]),
});

export const SessionListResponse = t.Object({
  sessions: t.Array(SessionModel),
  lastActive: t.Union([SessionModel, t.Null()]),
  stats: t.Object({
    completedSessions: t.Integer(),
    focusSeconds: t.Integer(),
    todaySeconds: t.Integer(),
  }),
});

export const ErrorResponse = t.Object({ error: t.String() });

export type CreateScene = typeof CreateSceneModel.static;
export type CreateSession = typeof CreateSessionModel.static;

/** Shared domain error so services can signal HTTP semantics without leaking state. */
export class ApiError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export { channelIds };
