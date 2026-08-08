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
    { afterMs: 100, events: [['vehicle.speed_changed', 'speed=10'], ['vehicle.engine_rpm_changed', 'rpm=1000']] },
  ]), [
    { afterMs: 100, name: 'vehicle.speed_changed', data: 'speed=10' },
    { afterMs: 0, name: 'vehicle.engine_rpm_changed', data: 'rpm=1000' },
  ]);
});

test('ReplayTelemetrySource rejoue les entrees dans la timeline', () => {
  const scheduled = [];
  const vehicle = recorder();
  const infotainment = recorder();
  const source = new ReplayTelemetrySource({
    app: { vehicle, infotainment },
    entries: [
      { afterMs: 10, name: 'vehicle.speed_changed', data: 'speed=42' },
      { afterMs: 20, name: 'media.title_changed', data: 'title=Replay' },
    ],
    setTimer(fn, delay) { scheduled.push({ fn, delay }); return scheduled.length; },
    clearTimer() {},
  });

  source.start();
  assert.deepEqual(scheduled.map(item => item.delay), [10, 30]);
  scheduled.forEach(item => item.fn());
  assert.deepEqual(vehicle.calls, [['vehicle.speed_changed', 'speed=42']]);
  assert.deepEqual(infotainment.calls, [['media.title_changed', 'title=Replay']]);
});

test('ReplayTelemetrySource annule les timers au stop', () => {
  const cleared = [];
  const source = new ReplayTelemetrySource({
    app: { vehicle: recorder(), infotainment: recorder() },
    entries: [{ afterMs: 10, name: 'vehicle.speed_changed', data: 'speed=1' }],
    setTimer() { return 7; },
    clearTimer(timer) { cleared.push(timer); },
  });
  source.start();
  source.stop();
  assert.deepEqual(cleared, [7]);
});
