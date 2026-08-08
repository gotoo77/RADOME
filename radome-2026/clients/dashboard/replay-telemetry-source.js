import { applyDemoEvent } from './demo-events.js';

export class ReplayTelemetrySource {
  constructor({ app, entries, setTimer = setTimeout, clearTimer = clearTimeout }) {
    this.app = app;
    this.entries = entries;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.timers = [];
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    let elapsed = 0;

    for (const entry of this.entries) {
      elapsed += Math.max(0, Number(entry.afterMs) || 0);
      this.timers.push(this.setTimer(() => {
        if (this.running) applyDemoEvent(this.app, entry.name, entry.data);
      }, elapsed));
    }
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    for (const timer of this.timers) this.clearTimer(timer);
    this.timers = [];
  }
}

export function framesToReplayEntries(frames) {
  return frames.flatMap(frame => frame.events.map(([name, data], index) => ({
    afterMs: index === 0 ? frame.afterMs : 0,
    name,
    data,
  })));
}
