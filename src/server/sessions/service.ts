import type { StillwaveDB } from "../db";
import { ApiError } from "../models";
import type { CreateSession } from "../models";
import type { FocusSession } from "../../shared";

export class SessionService {
  constructor(private db: StillwaveDB) {}

  list() {
    const sessions = this.db.allSessions();
    const lastActive = this.db.lastActiveSession();
    const stats = this.db.sessionStats();
    return { sessions, lastActive, stats };
  }

  start(input: CreateSession): FocusSession {
    if (this.db.activeSessionExists()) {
      throw new ApiError(
        409,
        "A focus session is already active. Finish it before starting another.",
      );
    }

    const sceneName = input.sceneName.trim();
    if (sceneName.length === 0)
      throw new ApiError(422, "Scene name must not be empty.");

    const id = this.generateId();
    const startedAt = new Date().toISOString();
    this.db.insertSession(id, sceneName, input.plannedSeconds, startedAt);
    return this.db.sessionById(id)!;
  }

  finish(id: string, requestedStatus: "completed" | "cancelled"): FocusSession {
    const session = this.db.sessionById(id);
    if (!session) throw new ApiError(404, `Session "${id}" was not found.`);
    if (session.status !== "active") {
      throw new ApiError(
        409,
        `Session is already ${session.status} and cannot be finished again.`,
      );
    }

    const startedAtMs = new Date(session.startedAt).getTime();
    const nowMs = Date.now();
    const rawElapsed = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
    // elapsed capped at planned duration; completion requires reaching it.
    const cappedElapsed = Math.min(rawElapsed, session.plannedSeconds);

    if (
      requestedStatus === "completed" &&
      rawElapsed < session.plannedSeconds
    ) {
      throw new ApiError(
        409,
        `Session has not reached its planned duration of ${session.plannedSeconds}s (elapsed ~${rawElapsed}s). Cancel instead.`,
      );
    }

    const endedAt = new Date(nowMs).toISOString();
    const finished = this.db.finishSession(
      id,
      requestedStatus,
      cappedElapsed,
      endedAt,
    );
    return finished!;
  }

  private generateId(): string {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
