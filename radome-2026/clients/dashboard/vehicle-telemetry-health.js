export const VEHICLE_TELEMETRY_HEALTH = Object.freeze({
  LIVE: 'live',
  WAITING: 'waiting',
  STALE: 'stale',
  OFFLINE: 'offline',
});

export class VehicleTelemetryHealth {
  constructor({ staleAfterMs = 3_000, now = () => Date.now() } = {}) {
    if (!Number.isFinite(staleAfterMs) || staleAfterMs <= 0) {
      throw new Error('staleAfterMs must be greater than zero');
    }
    this.staleAfterMs = staleAfterMs;
    this.now = now;
    this.connectionStatus = 'disconnected';
    this.lastTelemetryAt = null;
  }

  setConnectionStatus(status) {
    this.connectionStatus = status;
    return this.snapshot;
  }

  noteTelemetry() {
    this.lastTelemetryAt = this.now();
    return this.snapshot;
  }

  reset() {
    this.lastTelemetryAt = null;
    return this.snapshot;
  }

  get snapshot() {
    const now = this.now();
    const ageMs = this.lastTelemetryAt === null ? null : Math.max(0, now - this.lastTelemetryAt);

    if (this.connectionStatus === 'disconnected' || this.connectionStatus === 'reconnecting') {
      return { state: VEHICLE_TELEMETRY_HEALTH.OFFLINE, ageMs, lastTelemetryAt: this.lastTelemetryAt };
    }

    if (this.connectionStatus !== 'connected' || this.lastTelemetryAt === null) {
      return { state: VEHICLE_TELEMETRY_HEALTH.WAITING, ageMs, lastTelemetryAt: this.lastTelemetryAt };
    }

    return {
      state: ageMs > this.staleAfterMs
        ? VEHICLE_TELEMETRY_HEALTH.STALE
        : VEHICLE_TELEMETRY_HEALTH.LIVE,
      ageMs,
      lastTelemetryAt: this.lastTelemetryAt,
    };
  }
}
