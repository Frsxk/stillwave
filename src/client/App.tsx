import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  Waves,
  ArrowUpRight,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CloudRain,
  Wind,
  Flame,
  Bird,
  AudioLines,
  Bookmark,
  Check,
  X,
  Maximize2,
  Minimize2,
  Shuffle,
  Timer,
  Headphones,
  Sun,
  Plus,
  Trash2,
  Clock3,
  Command,
  Leaf,
} from "lucide-react";
import {
  presets,
  channelIds,
  type Scene,
  type Mix,
  type ChannelId,
  type FocusSession,
  type SessionStats,
} from "../shared";
import Landscape from "./Landscape";
import { SoundEngine } from "./audio";
import { api } from "./api";

type View = "studio" | "collection" | "activity";
type Dialog = "save" | "focus" | "shortcuts" | "delete" | null;
const channels: {
  id: ChannelId;
  name: string;
  note: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}[] = [
  { id: "waves", name: "Ocean", note: "A gentle ebb & flow", icon: Waves },
  { id: "rain", name: "Rain", note: "A soft, steady rhythm", icon: CloudRain },
  { id: "wind", name: "Wind", note: "Room to breathe", icon: Wind },
  { id: "birds", name: "Birdsong", note: "Little signs of life", icon: Bird },
  { id: "fire", name: "Fireplace", note: "Warmth in the quiet", icon: Flame },
  {
    id: "pads",
    name: "Drift",
    note: "A slow ambient embrace",
    icon: AudioLines,
  },
];
const landscapeLabel = {
  coast: "THE PACIFIC COAST",
  forest: "THE EVERGREEN TRAIL",
  night: "BEYOND THE HORIZON",
  cabin: "A CABIN IN THE WOODS",
};
const coordinates = {
  coast: "36° 16′ N · 121° 48′ W",
  forest: "47° 48′ N · 123° 36′ W",
  night: "LOOK UP. YOU’RE ALREADY HERE.",
  cabin: "45° 31′ N · 122° 40′ W",
};
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
const minutes = (seconds: number) => `${Math.floor(seconds / 60)} min`;
function readPreference(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function storePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Storage may be unavailable in private browsers. */
  }
}

