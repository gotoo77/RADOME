import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VehicleTelemetryHealth,
  VEHICLE_TELEMETRY_HEALTH,
} from './vehicle-telemetry-health.js';

test('la télémétrie passe de waiting à live puis stale', () => {
  let now = 1_000;
  const health = new VehicleTelemetryHealth({ staleAfterMs: 3_000, now: () => now });

  health.setConnectionStatus('connected');
  assert.equal(health.snapshot.state, VEHICLE_TELEMETRY_HEALTH.WAITING);

  health.noteTelemetry();
  assert.deepEqual(health.snapshot, {
    state: VEHICLE_TELEMETRY_HEALTH.LIVE,
    ageMs: 0,
    lastTelemetryAt: 1_000,
  });

  now = 3_999;
  assert.equal(health.snapshot.state, VEHICLE_TELEMETRY_HEALTH.LIVE);
  now = 4_001;
  assert.equal(health.snapshot.state, VEHICLE_TELEMETRY_HEALTH.STALE);
  assert.equal(health.snapshot.ageMs, 3_001);
});

test('une reconnexion ou déconnexion rend explicitement la télémétrie offline', () => {
  let now = 10;
  const health = new VehicleTelemetryHealth({ now: () => now });
  health.setConnectionStatus('connected');
  health.noteTelemetry();
  now = 20;

  health.setConnectionStatus('reconnecting');
  assert.equal(health.snapshot.state, VEHICLE_TELEMETRY_HEALTH.OFFLINE);

  health.setConnectionStatus('connected');
  assert.equal(health.snapshot.state, VEHICLE_TELEMETRY_HEALTH.LIVE);

  health.setConnectionStatus('disconnected');
  assert.equal(health.snapshot.state, VEHICLE_TELEMETRY_HEALTH.OFFLINE);
});

test('les phases de bootstrap restent en waiting tant que le client n est pas opérationnel', () => {
  const health = new VehicleTelemetryHealth();
  for (const status of ['connecting', 'handshake', 'discovering', 'announcing_capabilities', 'synchronizing']) {
    health.setConnectionStatus(status);
    assert.equal(health.snapshot.state, VEHICLE_TELEMETRY_HEALTH.WAITING);
  }
});
