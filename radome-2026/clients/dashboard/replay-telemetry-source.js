import { applyDemoEvent } from './demo-events.js';

export class ReplayTelemetrySource extends EventTarget {
  constructor({ app, entries, setTimer = setTimeout, clearTimer = clearTimeout }) {
    super();
    this.app = app;
    this.entries = entries;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.timers = [];
    this.running = false;
    this.pending = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.pending = this.entries.length;

    if (this.pending === 0) {
      this.#complete();
      return;
    }

    let elapsed = 0;
    for (const entry of this.entries) {
      elapsed += Math.max(0, Number(entry.afterMs) || 0);
      this.timers.push(this.setTimer(() => {
        if (!this.running) return;
        applyDemoEvent(this.app, entry.name, entry.data);
        this.pending -= 1;
        if (this.pending === 0) this.#complete();
      }, elapsed));
    }
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.pending = 0;
    for (const timer of this.timers) this.clearTimer(timer);
    this.timers = [];
  }

  #complete() {
    this.running = false;
    this.pending = 0;
    this.timers = [];
    this.dispatchEvent(new Event('complete'));
  }
}

export function framesToReplayEntries(frames) {
  return frames.flatMap(frame => frame.events.map(([name, data], index) => ({
    afterMs: index === 0 ? frame.afterMs : 0,
    name,
    data,
  })));
}