export default function App() {
  const [view, setView] = useState<View>("studio");
  const [scenes, setScenes] = useState<Scene[]>(presets);
  const [scene, setScene] = useState<Scene>(presets[0]!);
  const [mix, setMix] = useState<Mix>({ ...presets[0]!.mix });
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(() =>
    Math.min(
      100,
      Math.max(0, Number(readPreference("stillwave-volume", "65")) || 0),
    ),
  );
  const [immersive, setImmersive] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(25);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState<FocusSession | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    completedSessions: 0,
    focusSeconds: 0,
    todaySeconds: 0,
  });
  const [now, setNow] = useState(Date.now());
  const [deleteScene, setDeleteScene] = useState<Scene | null>(null);
  const engine = useRef<SoundEngine | null>(null);
  const playbackAction = useRef(0);
  const wantsPlayback = useRef(false);
  const finishing = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toggleRef = useRef<() => void>(() => {});
  const remaining = session
    ? Math.max(
        0,
        session.plannedSeconds -
          Math.floor((now - Date.parse(session.startedAt)) / 1000),
      )
    : duration * 60;
  const customized = channelIds.some((id) => mix[id] !== scene.mix[id]);
  const savedScenes = scenes.filter((item) => !item.builtIn);

  const refreshSessions = useCallback(async () => {
    const data = await api.sessions();
    setSessions(data.sessions);
    setStats(data.stats);
    setSession(data.sessions.find((item) => item.status === "active") || null);
  }, []);
  useEffect(() => {
    let live = true;
    api
      .scenes()
      .then((items) => {
        if (!live) return;
        setScenes(items);
        const initial =
          items.find(
            (item) =>
              item.id === readPreference("stillwave-scene", "golden-hour"),
          ) || items[0]!;
        setScene(initial);
        setMix({ ...initial.mix });
      })
      .catch((err) => live && setError(err.message));
    refreshSessions().catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [refreshSessions]);
  useEffect(() => {
    engine.current?.setMix(mix);
  }, [mix]);
  useEffect(() => {
    engine.current?.setMaster(volume);
    storePreference("stillwave-volume", String(volume));
  }, [volume]);
  useEffect(
    () => () => {
      engine.current?.dispose();
      engine.current = null;
    },
    [],
  );
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const el = dialogRef.current;
    if (dialog && el && !el.open) el.showModal();
    else if (!dialog && el?.open) el.close();
  }, [dialog]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    if (dialog || immersive) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [dialog, immersive]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "Escape") {
        setDialog(null);
        setImmersive(false);
        return;
      }
      if (
        target.closest("input, textarea, select") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (dialog) return;
      if (event.code === "Space") {
        if (target.closest("button")) return;
        event.preventDefault();
        toggleRef.current();
      }
      if (event.key.toLowerCase() === "f") setImmersive((value) => !value);
      if (event.key === "?") setDialog("shortcuts");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);
  useEffect(() => {
    if (!session || remaining > 0 || finishing.current) return;
    finishing.current = true;
    api
      .finish(session.id, "completed")
      .then(async () => {
        setSession(null);
        setNotice("A little more present. Focus session complete.");
        await refreshSessions();
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        finishing.current = false;
      });
  }, [session, remaining, refreshSessions]);

  async function togglePlayback() {
    const action = ++playbackAction.current;
    wantsPlayback.current = !wantsPlayback.current;
    if (!wantsPlayback.current) {
      engine.current?.pause();
      setPlaying(false);
      return;
    }
    try {
      engine.current ??= new SoundEngine();
      engine.current.setMix(mix);
      engine.current.setMaster(volume);
      await engine.current.play();
      if (action === playbackAction.current && wantsPlayback.current)
        setPlaying(true);
      else if (!wantsPlayback.current) engine.current.pause();
    } catch (err) {
      wantsPlayback.current = false;
      setPlaying(false);
      setError(
        err instanceof Error
          ? err.message
          : "Your browser could not start audio.",
      );
    }
  }
  toggleRef.current = () => {
    void togglePlayback();
  };
  function selectScene(item: Scene) {
    setScene(item);
    setMix({ ...item.mix });
    setView("studio");
    storePreference("stillwave-scene", item.id);
  }
  function shuffleScene() {
    const others = presets.filter((item) => item.id !== scene.id);
    selectScene(others[Math.floor(Math.random() * others.length)]!);
  }
  async function saveScene(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const saved = await api.save({
        name: name.trim(),
        description: description.trim() || "Your own little corner of quiet.",
        landscape: scene.landscape,
        mix,
      });
      setScenes((items) => [...items, saved]);
      setScene(saved);
      storePreference("stillwave-scene", saved.id);
      setDialog(null);
      setNotice("Your quiet, kept. Mix saved to your collection.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function startFocus() {
    if (!Number.isFinite(duration) || duration < 1 || duration > 180) return;
    setBusy(true);
    try {
      const started = await api.start(scene.name, Math.round(duration * 60));
      setSession(started);
      setNow(Date.now());
      setDialog(null);
      setSessions((items) => [started, ...items]);
      if (!playing) await togglePlayback();
      setNotice("One thing at a time. Your focus session has begun.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function endFocus() {
    if (!session) return;
    setBusy(true);
    try {
      await api.finish(session.id, "cancelled");
      setDialog(null);
      await refreshSessions();
      setNotice("Session ended. There’s always another moment.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function removeScene() {
    if (!deleteScene) return;
    setBusy(true);
    try {
      await api.remove(deleteScene.id);
      setScenes((items) => items.filter((item) => item.id !== deleteScene.id));
      if (scene.id === deleteScene.id) selectScene(presets[0]!);
      setDialog(null);
      setDeleteScene(null);
      setNotice("Mix removed from your collection.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const artwork = (
    <Landscape
      landscape={scene.landscape}
      playing={playing}
      className="main-landscape"
    />
  );
  const transport = (
    <div className="transport">
      <button
        className="play-button"
        onClick={() => void togglePlayback()}
        aria-label={playing ? "Pause soundscape" : "Play soundscape"}
      >
        {playing ? (
          <Pause size={21} fill="currentColor" />
        ) : (
          <Play size={21} fill="currentColor" />
        )}
      </button>
      <div className="play-status">
        <strong>
          {playing ? "Stay a little while" : "Let the world slow down"}
        </strong>
        <span>
          {playing ? (
            <>
              <span className="equalizer">
                <i />
                <i />
                <i />
                <i />
              </span>{" "}
              NOW PLAYING · {scene.name}
            </>
          ) : (
            "PRESS PLAY. FIND YOUR QUIET."
          )}
        </span>
      </div>
      <div className="master-volume">
        <button
          className="icon-button"
          aria-label={volume ? "Mute audio" : "Unmute audio"}
          onClick={() => setVolume(volume ? 0 : 65)}
        >
          {volume ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <input
          aria-label="Master volume"
          type="range"
          min="0"
          max="100"
          value={volume}
          style={{ "--level": `${volume}%` } as React.CSSProperties}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
      </div>
      <div className="transport-divider" />
      <button
        className={`focus-button ${session ? "is-active" : ""}`}
        aria-label={session ? "Open active focus session" : "Find your focus"}
        onClick={() => setDialog("focus")}
      >
        <Timer size={17} />
        <span>{session ? formatTime(remaining) : "Find your focus"}</span>
        {!session && <ArrowUpRight size={15} />}
      </button>
    </div>
  );

  return (
    <div className={`app ${immersive ? "is-immersive" : ""}`}>
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setView("studio");
          }}
          aria-label="Stillwave home"
        >
          <Waves size={30} strokeWidth={1.6} />
          <span>
            stillwave<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {(["studio", "collection", "activity"] as View[]).map((item) => (
            <button
              key={item}
              className={view === item ? "nav-item active" : "nav-item"}
              onClick={() => setView(item)}
            >
              {item === "studio"
                ? "The studio"
                : item === "collection"
                  ? "Your collection"
                  : "Your moments"}
              {item === "collection" && savedScenes.length > 0 && (
                <span className="nav-count">{savedScenes.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="header-note">
          <span className="status-dot" /> A quieter kind of internet
        </div>
      </header>
      <main>
        <section className="page-intro">
          <div>
            <div className="eyebrow">
              <span className="short-line" /> A LITTLE SPACE FOR YOURSELF
            </div>
            <h1>
              {view === "studio" ? (
                <>
                  Less noise. <em>More here.</em>
                </>
              ) : view === "collection" ? (
                <>
                  Your quiet, <em>collected.</em>
                </>
              ) : (
                <>
                  Small moments. <em>Real presence.</em>
                </>
              )}
            </h1>
            <p>
              {view === "studio"
                ? "Somewhere to drift. Something to return to. Make this moment yours."
                : view === "collection"
                  ? "Familiar places, made your way. All your saved soundscapes live here."
                  : "Not a productivity score. Just a little time you made for yourself."}
            </p>
          </div>
          <div className="intro-aside">
            <Sun size={24} strokeWidth={1.2} />
            <span>
              No rush.
              <br />
              You’re right on time.
            </span>
          </div>
        </section>
        {view === "studio" ? (
          <>
            <div className="studio-grid">
              <section className="scene-player" aria-label="Soundscape player">
                <div className="artwork">
                  {artwork}
                  <div className="artwork-top">
                    <span>
                      <span
                        className={`status-dot ${playing ? "pulsing" : ""}`}
                      />{" "}
                      {landscapeLabel[scene.landscape]}
                    </span>
                    <button
                      className="artwork-button"
                      onClick={() => setImmersive(true)}
                      aria-label="Enter immersive mode"
                    >
                      <Maximize2 size={17} />
                    </button>
                  </div>
                  <div className="artwork-caption">
                    <span className="coordinates">
                      {coordinates[scene.landscape]}
                    </span>
                    <h2>
                      {scene.name}
                      <span>.</span>
                    </h2>
                    <p>{scene.description}</p>
                  </div>
                  <div className="artwork-tag">
                    <span className="tiny-star">✳</span> A PLACE, NOT A PLAYLIST
                  </div>
                </div>
                {transport}
              </section>
              <aside className="mixer">
                <div className="mixer-heading">
                  <div>
                    <span className="eyebrow">MAKE IT YOURS</span>
                    <h2>
                      Your atmosphere<span>.</span>
                    </h2>
                  </div>
                  <AudioLines size={22} strokeWidth={1.4} />
                </div>
                <p className="mixer-description">
                  A little of this. A little of that.
                </p>
                <div className="channels">
                  {channels.map(
                    ({ id, name: channelName, note, icon: Icon }) => (
                      <div
                        className={`channel ${mix[id] ? "audible" : ""}`}
                        key={id}
                      >
                        <button
                          className="channel-icon"
                          aria-label={`${mix[id] ? "Mute" : "Enable"} ${channelName}`}
                          onClick={() =>
                            setMix((current) => ({
                              ...current,
                              [id]: current[id] ? 0 : 45,
                            }))
                          }
                        >
                          <Icon size={20} strokeWidth={1.5} />
                        </button>
                        <div className="channel-control">
                          <div className="channel-label">
                            <label htmlFor={`channel-${id}`}>
                              {channelName}
                            </label>
                            <span>
                              {mix[id]}
                              <small>%</small>
                            </span>
                          </div>
                          <input
                            id={`channel-${id}`}
                            aria-label={`${channelName} level`}
                            type="range"
                            min="0"
                            max="100"
                            value={mix[id]}
                            style={
                              {
                                "--level": `${mix[id]}%`,
                              } as React.CSSProperties
                            }
                            onChange={(event) =>
                              setMix((current) => ({
                                ...current,
                                [id]: Number(event.target.value),
                              }))
                            }
                          />
                          <span className="channel-note">{note}</span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
                <div className="mixer-bottom">
                  <button
                    className="reset-button"
                    disabled={!customized}
                    onClick={() => setMix({ ...scene.mix })}
                  >
                    Reset mix
                  </button>
                  <button
                    className="save-button"
                    onClick={() => {
                      setName(`${scene.name} remix`);
                      setDescription("");
                      setDialog("save");
                    }}
                  >
                    <Bookmark size={15} /> Save your mix
                    <Plus size={14} />
                  </button>
                </div>
              </aside>
            </div>
            <section className="discover">
              <div className="section-header">
                <div>
                  <span className="eyebrow">A CHANGE OF SCENERY</span>
                  <h2>
                    Find your <em>somewhere.</em>
                  </h2>
                </div>
                <button className="text-button" onClick={shuffleScene}>
                  <Shuffle size={15} /> Take me somewhere
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="scene-cards">
                {presets.map((item, index) => (
                  <button
                    className={`scene-card ${scene.id === item.id ? "selected" : ""}`}
                    key={item.id}
                    onClick={() => selectScene(item)}
                  >
                    <div className="card-art">
                      <Landscape
                        landscape={item.landscape}
                        miniature
                        playing={false}
                      />
                      <span className="card-number">0{index + 1}</span>
                      <span className="card-action">
                        {scene.id === item.id ? (
                          <Check size={17} />
                        ) : (
                          <ArrowUpRight size={17} />
                        )}
                      </span>
                    </div>
                    <div className="card-content">
                      <div>
                        <h3>{item.name}</h3>
                        <p>
                          {item.landscape === "coast"
                            ? "Salt air. Soft light. Open space."
                            : item.landscape === "forest"
                              ? "Fresh rain. Green paths. New beginnings."
                              : item.landscape === "night"
                                ? "Deep space. Slow thoughts. Stillness."
                                : "Warm embers. A world tucked away."}
                        </p>
                      </div>
                      <span className="scene-type">
                        {item.landscape === "coast"
                          ? "UNWIND"
                          : item.landscape === "forest"
                            ? "RESET"
                            : item.landscape === "night"
                              ? "DRIFT"
                              : "SETTLE"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : view === "collection" ? (
          <section className="collection-view">
            {savedScenes.length ? (
              <div className="saved-grid">
                {savedScenes.map((item) => (
                  <article className="saved-card" key={item.id}>
                    <button
                      className="saved-art"
                      onClick={() => selectScene(item)}
                      aria-label={`Load ${item.name}`}
                    >
                      <Landscape landscape={item.landscape} miniature />
                      <span>
                        <Play size={20} />
                      </span>
                    </button>
                    <div className="saved-details">
                      <div>
                        <h2>{item.name}</h2>
                        <p>{item.description}</p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => {
                          setDeleteScene(item);
                          setDialog("delete");
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => selectScene(item)}
                    >
                      Step into this scene
                      <ArrowUpRight size={16} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Bookmark size={32} strokeWidth={1.2} />
                <h2>A quiet place, waiting for you.</h2>
                <p>
                  Shape a soundscape in the studio, then save your mix.
                  <br />A little piece of calm, ready whenever you are.
                </p>
                <button
                  className="primary-button"
                  onClick={() => setView("studio")}
                >
                  Make your first mix
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="activity-view">
            <div className="stat-grid">
              <div>
                <Leaf size={22} />
                <strong>{minutes(stats.todaySeconds)}</strong>
                <span>Present, today</span>
              </div>
              <div>
                <Headphones size={22} />
                <strong>{stats.completedSessions}</strong>
                <span>Moments completed</span>
              </div>
              <div>
                <Clock3 size={22} />
                <strong>{minutes(stats.focusSeconds)}</strong>
                <span>A little quieter, all time</span>
              </div>
            </div>
            <div className="history-header">
              <h2>Your recent moments</h2>
              <span>TIME WELL SPENT, NOT TIME MEASURED</span>
            </div>
            {sessions.length ? (
              <div className="history-list">
                {sessions.map((item) => (
                  <div className="history-row" key={item.id}>
                    <span className={`session-symbol ${item.status}`}>
                      <Leaf size={17} />
                    </span>
                    <div>
                      <strong>{item.sceneName}</strong>
                      <span>
                        {new Date(item.startedAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}{" "}
                        ·{" "}
                        {new Date(item.startedAt).toLocaleTimeString(
                          undefined,
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    </div>
                    <span>
                      {minutes(
                        item.status === "active"
                          ? Math.min(
                              item.plannedSeconds,
                              Math.max(
                                0,
                                Math.floor(
                                  (now - Date.parse(item.startedAt)) / 1000,
                                ),
                              ),
                            )
                          : item.elapsedSeconds,
                      )}
                    </span>
                    <span className={`session-pill ${item.status}`}>
                      {item.status === "active"
                        ? "In the moment"
                        : item.status === "completed"
                          ? "Completed"
                          : "Ended early"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Timer size={30} strokeWidth={1.2} />
                <h2>There’s no perfect time. Just this one.</h2>
                <p>
                  Start a focus session in the studio. Your moments will appear
                  here.
                </p>
                <button
                  className="primary-button"
                  onClick={() => {
                    setView("studio");
                    setDialog("focus");
                  }}
                >
                  Make a little space
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
        )}
        <div className="bottom-note">
          <div>
            <Headphones size={16} />
            <span>Better with headphones. Even better with nowhere to be.</span>
          </div>
          <span>GENERATED SOUND. GENUINE STILLNESS.</span>
        </div>
      </main>
      <footer>
        <span>© {new Date().getFullYear()} Stillwave</span>
        <span>
          Built for presence. Powered by{" "}
          <a href="/api/docs" target="_blank" rel="noreferrer">
            Elysia
            <ArrowUpRight size={11} />
          </a>
          .
        </span>
        <button onClick={() => setDialog("shortcuts")}>
          <Command size={13} /> A few shortcuts
        </button>
      </footer>
      {immersive && (
        <section className="immersive-scene" aria-label="Immersive soundscape">
          {artwork}
          <div className="immersive-top">
            <span className="brand">
              <Waves size={28} />
              <span>stillwave.</span>
            </span>
            <button
              className="artwork-button"
              onClick={() => setImmersive(false)}
              aria-label="Exit immersive mode"
            >
              <Minimize2 size={21} />
            </button>
          </div>
          <div className="immersive-title">
            <span className="eyebrow">JUST YOU AND THIS MOMENT</span>
            <h2>{scene.name}.</h2>
            <p>{scene.description}</p>
          </div>
          <div className="immersive-controls">
            {transport}
            <span>F TO RETURN · SPACE TO {playing ? "PAUSE" : "PLAY"}</span>
          </div>
        </section>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="error-toast" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <dialog
        ref={dialogRef}
        onCancel={() => setDialog(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setDialog(null);
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-content">
          <button
            className="dialog-close icon-button"
            onClick={() => setDialog(null)}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
          {dialog === "save" && (
            <form onSubmit={(event) => void saveScene(event)}>
              <span className="dialog-icon">
                <Bookmark size={24} />
              </span>
              <span className="eyebrow">A LITTLE QUIET TO KEEP</span>
              <h2 id="dialog-title">
                Name your <em>somewhere.</em>
              </h2>
              <p>
                Your landscape and all six sound levels, saved just as they are.
              </p>
              <label className="form-label" htmlFor="mix-name">
                Mix name
              </label>
              <input
                autoFocus
                id="mix-name"
                className="text-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={60}
                minLength={1}
                placeholder="Sunday, slowly"
              />
              <label className="form-label" htmlFor="mix-description">
                A little note <span>(optional)</span>
              </label>
              <input
                id="mix-description"
                className="text-input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={160}
                placeholder="For mornings with no plans."
              />
              <button
                className="primary-button wide"
                disabled={busy || !name.trim()}
                type="submit"
              >
                {busy ? "Keeping your quiet…" : "Save to your collection"}
                <Bookmark size={16} />
              </button>
            </form>
          )}
          {dialog === "focus" && (
            <div>
              <span className="dialog-icon">
                <Timer size={25} />
              </span>
              <span className="eyebrow">ONE THING AT A TIME</span>
              <h2 id="dialog-title">
                A moment of <em>focus.</em>
              </h2>
              {session ? (
                <>
                  <p>
                    You’re making space. That’s enough.
                    <br />
                    Your timer keeps going when the sound is paused.
                  </p>
                  <div className="focus-clock">{formatTime(remaining)}</div>
                  <div className="timer-track">
                    <span
                      style={{
                        width: `${100 * (1 - remaining / session.plannedSeconds)}%`,
                      }}
                    />
                  </div>
                  <p className="focus-scene">
                    <Headphones size={15} />
                    {session.sceneName} · {minutes(session.plannedSeconds)}
                  </p>
                  <button
                    className="primary-button wide"
                    onClick={() => setDialog(null)}
                  >
                    Back to your moment
                    <ArrowRight size={17} />
                  </button>
                  <button
                    className="end-session"
                    disabled={busy}
                    onClick={() => void endFocus()}
                  >
                    {busy ? "Ending session…" : "End this session early"}
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Put the rest of the world on hold.
                    <br />
                    No pressure, just a little uninterrupted time.
                  </p>
                  <div className="duration-options">
                    {[15, 25, 45, 60].map((value) => (
                      <button
                        key={value}
                        onClick={() => setDuration(value)}
                        className={duration === value ? "selected" : ""}
                      >
                        {value}
                        <span>minutes</span>
                      </button>
                    ))}
                  </div>
                  <label className="custom-duration" htmlFor="focus-duration">
                    Or take your own time
                    <input
                      id="focus-duration"
                      type="number"
                      min="1"
                      max="180"
                      value={duration}
                      onChange={(event) =>
                        setDuration(Number(event.target.value))
                      }
                    />
                    <span>min</span>
                  </label>
                  <div className="focus-summary">
                    <Leaf size={17} />
                    <span>{scene.name}. A little space to settle in.</span>
                  </div>
                  <button
                    className="primary-button wide"
                    disabled={busy || duration < 1 || duration > 180}
                    onClick={() => void startFocus()}
                  >
                    {busy ? "Making space…" : "Begin your moment"}
                    <Play size={16} />
                  </button>
                </>
              )}
            </div>
          )}
          {dialog === "shortcuts" && (
            <div>
              <span className="dialog-icon">
                <Command size={24} />
              </span>
              <span className="eyebrow">LESS CLICKING. MORE BEING.</span>
              <h2 id="dialog-title">
                The quiet <em>shortcuts.</em>
              </h2>
              <div className="shortcut-list">
                <div>
                  <span>Play or pause your soundscape</span>
                  <kbd>Space</kbd>
                </div>
                <div>
                  <span>Step into / out of the landscape</span>
                  <kbd>F</kbd>
                </div>
                <div>
                  <span>Close a dialog or leave immersion</span>
                  <kbd>Esc</kbd>
                </div>
                <div>
                  <span>A reminder of these shortcuts</span>
                  <kbd>?</kbd>
                </div>
              </div>
              <p className="shortcut-note">
                All sound is synthesized in your browser. Your mixes and focus
                moments stay in this local studio. No accounts. No streaming. No
                distractions.
              </p>
            </div>
          )}
          {dialog === "delete" && (
            <div>
              <span className="dialog-icon">
                <Trash2 size={24} />
              </span>
              <h2 id="dialog-title">
                Let this one <em>go?</em>
              </h2>
              <p>
                “{deleteScene?.name}” will be removed from your collection. You
                can always make a new mix.
              </p>
              <button
                className="primary-button wide"
                disabled={busy}
                onClick={() => void removeScene()}
              >
                {busy ? "Removing…" : "Remove this mix"}
                <Trash2 size={16} />
              </button>
              <button className="end-session" onClick={() => setDialog(null)}>
                Keep it a little longer
              </button>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
