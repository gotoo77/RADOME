import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createConnection, createServer } from 'node:net';
import { resolve } from 'node:path';
import test from 'node:test';

import { RadomeClient } from './radome-client.js';

const TIMEOUT_MS = 8_000;

function waitForClientEvent(client, type, predicate = () => true, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      unsubscribe();
      rejectPromise(new Error(`timeout waiting for RADOME client event: ${type}`));
    }, timeoutMs);
    const unsubscribe = client.on(type, value => {
      if (!predicate(value)) return;
      clearTimeout(timer);
      unsubscribe();
      resolvePromise(value);
    });
  });
}

async function freePort() {
  const server = createServer();
  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  await new Promise(resolvePromise => server.close(resolvePromise));
  if (!port) throw new Error('cannot allocate a free TCP port');
  return port;
}

async function waitForPort(port, timeoutMs = TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const connected = await new Promise(resolvePromise => {
      const socket = createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        resolvePromise(true);
      });
      socket.once('error', () => resolvePromise(false));
    });
    if (connected) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 50));
  }
  throw new Error(`RADOME server did not listen on 127.0.0.1:${port}`);
}

function serverBinary() {
  return resolve('target', 'debug', process.platform === 'win32' ? 'radome-server.exe' : 'radome-server');
}

function stopProcess(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  return new Promise(resolvePromise => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, 2_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolvePromise();
    });
    child.kill('SIGTERM');
  });
}

test('le SDK réel boucle bootstrap, télémétrie, commandes et resynchronisation', { timeout: 30_000 }, async () => {
  assert.equal(typeof WebSocket, 'function', 'Node.js doit fournir WebSocket pour ce smoke test');

  const port = await freePort();
  let stderr = '';
  const server = spawn(serverBinary(), [], {
    env: {
      ...process.env,
      RADOME_ADDR: `127.0.0.1:${port}`,
      RADOME_TELEMETRY_SOURCE: 'demo',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.setEncoding('utf8');
  server.stderr.on('data', chunk => { stderr += chunk; });

  const statuses = [];
  const client = new RadomeClient({
    url: `ws://127.0.0.1:${port}`,
    clientId: 'm6-live-e2e',
    role: 'driver-display',
    capabilities: ['display', 'touch'],
    supportedCapabilities: ['media.control', 'climate.control'],
    reconnectDelayMs: 50,
  });
  client.on('status', status => statuses.push(status));

  try {
    await waitForPort(port).catch(error => {
      throw new Error(`${error.message}\nserver stderr:\n${stderr}`);
    });

    const connected = waitForClientEvent(client, 'status', status => status === 'connected');
    client.connect();
    await connected;

    assert.ok(client.sessionId);
    const firstSession = client.sessionId;
    assert.equal(client.operational, true);
    assert.ok(client.hasCommand('media.next_track'));
    assert.ok(client.hasCommand('climate.set_temperature'));
    assert.ok(client.selectedCapabilities.includes('media.control'));
    assert.ok(client.selectedCapabilities.includes('climate.control'));
    assert.equal(client.snapshot?.media?.track_index, 0);
    assert.equal(client.snapshot?.climate?.temperature_c, 20);

    const telemetry = await waitForClientEvent(
      client,
      'event',
      event => event?.name === 'vehicle.speed_changed',
    );
    assert.equal(telemetry.name, 'vehicle.speed_changed');

    const mediaEventPromise = waitForClientEvent(
      client,
      'event',
      event => event?.name === 'media.next_track_requested',
    );
    const mediaResult = await client.sendCommand('media.next_track');
    assert.equal(mediaResult.outcome, 'succeeded');
    const mediaEvent = await mediaEventPromise;
    assert.equal(mediaEvent.data?.track_index, 1);

    const climateEventPromise = waitForClientEvent(
      client,
      'event',
      event => event?.name === 'climate.temperature_changed',
    );
    const climateResult = await client.sendCommand('climate.set_temperature', { temperature_c: 23.5 });
    assert.equal(climateResult.outcome, 'succeeded');
    const climateEvent = await climateEventPromise;
    assert.equal(climateEvent.data?.temperature_c, 23.5);

    const updatedSnapshot = waitForClientEvent(
      client,
      'snapshot',
      snapshot => snapshot?.media?.track_index === 1 && snapshot?.climate?.temperature_c === 23.5,
    );
    client.requestSnapshot();
    await updatedSnapshot;

    const reconnecting = waitForClientEvent(client, 'status', status => status === 'reconnecting');
    const reconnected = waitForClientEvent(client, 'status', status => status === 'connected');
    client.socket.close();
    await reconnecting;
    await reconnected;

    assert.notEqual(client.sessionId, firstSession);
    assert.equal(client.operational, true);
    assert.equal(client.snapshot?.media?.track_index, 1);
    assert.equal(client.snapshot?.climate?.temperature_c, 23.5);

    const bootstrapPhases = ['handshake', 'discovering', 'announcing_capabilities', 'synchronizing', 'connected'];
    for (const phase of bootstrapPhases) {
      assert.ok(statuses.filter(status => status === phase).length >= 2, `phase ${phase} absente après reconnexion`);
    }

    const disconnected = waitForClientEvent(client, 'status', status => status === 'disconnected');
    client.disconnect();
    await disconnected;
  } finally {
    client.disconnect();
    await stopProcess(server);
  }
});
