export const channelIds = [
  "rain",
  "waves",
  "wind",
  "fire",
  "birds",
  "pads",
] as const;
export type ChannelId = (typeof channelIds)[number];
export type Mix = Record<ChannelId, number>;
export type LandscapeId = "coast" | "forest" | "night" | "cabin";
export interface Scene {
  id: string;
  name: string;
  description: string;
  landscape: LandscapeId;
  mix: Mix;
  builtIn: boolean;
}
export interface FocusSession {
  id: string;
  sceneName: string;
  plannedSeconds: number;
  elapsedSeconds: number;
  startedAt: string;
  endedAt: string | null;
  status: "active" | "completed" | "cancelled";
}
export interface SessionStats {
  completedSessions: number;
  focusSeconds: number;
  todaySeconds: number;
}
export const presets: Scene[] = [
  {
    id: "golden-hour",
    name: "Golden hour",
    description: "A little closer to nowhere.",
    landscape: "coast",
    mix: { rain: 0, waves: 65, wind: 25, fire: 0, birds: 15, pads: 30 },
    builtIn: true,
  },
  {
    id: "forest-after-rain",
    name: "Forest after rain",
    description: "Breathe in. Let the world soften.",
    landscape: "forest",
    mix: { rain: 55, waves: 0, wind: 30, fire: 0, birds: 50, pads: 15 },
    builtIn: true,
  },
  {
    id: "midnight-orbit",
    name: "Midnight orbit",
    description: "Somewhere between here and the stars.",
    landscape: "night",
    mix: { rain: 0, waves: 15, wind: 20, fire: 0, birds: 0, pads: 65 },
    builtIn: true,
  },
  {
    id: "fireside",
    name: "Fireside",
    description: "Nothing to do. Nowhere to be.",
    landscape: "cabin",
    mix: { rain: 40, waves: 0, wind: 15, fire: 65, birds: 0, pads: 20 },
    builtIn: true,
  },
];
