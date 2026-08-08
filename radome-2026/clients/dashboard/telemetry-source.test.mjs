import assert from 'node:assert/strict';
import test from 'node:test';
import { DemoTelemetrySource, RadomeTelemetrySource } from './telemetry-source.js';

test('RadomeTelemetrySource pilote le cycle de vie du client', () => {
  const calls = [];
  const source = new RadomeTelemetrySource({
    connect() { calls.push('connect'); },
    disconnect() { calls.push('disconnect'); },
  });
  source.start();
  source.stop();
  assert.deepEqual(calls, ['connect', 'disconnect']);
});

test('DemoTelemetrySource demarre une seule fois et annule le scenario', () => {
  const calls = [];
  const app = {};
  const source = new DemoTelemetrySource({
    app,
    play(receivedApp) {
      calls.push(receivedApp === app ? 'play' : 'wrong-app');
      return () => calls.push('cancel');
    },
  });

  source.start();
  source.start();
  source.stop();
  source.stop();

  assert.deepEqual(calls, ['play', 'cancel']);
});
