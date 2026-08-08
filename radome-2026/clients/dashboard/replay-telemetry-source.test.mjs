import assert from 'node:assert/strict';
import test from 'node:test';
import { framesToReplayEntries, ReplayTelemetrySource } from './replay-telemetry-source.js';

function recorder() {
  const calls = [];
  return {
    calls,
    applyRadomeEvent(name, data) { calls.push([name, data]); return true; },
  };
}

test('framesToReplayEntries conserve le delai une fois par frame', () => {
  assert.deepEqual(framesToReplayEntries([
    { afterMs: 100, events: [['vehicle.speed_changed', 'speed_kmh=10'], ['vehicle.engine_rpm_changed', 'engine_rpm=1000']] },
  ]), [
    { afterMs: 100, name: 'vehicle.speed_changed', data: 'speed_kmh=10' },
    { afterMs: 0, name: 'vehicle.engine_rpm_changed', data: 'engine_rpm=1000' },
  ]);
});

test('ReplayTelemetrySource rejoue les entrees puis signale sa fin', () => {
  const scheduled = [];
  const vehicle = recorder();
  const infotainment = recorder();
  const source = new ReplayTelemetrySource({
    app: { vehicle, infotainment },
    entries: [
      { afterMs: 10, name: 'vehicle.speed_changed', data: 'speed_kmh=42' },
      { afterMs: 20, name: 'media.title_changed', data: 'title=Replay' },
    ],
    setTimer(fn, delay) { scheduled.push({ fn, delay }); return scheduled.length; },
    clearTimer() {},
  });
  let completed = 0;
  source.addEventListener('complete', () => completed += 1);

  source.start();
  assert.equal(source.running, true);
  assert.deepEqual(scheduled.map(item => item.delay), [10, 30]);
  scheduled.forEach(item => item.fn());

  assert.deepEqual(vehicle.calls, [['vehicle.speed_changed', 'speed_kmh=42']]);
  assert.deepEqual(infotainment.calls, [['media.title_changed', 'title=Replay']]);
  assert.equal(source.running, false);
  assert.equal(completed, 1);
});

test('un replay vide se termine immediatement', () => {
  const source = new ReplayTelemetrySource({
    app: { vehicle: recorder(), infotainment: recorder() },
    entries: [],
  });
  let completed = 0;
  source.addEventListener('complete', () => completed += 1);
  source.start();
  assert.equal(source.running, false);
  assert.equal(completed, 1);
});

test('ReplayTelemetrySource annule les timers au stop sans signaler complete', () => {
  const cleared = [];
  const source = new ReplayTelemetrySource({
    app: { vehicle: recorder(), infotainment: recorder() },
    entries: [{ afterMs: 10, name: 'vehicle.speed_changed', data: 'speed_kmh=1' }],
    setTimer() { return 7; },
    clearTimer(timer) { cleared.push(timer); },
  });
  let completed = 0;
  source.addEventListener('complete', () => completed += 1);
  source.start();
  source.stop();
  assert.deepEqual(cleared, [7]);
  assert.equal(completed, 0);
  assert.equal(source.running, false);
});
