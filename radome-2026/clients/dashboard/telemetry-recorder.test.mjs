import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTelemetryRecording, TelemetryRecorder } from './telemetry-recorder.js';

function fakeClient() {
  let listener = null;
  return {
    on(type, fn) {
      assert.equal(type, 'event');
      listener = fn;
      return () => { listener = null; };
    },
    emit(event) { listener?.(event); },
  };
}

test('TelemetryRecorder enregistre les delais relatifs des evenements', () => {
  const times = [100, 125, 180];
  const client = fakeClient();
  const recorder = new TelemetryRecorder({ now: () => times.shift() });

  recorder.start(client);
  client.emit({ name: 'vehicle.speed_changed', data: 'speed=10' });
  client.emit({ name: 'media.title_changed', data: 'title=Replay me' });

  assert.deepEqual(recorder.stop(), [
    { afterMs: 25, name: 'vehicle.speed_changed', data: 'speed=10' },
    { afterMs: 55, name: 'media.title_changed', data: 'title=Replay me' },
  ]);
});

test('stop desabonne le recorder', () => {
  const client = fakeClient();
  const recorder = new TelemetryRecorder({ now: () => 0 });
  recorder.start(client);
  recorder.stop();
  client.emit({ name: 'vehicle.speed_changed', data: 'speed=99' });
  assert.deepEqual(recorder.snapshot(), []);
});

test('un enregistrement JSON peut etre recharge pour replay', () => {
  const entries = parseTelemetryRecording(JSON.stringify({
    version: 1,
    entries: [{ afterMs: 12, name: 'vehicle.speed_changed', data: 'speed=42' }],
  }));
  assert.deepEqual(entries, [{ afterMs: 12, name: 'vehicle.speed_changed', data: 'speed=42' }]);
});

test('parseTelemetryRecording rejette un format inconnu', () => {
  assert.throws(() => parseTelemetryRecording('{"version":2,"entries":[]}'), /Unsupported/);
});
