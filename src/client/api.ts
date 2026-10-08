import type { Scene, FocusSession, SessionStats } from "../shared";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Request failed (${response.status}).`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export const api = {
  scenes: () => request<Scene[]>("/scenes"),
  save: (scene: Omit<Scene, "id" | "builtIn">) =>
    request<Scene>("/scenes", { method: "POST", body: JSON.stringify(scene) }),
  remove: (id: string) =>
    request<void>(`/scenes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  sessions: () =>
    request<{ sessions: FocusSession[]; stats: SessionStats }>("/sessions"),
  start: (sceneName: string, plannedSeconds: number) =>
    request<FocusSession>("/sessions", {
      method: "POST",
      body: JSON.stringify({ sceneName, plannedSeconds }),
    }),
  finish: (id: string, status: "completed" | "cancelled") =>
    request<FocusSession>(`/sessions/${encodeURIComponent(id)}/finish`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
};
