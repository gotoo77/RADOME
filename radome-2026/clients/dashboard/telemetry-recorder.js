import { parseNumericPayload, VEHICLE_TELEMETRY } from './vehicle-state.js';

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
    validateRecordedEvent(event.name, event.data);
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

  return recording.entries.map((entry, index) => {
    const afterMs = Number(entry?.afterMs);
    if (!Number.isFinite(afterMs) || afterMs < 0 || !entry?.name) {
      throw new Error(`Invalid telemetry recording entry at index ${index}`);
    }
    validateRecordedEvent(entry.name, entry.data);
    return { afterMs, name: entry.name, data: entry.data };
  });
}

export function validateRecordedEvent(name, data) {
  const contract = vehicleContractFor(name);
  if (!contract) return true;
  if (parseNumericPayload(data, contract.key) === null) {
    throw new Error(`Invalid RADOME telemetry payload for ${name}`);
  }
  return true;
}

function vehicleContractFor(name) {
  return Object.values(VEHICLE_TELEMETRY).find(contract => contract.name === name) ?? null;
}
