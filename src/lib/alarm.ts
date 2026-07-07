"use client";

/**
 * Shared alarm sound synths + looper. Single audio owner is DesktopShell —
 * the timer page's AlarmModal is a visual surface only.
 */

import type { AlarmSound } from "@/lib/constants";

export function playBell(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.5);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5);
}

export function playChime(ctx: AudioContext) {
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.2;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.start(t); osc.stop(t + 0.8);
  });
}

export function playDigital(ctx: AudioContext) {
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square"; osc.frequency.value = 880;
    const t = ctx.currentTime + i * 0.25;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.setValueAtTime(0, t + 0.15);
    osc.start(t); osc.stop(t + 0.15);
  }
}

export function playGentle(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine"; osc.frequency.value = 528;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.5);
  gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 1.5);
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 2.5);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 3);
}

export function playPulse(ctx: AudioContext) {
  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.value = 660;
    const t = ctx.currentTime + i * 0.4;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t); osc.stop(t + 0.35);
  }
}

function playSynth(ctx: AudioContext, type: AlarmSound) {
  switch (type) {
    case "bell": playBell(ctx); break;
    case "chime": playChime(ctx); break;
    case "digital": playDigital(ctx); break;
    case "gentle": playGentle(ctx); break;
    case "pulse": playPulse(ctx); break;
  }
}

export interface AlarmLooper {
  start(sound: AlarmSound): void;
  stop(): void;
}

/**
 * Looping alarm: synth sounds re-fire every 4s; "kettle" plays the whistle
 * file on a continuous loop. stop() is idempotent.
 */
export function createAlarmLooper(): AlarmLooper {
  let ctx: AudioContext | null = null;
  let interval: number | null = null;
  let kettle: HTMLAudioElement | null = null;

  const stop = () => {
    if (interval !== null) { window.clearInterval(interval); interval = null; }
    if (kettle) { kettle.pause(); kettle = null; }
    if (ctx && ctx.state !== "closed") { ctx.close().catch(() => {}); }
    ctx = null;
  };

  const start = (sound: AlarmSound) => {
    stop();
    if (sound === "kettle") {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      kettle = new Audio(`${origin}/sounds/kettle-whistle.ogg`);
      kettle.loop = true;
      kettle.volume = 0.4;
      kettle.play().catch(() => {});
      return;
    }
    try {
      ctx = new AudioContext();
      playSynth(ctx, sound);
      interval = window.setInterval(() => {
        if (ctx && ctx.state !== "closed") {
          try { playSynth(ctx, sound); } catch {}
        }
      }, 4000);
    } catch {}
  };

  return { start, stop };
}
