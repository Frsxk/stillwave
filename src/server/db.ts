import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { presets } from "../shared";
import type {
  Scene,
  Mix,
  LandscapeId,
  FocusSession,
  SessionStats,
} from "../shared";

export interface SceneRow {
  id: string;
  name: string;
  description: string;
  landscape: string;
  mix: string;
  built_in: number;
}

export interface SessionRow {
  id: string;
  scene_name: string;
  planned_seconds: number;
  elapsed_seconds: number;
  started_at: string;
  ended_at: string | null;
  status: string;
  is_last_active: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  landscape TEXT NOT NULL,
  mix TEXT NOT NULL,
  built_in INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  scene_name TEXT NOT NULL,
  planned_seconds INTEGER NOT NULL,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_last_active INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
`;

export class StillwaveDB {
  readonly db: Database;

  constructor(dbPath: string) {
    if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec(SCHEMA);
    this.seedPresets();
  }

  private seedPresets(): void {
    if (this.db.query("SELECT id FROM scenes WHERE id = ?").get("golden-hour"))
      return;
    const insert = this.db.prepare(
      "INSERT INTO scenes (id, name, description, landscape, mix, built_in) VALUES (?, ?, ?, ?, ?, 1)",
    );
    for (const scene of presets) {
      insert.run(
        scene.id,
        scene.name,
        scene.description,
        scene.landscape,
        JSON.stringify(scene.mix),
      );
    }
  }

  close(): void {
    this.db.close();
  }

  // ---- Scenes ----

  allScenes(): Scene[] {
    const rows = this.db
      .query("SELECT * FROM scenes ORDER BY built_in DESC, name ASC")
      .all() as SceneRow[];
    return rows.map((r) => this.rowToScene(r));
  }

  sceneById(id: string): Scene | null {
    const row = this.db
      .query("SELECT * FROM scenes WHERE id = ?")
      .get(id) as SceneRow | null;
    return row ? this.rowToScene(row) : null;
  }

  insertScene(scene: Scene): void {
    this.db
      .prepare(
        "INSERT INTO scenes (id, name, description, landscape, mix, built_in) VALUES (?, ?, ?, ?, ?, 0)",
      )
      .run(
        scene.id,
        scene.name,
        scene.description,
        scene.landscape,
        JSON.stringify(scene.mix),
      );
  }

  /** Returns the deleted scene, or null if not found / not deletable (built-in). */
  deleteScene(id: string): Scene | null {
    const scene = this.sceneById(id);
    if (!scene || scene.builtIn) return null;
    this.db.prepare("DELETE FROM scenes WHERE id = ? AND built_in = 0").run(id);
    return scene;
  }

  private rowToScene(row: SceneRow): Scene {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      landscape: row.landscape as LandscapeId,
      mix: JSON.parse(row.mix) as Mix,
      builtIn: row.built_in === 1,
    };
  }

  // ---- Sessions ----

  activeSessionExists(): boolean {
    return (
      this.db
        .query("SELECT 1 FROM sessions WHERE status = ? LIMIT 1")
        .get("active") !== null
    );
  }

  allSessions(): FocusSession[] {
    const rows = this.db
      .query("SELECT * FROM sessions ORDER BY started_at DESC")
      .all() as SessionRow[];
    return rows.map((r) => this.rowToSession(r));
  }

  sessionById(id: string): FocusSession | null {
    const row = this.db
      .query("SELECT * FROM sessions WHERE id = ?")
      .get(id) as SessionRow | null;
    return row ? this.rowToSession(row) : null;
  }

  lastActiveSession(): FocusSession | null {
    const row = this.db
      .query("SELECT * FROM sessions WHERE is_last_active = 1 LIMIT 1")
      .get() as SessionRow | null;
    return row ? this.rowToSession(row) : null;
  }

  insertSession(
    id: string,
    sceneName: string,
    plannedSeconds: number,
    startedAt: string,
  ): void {
    const tx = this.db.transaction(() => {
      this.db.prepare("UPDATE sessions SET is_last_active = 0").run();
      this.db
        .prepare(
          "INSERT INTO sessions (id, scene_name, planned_seconds, elapsed_seconds, started_at, status, is_last_active) VALUES (?, ?, ?, 0, ?, ?, 1)",
        )
        .run(id, sceneName, plannedSeconds, startedAt, "active");
    });
    tx();
  }

  finishSession(
    id: string,
    status: "completed" | "cancelled",
    elapsed: number,
    endedAt: string,
  ): FocusSession | null {
    const tx = this.db.transaction(() => {
      this.db.prepare("UPDATE sessions SET is_last_active = 0").run();
      this.db
        .prepare(
          "UPDATE sessions SET status = ?, elapsed_seconds = ?, ended_at = ?, is_last_active = 1 WHERE id = ?",
        )
        .run(status, elapsed, endedAt, id);
    });
    tx();
    return this.sessionById(id);
  }

  sessionStats(): SessionStats {
    const completed = this.db
      .query(
        "SELECT elapsed_seconds, started_at FROM sessions WHERE status = 'completed'",
      )
      .all() as { elapsed_seconds: number; started_at: string }[];

    const focusSeconds = completed.reduce(
      (sum, s) => sum + s.elapsed_seconds,
      0,
    );

    const now = new Date();
    const localMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const midnightMs = localMidnight.getTime();
    const todaySeconds = completed
      .filter((s) => new Date(s.started_at).getTime() >= midnightMs)
      .reduce((sum, s) => sum + s.elapsed_seconds, 0);

    return { completedSessions: completed.length, focusSeconds, todaySeconds };
  }

  private rowToSession(row: SessionRow): FocusSession {
    return {
      id: row.id,
      sceneName: row.scene_name,
      plannedSeconds: row.planned_seconds,
      elapsedSeconds: row.elapsed_seconds,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      status: row.status as FocusSession["status"],
    };
  }
}
