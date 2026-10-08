import type { Mix } from "../shared";

/**
 * SoundEngine — procedural ambient soundscape generator.
 *
 * All six channels (rain, waves, wind, fire, birds, pads) are synthesised in
 * real time with the Web Audio API. No samples are downloaded and no API keys
 * are required. Noise buffers are generated once and looped continuously; the
 * graph persists for the lifetime of the engine and pausing is achieved by
 * suspending the AudioContext, which silences output without tearing down the
 * graph (so resume is instantaneous).
 *
 * Each channel owns an independent gain node that the mixer scales, so every
 * slider controls its channel in isolation. Levels are kept conservative and
 * gains are ramped to avoid clicks/pops.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private channels: Record<MixChannel, ChannelState> | null = null;
  private noise: NoiseBuffers | null = null;
  private scheduledTimers = new Set<number>();
  private schedulersRunning = false;
  private playing = false;
  private masterVolume = 65;
  private mix: Mix = { rain: 0, waves: 0, wind: 0, fire: 0, birds: 0, pads: 0 };
  private rampTime = 0.12;

  // ---- Public contract -------------------------------------------------

  /** Resume the AudioContext and fade every channel in. Safe to call rapidly. */
  async play(): Promise<void> {
    if (!this.channels) this.build();
    const ctx = this.ctx!;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (ctx.state !== "running")
      throw new Error("Audio could not start. Press play to try again.");
    this.playing = true;
    const now = ctx.currentTime;
    const m = this.master!;
    m.gain.cancelScheduledValues(now);
    m.gain.setValueAtTime(Math.max(0.0001, m.gain.value), now);
    m.gain.linearRampToValueAtTime(this.masterScalar(), now + this.rampTime);
    this.applyMix(now + this.rampTime);
    // Start any channel-specific scheduled loops (birds, fire crackles).
    // Guard against duplicate chains from rapid play/pause cycling.
    if (this.channels && !this.schedulersRunning) {
      this.schedulersRunning = true;
      for (const id of channelKeys) {
        const ch = this.channels[id];
        if (ch.onPlay) ch.onPlay();
      }
    }
  }

  /** Suspend the graph (silence) without destroying it. */
  pause(): void {
    this.playing = false;
    this.schedulersRunning = false;
    for (const timer of this.scheduledTimers) clearTimeout(timer);
    this.scheduledTimers.clear();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const m = this.master;
    if (m) {
      m.gain.cancelScheduledValues(now);
      m.gain.setValueAtTime(Math.max(0.0001, m.gain.value), now);
      m.gain.linearRampToValueAtTime(0.0001, now + this.rampTime);
    }
    // Suspend slightly after the fade so the tail isn't cut hard.
    const ctx = this.ctx;
    this.schedule(() => {
      if (!this.playing) void ctx.suspend();
    }, 160);
  }

  /** Update per-channel volumes (0–100). Ramped to avoid zipper noise. */
  setMix(mix: Mix): void {
    this.mix = { ...mix };
    if (this.ctx) this.applyMix(this.ctx.currentTime + this.rampTime);
  }

  /** Set master volume (0–100). Ramped. */
  setMaster(volume: number): void {
    this.masterVolume = Math.min(100, Math.max(0, volume));
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(
      Math.max(0.0001, this.master.gain.value),
      now,
    );
    if (this.playing) {
      this.master.gain.linearRampToValueAtTime(
        this.masterScalar(),
        now + this.rampTime,
      );
    }
  }

  /** Tear down everything; safe to call when already disposed. */
  dispose(): void {
    for (const t of this.scheduledTimers) clearTimeout(t);
    this.scheduledTimers.clear();
    const ctx = this.ctx;
    if (ctx) {
      try {
        void ctx.close();
      } catch {
        /* already closed */
      }
    }
    this.ctx = null;
    this.master = null;
    this.channels = null;
    this.noise = null;
    this.playing = false;
    this.schedulersRunning = false;
  }

  // ---- Graph construction ----------------------------------------------

  private build(): void {
    const Ctor = resolveAudioContext();
    const ctx = new Ctor();
    this.ctx = ctx;
    this.noise = this.makeNoise(ctx);
    const master = ctx.createGain();
    master.gain.value = this.playing ? this.masterScalar() : 0.0001;
    master.connect(ctx.destination);
    this.master = master;

    this.channels = {
      rain: this.makeRain(ctx, this.noise),
      waves: this.makeWaves(ctx, this.noise),
      wind: this.makeWind(ctx, this.noise),
      fire: this.makeFire(ctx),
      birds: this.makeBirds(ctx),
      pads: this.makePads(ctx),
    };
    // Start persistent sources; they run forever, gated by gains.
    for (const ch of Object.values(this.channels)) {
      for (const src of ch.sources) {
        src.start();
      }
    }
    this.applyMix(ctx.currentTime + this.rampTime);
  }

  private masterScalar(): number {
    // Gentle curve so low volumes are still audible but peaks stay tame.
    return (this.masterVolume / 100) * 0.85;
  }

  private applyMix(atTime: number): void {
    if (!this.channels || !this.ctx) return;
    const t = atTime;
    for (const id of channelKeys) {
      const ch = this.channels[id];
      const target = this.channelScalar(this.mix[id]);
      ch.gain.gain.cancelScheduledValues(t);
      ch.gain.gain.setValueAtTime(
        Math.max(0.0001, ch.gain.gain.value),
        t - this.rampTime,
      );
      ch.gain.gain.linearRampToValueAtTime(target, t);
    }
  }

  /** Map a 0–100 slider to a perceptual gain target. */
  private channelScalar(v: number): number {
    const n = Math.min(100, Math.max(0, v)) / 100;
    return n * n * 0.9; // quadratic feel + headroom
  }

  // ---- Noise buffer generation (once) ----------------------------------

  private makeNoise(ctx: AudioContext): NoiseBuffers {
    const seconds = 4;
    const len = Math.floor(ctx.sampleRate * seconds);
    // Brownish noise — warmer than white, gentler than pink for ambience.
    const brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const brownData = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      brownData[i] = last * 3.2;
    }
    // Pink-ish noise via Paul Kellet's economical filter.
    const pink = ctx.createBuffer(1, len, ctx.sampleRate);
    const pinkData = pink.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.532952;
      b5 = -0.7616 * b5 - white * 0.016898;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    // High-passed airy noise for wind whistling (filtered live).
    const airy = ctx.createBuffer(1, len, ctx.sampleRate);
    const airyData = airy.getChannelData(0);
    for (let i = 0; i < len; i++) {
      airyData[i] = (Math.random() * 2 - 1) * 0.5;
    }
    return { brown, pink, airy };
  }

  private loopingSource(
    ctx: AudioContext,
    buffer: AudioBuffer,
  ): AudioBufferSourceNode {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  /** Wire a node through an optional StereoPanner, falling back to direct. */
  private wireStereo(
    ctx: AudioContext,
    from: AudioNode,
    to: AudioNode,
    pan: number,
  ): void {
    try {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      from.connect(panner);
      panner.connect(to);
    } catch {
      // StereoPannerNode unsupported (very old browsers).
      from.connect(to);
    }
  }

  // ---- Channel builders -----------------------------------------------

  /** Rain: pink noise through a bandpass + subtle high shimmer. */
  private makeRain(ctx: AudioContext, noise: NoiseBuffers): ChannelState {
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.master!);

    const body = this.loopingSource(ctx, noise.pink);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1100;
    bp.Q.value = 0.7;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 420;
    body.connect(bp);
    bp.connect(hp);
    hp.connect(gain);

    // Fine high droplet shimmer, slightly off-centre.
    const shimmer = this.loopingSource(ctx, noise.airy);
    const shimmerBp = ctx.createBiquadFilter();
    shimmerBp.type = "highpass";
    shimmerBp.frequency.value = 5200;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.18;
    shimmer.connect(shimmerBp);
    shimmerBp.connect(shimmerGain);
    this.wireStereo(ctx, shimmerGain, gain, 0.25);

    return { gain, sources: [body, shimmer] };
  }

  /** Waves: brown noise shaped by a slow LFO swell (low modulation). */
  private makeWaves(ctx: AudioContext, noise: NoiseBuffers): ChannelState {
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.master!);

    const src = this.loopingSource(ctx, noise.brown);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.Q.value = 0.5;
    const swell = ctx.createGain();
    swell.gain.value = 0.5;
    src.connect(lp);
    lp.connect(swell);
    swell.connect(gain);

    // Slow swell LFO (~0.09 Hz) — the "rolling" ebb and flow.
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.42;
    lfo.connect(lfoGain);
    lfoGain.connect(swell.gain);

    // Second, faster shimmer layer for foam texture.
    const foam = this.loopingSource(ctx, noise.pink);
    const foamHp = ctx.createBiquadFilter();
    foamHp.type = "highpass";
    foamHp.frequency.value = 2600;
    const foamGain = ctx.createGain();
    foamGain.gain.value = 0.12;
    const foamSwell = ctx.createGain();
    foamSwell.gain.value = 0.5;
    const foamLfo = ctx.createOscillator();
    foamLfo.type = "sine";
    foamLfo.frequency.value = 0.17;
    const foamLfoGain = ctx.createGain();
    foamLfoGain.gain.value = 0.4;
    foamLfo.connect(foamLfoGain);
    foamLfoGain.connect(foamSwell.gain);
    foam.connect(foamHp);
    foamHp.connect(foamGain);
    foamGain.connect(foamSwell);
    this.wireStereo(ctx, foamSwell, gain, -0.3);

    return { gain, sources: [src, lfo, foam, foamLfo] };
  }

  /** Wind: airy noise through a resonant bandpass that slowly drifts. */
  private makeWind(ctx: AudioContext, noise: NoiseBuffers): ChannelState {
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.master!);

    const src = this.loopingSource(ctx, noise.airy);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 700;
    band.Q.value = 1.4;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 250;
    src.connect(hp);
    hp.connect(band);
    band.connect(gain);

    // Drifting centre frequency to suggest gusts.
    const drift = ctx.createOscillator();
    drift.type = "sine";
    drift.frequency.value = 0.07;
    const driftGain = ctx.createGain();
    driftGain.gain.value = 380;
    drift.connect(driftGain);
    driftGain.connect(band.frequency);

    // A second lower band for body.
    const body = this.loopingSource(ctx, noise.brown);
    const bodyBand = ctx.createBiquadFilter();
    bodyBand.type = "bandpass";
    bodyBand.frequency.value = 320;
    bodyBand.Q.value = 0.8;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.5;
    body.connect(bodyBand);
    bodyBand.connect(bodyGain);
    this.wireStereo(ctx, bodyGain, gain, -0.4);

    return { gain, sources: [src, drift, body] };
  }

  /** Fire: filtered noise bed + scheduled crackle impulses. */
  private makeFire(ctx: AudioContext): ChannelState {
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.master!);

    // Continuous low roar.
    const src = this.loopingSource(ctx, this.noise!.brown);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 480;
    lp.Q.value = 0.6;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.6;
    src.connect(lp);
    lp.connect(roarGain);
    roarGain.connect(gain);

    // Crackles are scheduled on play() into this sink.
    const crackleSink = ctx.createGain();
    crackleSink.gain.value = 1;
    crackleSink.connect(gain);

    const onPlay = () => this.scheduleFireCrackles(crackleSink);

    return { gain, sources: [src], crackleSink, onPlay };
  }

  /** Birds: intermittent melodic chirps with quiet between calls. */
  private makeBirds(ctx: AudioContext): ChannelState {
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.master!);


    const chirpSink = ctx.createGain();
    chirpSink.gain.value = 1;
    chirpSink.connect(gain);

    const onPlay = () => this.scheduleBirds(chirpSink);

    return { gain, sources: [], chirpSink, onPlay };
  }

  /** Pads: layered detuned sine/triangle tones forming a soft harmonic bed. */
  private makePads(ctx: AudioContext): ChannelState {
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.master!);

    // A Dminor-ish stack: D3, F3, A3, C4 — gentle and unresolved.
    const freqs = [146.83, 174.61, 220.0, 261.63];
    const types: OscillatorType[] = ["sine", "triangle", "sine", "sine"];
    const oscs: AudioScheduledSourceNode[] = [];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = types[i]!;
      osc.frequency.value = freqs[i]!;
      // Slight detune for warmth.
      osc.detune.value = (i % 2 === 0 ? 1 : -1) * (3 + i * 2);

      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.16;

      // Slow amplitude shimmer per voice.
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.05 + i * 0.022;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.07;
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);

      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1200;
      lp.Q.value = 0.4;

      osc.connect(oscGain);
      oscGain.connect(lp);
      this.wireStereo(ctx, lp, gain, (i / (freqs.length - 1)) * 1.4 - 0.7);
      oscs.push(osc, lfo);
    }
    return { gain, sources: oscs };
  }

  // ---- Scheduled fire crackles ----------------------------------------

  private scheduleFireCrackles(sink: GainNode): void {
    const tick = () => {
      if (!this.playing || !this.ctx) return;
      this.emitCrackle(sink);
      const next = 180 + Math.random() * 520;
      this.schedule(tick, next);
    };
    this.schedule(tick, 200 + Math.random() * 600);
  }

  private emitCrackle(sink: GainNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const impulse = ctx.createBufferSource();
    const dur = 0.06 + Math.random() * 0.12;
    const buf = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * dur),
      ctx.sampleRate,
    );
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.exp((-3.2 * i) / data.length);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    impulse.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1600 + Math.random() * 2200;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.value = 0.5 + Math.random() * 0.5;
    impulse.connect(bp);
    bp.connect(g);
    this.wireStereo(ctx, g, sink, Math.random() * 1.6 - 0.8);
    impulse.start(now);
    impulse.stop(now + dur);
  }

  // ---- Scheduled melodic birds ----------------------------------------

  private scheduleBirds(sink: GainNode): void {
    const loop = () => {
      if (!this.playing || !this.ctx) return;
      this.emitBirdChirp(sink);
      const gap = 2600 + Math.random() * 5200;
      this.schedule(loop, gap);
    };
    this.schedule(loop, 1200 + Math.random() * 1800);
  }

  private emitBirdChirp(sink: GainNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    // Pentatonic-ish chirp: short frequency sweep.
    const base = 1800 + Math.random() * 1400;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(
      base * (1.15 + Math.random() * 0.25),
      now + 0.08,
    );
    osc.frequency.exponentialRampToValueAtTime(base * 0.92, now + 0.16);

    const g = ctx.createGain();
    const peak = 0.16 + Math.random() * 0.14;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5200;

    osc.connect(g);
    g.connect(lp);
    this.wireStereo(ctx, lp, sink, Math.random() * 1.8 - 0.9);

    osc.start(now);
    osc.stop(now + 0.26);

    // Occasionally emit a second, answering chirp.
    if (Math.random() < 0.4) {
      const now2 = now + 0.18 + Math.random() * 0.18;
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      const base2 = base * 1.25;
      osc2.frequency.setValueAtTime(base2, now2);
      osc2.frequency.exponentialRampToValueAtTime(base2 * 0.88, now2 + 0.14);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, now2);
      g2.gain.exponentialRampToValueAtTime(peak * 0.7, now2 + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, now2 + 0.2);
      const lp2 = ctx.createBiquadFilter();
      lp2.type = "lowpass";
      lp2.frequency.value = 5200;
      osc2.connect(g2);
      g2.connect(lp2);
      this.wireStereo(ctx, lp2, sink, Math.random() * 1.8 - 0.9);
      osc2.start(now2);
      osc2.stop(now2 + 0.26);
    }
  }
  private schedule(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      this.scheduledTimers.delete(timer);
      callback();
    }, delay);
    this.scheduledTimers.add(timer);
  }
}

// ---- Module helpers ---------------------------------------------------

function resolveAudioContext(): typeof AudioContext {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) throw new Error("Web Audio API is not supported in this browser.");
  return Ctor;
}

// ---- Local types ------------------------------------------------------

type MixChannel = keyof Mix;
const channelKeys: MixChannel[] = [
  "rain",
  "waves",
  "wind",
  "fire",
  "birds",
  "pads",
];

interface NoiseBuffers {
  brown: AudioBuffer;
  pink: AudioBuffer;
  airy: AudioBuffer;
}

interface ChannelState {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  /** Optional loop to start when playback begins (birds, fire crackles). */
  onPlay?: () => void;
  chirpSink?: GainNode;
  crackleSink?: GainNode;
}
