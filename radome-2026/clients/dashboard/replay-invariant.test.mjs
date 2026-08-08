import assert from 'node:assert/strict';
import test from 'node:test';
import { InfotainmentState } from './infotainment-state.js';
import { ReplayTelemetrySource } from './replay-telemetry-source.js';
import { parseTelemetryRecording } from './telemetry-recorder.js';
import { VehicleState } from './vehicle-state.js';

function immediateTimers() {
  const scheduled = [];
  return {
    scheduled,
    setTimer(fn, delay) {
      scheduled.push({ fn, delay });
      return scheduled.length;
    },
    clearTimer() {},
    flush() {
      scheduled.sort((a, b) => a.delay - b.delay).forEach(item => item.fn());
    },
  };
}

test('une trace valide rejouee reconstruit exactement l etat final attendu', () => {
  const recording = JSON.stringify({
    version: 1,
    entries: [
      { afterMs: 0, name: 'vehicle.speed_changed', data: 'speed_kmh=0' },
      { afterMs: 0, name: 'vehicle.engine_rpm_changed', data: 'engine_rpm=850' },
      { afterMs: 10, name: 'media.source_changed', data: 'source=Bluetooth' },
      { afterMs: 10, name: 'media.title_changed', data: 'title=Road to Nowhere' },
      { afterMs: 10, name: 'media.artist_changed', data: 'artist=Talking Heads' },
      { afterMs: 10, name: 'media.playback_changed', data: 'state=playing' },
      { afterMs: 100, name: 'vehicle.speed_changed', data: 'speed_kmh=82' },
      { afterMs: 0, name: 'vehicle.engine_rpm_changed', data: 'engine_rpm=2850' },
      { afterMs: 100, name: 'media.title_changed', data: 'title=Once in a Lifetime' },
      { afterMs: 0, name: 'vehicle.speed_changed', data: 'speed_kmh=0' },
      { afterMs: 0, name: 'vehicle.engine_rpm_changed', data: 'engine_rpm=850' },
    ],
  });

  const vehicle = new VehicleState();
  const infotainment = new InfotainmentState();
  const timers = immediateTimers();
  const source = new ReplayTelemetrySource({
    app: { vehicle, infotainment },
    entries: parseTelemetryRecording(recording),
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });

  source.start();
  timers.flush();

  assert.deepEqual(vehicle.snapshot, { speedKmh: 0, engineRpm: 850 });
  assert.deepEqual(infotainment.snapshot, {
    source: 'Bluetooth',
    title: 'Once in a Lifetime',
    artist: 'Talking Heads',
    playing: true,
  });
});

test('la chronologie du replay est cumulative et stable pour les evenements simultanes', () => {
  const timers = immediateTimers();
  const source = new ReplayTelemetrySource({
    app: { vehicle: new VehicleState(), infotainment: new InfotainmentState() },
    entries: [
      { afterMs: 10, name: 'vehicle.speed_changed', data: 'speed_kmh=10' },
      { afterMs: 0, name: 'vehicle.engine_rpm_changed', data: 'engine_rpm=1000' },
      { afterMs: 25, name: 'vehicle.speed_changed', data: 'speed_kmh=20' },
    ],
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });

  source.start();
  assert.deepEqual(timers.scheduled.map(item => item.delay), [10, 10, 35]);
});
