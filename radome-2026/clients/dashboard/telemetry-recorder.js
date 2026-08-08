export class TelemetryRecorder {
  constructor({ now = () => performance.now() } = {}) {
    this.now = now;
    this.entries = [];
    this.startedAt = null;
    this.lastAt = null;
    this.unsubscribe = null;
  }

  start(client) {
    if (this.unsubscribe) return;
    this.entries = [];
    this.startedAt = this.now();
    this.lastAt = this.startedAt;
    this.unsubscribe = client.on('event', event => this.record(event));
  }

  record(event) {
    if (this.startedAt === null || !event?.name) return false;
    const current = this.now();
    this.entries.push({
      afterMs: Math.max(0, current - this.lastAt),
      name: event.name,
      data: event.data,
    });
    this.lastAt = current;
    return true;
  }

  stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.startedAt = null;
    this.lastAt = null;
    return this.snapshot();
  }

  snapshot() {
    return this.entries.map(entry => ({ ...entry }));
  }

  toJSON(space = 2) {
    return JSON.stringify({ version: 1, entries: this.snapshot() }, null, space);
  }
}

export function parseTelemetryRecording(text) {
  const recording = JSON.parse(text);
  if (recording?.version !== 1 || !Array.isArray(recording.entries)) {
    throw new Error('Unsupported RADOME telemetry recording');
  }
  return recording.entries.map(entry => ({
    afterMs: Math.max(0, Number(entry.afterMs) || 0),
    name: String(entry.name ?? ''),
    data: entry.data,
  })).filter(entry => entry.name);
}
