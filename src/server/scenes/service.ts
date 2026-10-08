import type { StillwaveDB } from "../db";
import { ApiError } from "../models";
import type { CreateScene } from "../models";
import type { Scene } from "../../shared";

export class SceneService {
  constructor(private db: StillwaveDB) {}

  list(): Scene[] {
    return this.db.allScenes();
  }

  create(input: CreateScene): Scene {
    const name = input.name.trim();
    if (name.length === 0)
      throw new ApiError(422, "Scene name must not be empty.");

    const id = this.slugify(name);
    if (this.db.sceneById(id)) {
      throw new ApiError(409, `A scene named "${name}" already exists.`);
    }

    const scene: Scene = {
      id,
      name,
      description: input.description.trim(),
      landscape: input.landscape,
      mix: input.mix,
      builtIn: false,
    };
    this.db.insertScene(scene);
    return this.db.sceneById(id) ?? scene;
  }

  remove(id: string): void {
    const scene = this.db.sceneById(id);
    if (!scene) throw new ApiError(404, `Scene "${id}" was not found.`);
    if (scene.builtIn)
      throw new ApiError(403, "Built-in scenes cannot be deleted.");
    this.db.deleteScene(id);
  }

  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (base.length === 0) {
      return `scene-${Date.now().toString(36)}`;
    }
    // guard against collisions with built-in ids by suffixing only when needed
    return base;
  }
}
