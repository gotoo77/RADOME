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
  client.emit({ name: 'vehicle.speed_changed', data: 'speed_kmh=10' });
  client.emit({ name: 'media.title_changed', data: 'title=Replay me' });

  assert.deepEqual(recorder.stop(), [
    { afterMs: 25, name: 'vehicle.speed_changed', data: 'speed_kmh=10' },
    { afterMs: 55, name: 'media.title_changed', data: 'title=Replay me' },
  ]);
});

test('stop desabonne le recorder', () => {
  const client = fakeClient();
  const recorder = new TelemetryRecorder({ now: () => 0 });
  recorder.start(client);
  recorder.stop();
  client.emit({ name: 'vehicle.speed_changed', data: 'speed_kmh=99' });
  assert.deepEqual(recorder.snapshot(), []);
});

test('un enregistrement JSON canonique peut etre recharge pour replay', () => {
  const entries = parseTelemetryRecording(JSON.stringify({
    version: 1,
    entries: [{ afterMs: 12, name: 'vehicle.speed_changed', data: 'speed_kmh=42' }],
  }));
  assert.deepEqual(entries, [{ afterMs: 12, name: 'vehicle.speed_changed', data: 'speed_kmh=42' }]);
});

test('parseTelemetryRecording rejette un ancien dialecte vehicule', () => {
  assert.throws(() => parseTelemetryRecording(JSON.stringify({
    version: 1,
    entries: [{ afterMs: 12, name: 'vehicle.speed_changed', data: 'speed=42' }],
  })), /Invalid RADOME telemetry payload/);
});

test('parseTelemetryRecording rejette les delais invalides', () => {
  for (const afterMs of [-1, 'oops', null]) {
    assert.throws(() => parseTelemetryRecording(JSON.stringify({
      version: 1,
      entries: [{ afterMs, name: 'media.title_changed', data: 'title=x' }],
    })), /Invalid telemetry recording entry/);
  }
});

test('parseTelemetryRecording rejette un format inconnu', () => {
  assert.throws(() => parseTelemetryRecording('{"version":2,"entries":[]}'), /Unsupported/);
});
