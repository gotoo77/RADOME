import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RadomeClient,
  RadomeCommandOutcomeUnknownError,
} from './radome-client.js';

class FakeSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.listeners = new Map();
    this.sent = [];
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, value = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(value);
  }

  open() {
    this.readyState = 1;
    this.emit('open');
  }

  receive(message) {
    this.emit('message', { data: JSON.stringify(message) });
  }

  send(data) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.readyState = 3;
    this.emit('close');
  }
}

function response(type, payload, { sessionId = 'session-test', correlationId = null } = {}) {
  const envelope = {
    version: 1,
    id: `server-${type}`,
    type,
    payload,
  };
  if (sessionId) envelope.session_id = sessionId;
  if (correlationId) envelope.correlation_id = correlationId;
  return envelope;
}

function createFixture(overrides = {}) {
  const sockets = [];
  const scheduled = [];
  const statuses = [];
  const client = new RadomeClient({
    url: 'ws://radome.test',
    clientId: 'cockpit-web',
    role: 'center-console',
    capabilities: ['display', 'touch'],
    supportedCapabilities: ['media.control', 'climate.control'],
    webSocketFactory: url => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
    schedule: (callback, delay) => {
      const handle = { callback, delay, cancelled: false };
      scheduled.push(handle);
      return handle;
    },
    cancelSchedule: handle => { handle.cancelled = true; },
    ...overrides,
  });
  client.on('status', status => statuses.push(status));
  return { client, sockets, scheduled, statuses };
}

function bootstrapUntilSnapshot(client, socket, {
  capabilities = ['media.control'],
  commands = [{
    name: 'media.play',
    required_capability: 'media.control',
    event_name: 'media.playback_started',
  }],
} = {}) {
  client.connect();
  socket.open();
  assert.equal(socket.sent.at(-1).type, 'hello');

  socket.receive(response('hello', { server: 'radome-server', protocol_version: 1 }));
  assert.equal(socket.sent.at(-1).type, 'discovery_request');

  socket.receive(response('discovery_result', { capabilities, commands }));
  const announce = socket.sent.at(-1);
  assert.equal(announce.type, 'capability_announce');
  assert.deepEqual(announce.payload.capabilities, ['display', 'touch', 'media.control']);

  socket.receive(response('capability_announce', { accepted: true }));
  assert.equal(socket.sent.at(-1).type, 'state_snapshot_request');
}

test('bootstrap dynamique: discovery -> capabilities sélectionnées -> snapshot -> events', () => {
  const { client, sockets, statuses } = createFixture();
  const events = [];
  const order = [];
  client.on('snapshot', snapshot => order.push(['snapshot', snapshot]));
  client.on('event', event => { events.push(event); order.push(['event', event]); });

  client.connect();
  const socket = sockets[0];
  socket.open();
  assert.equal(socket.sent[0].type, 'hello');
  assert.equal(socket.sent[0].payload.client_id, 'cockpit-web');

  socket.receive(response('hello', { server: 'radome-server', protocol_version: 1 }));
  assert.equal(socket.sent.at(-1).type, 'discovery_request');

  socket.receive(response('discovery_result', {
    capabilities: ['media.control', 'server.only'],
    commands: [{
      name: 'media.play',
      required_capability: 'media.control',
      event_name: 'media.playback_started',
    }],
  }));
  assert.deepEqual(client.selectedCapabilities, ['display', 'touch', 'media.control']);
  assert.equal(client.hasCommand('media.play'), true);
  assert.equal(client.hasCommand('media.pause'), false);

  const announce = socket.sent.at(-1);
  assert.equal(announce.type, 'capability_announce');
  assert.deepEqual(announce.payload.capabilities, ['display', 'touch', 'media.control']);

  socket.receive(response('capability_announce', { accepted: true }));
  assert.equal(socket.sent.at(-1).type, 'state_snapshot_request');

  socket.receive(response('event', {
    name: 'vehicle.speed_changed',
    data: 'speed_kmh=90',
  }));
  assert.deepEqual(events, [], 'events reçus avant le snapshot restent tamponnés');

  const snapshot = {
    media: { playback: 'paused', volume: 50, track_index: 0 },
    climate: { temperature_c: 20 },
  };
  socket.receive(response('state_snapshot', snapshot));

  assert.equal(client.operational, true);
  assert.deepEqual(client.snapshot, snapshot);
  assert.deepEqual(order.map(([type]) => type), ['snapshot', 'event']);
  assert.equal(statuses.at(-1), 'connected');
});

test('une commande doit venir de la discovery et son résultat reste corrélé', async () => {
  const { client, sockets } = createFixture();
  client.connect();
  const socket = sockets[0];
  socket.open();
  socket.receive(response('hello', {}));
  socket.receive(response('discovery_result', {
    capabilities: ['media.control'],
    commands: [{
      name: 'media.play',
      required_capability: 'media.control',
      event_name: 'media.playback_started',
    }],
  }));
  socket.receive(response('capability_announce', { accepted: true }));
  socket.receive(response('state_snapshot', {}));

  await assert.rejects(client.sendCommand('media.pause'), /was not discovered/);

  const pending = client.sendCommand('media.play');
  const command = socket.sent.at(-1);
  assert.equal(command.type, 'command');
  assert.equal(command.payload.name, 'media.play');

  socket.receive(response('command_result', {
    outcome: 'succeeded',
    data: 'accepted',
  }, { correlationId: command.id }));

  assert.deepEqual(await pending, { outcome: 'succeeded', data: 'accepted' });
});

test('reconnexion: nouvelle session et aucune commande ambiguë rejouée', async () => {
  const { client, sockets, scheduled, statuses } = createFixture({ reconnectDelayMs: 250 });
  client.connect();
  let socket = sockets[0];
  socket.open();
  socket.receive(response('hello', {}, { sessionId: 'session-1' }));
  socket.receive(response('discovery_result', {
    capabilities: ['media.control'],
    commands: [{
      name: 'media.play',
      required_capability: 'media.control',
      event_name: 'media.playback_started',
    }],
  }, { sessionId: 'session-1' }));
  socket.receive(response('capability_announce', { accepted: true }, { sessionId: 'session-1' }));
  socket.receive(response('state_snapshot', {}, { sessionId: 'session-1' }));

  const ambiguous = client.sendCommand('media.play');
  const firstCommand = socket.sent.at(-1);
  assert.equal(firstCommand.type, 'command');

  socket.close();
  await assert.rejects(ambiguous, error => error instanceof RadomeCommandOutcomeUnknownError);
  assert.equal(statuses.at(-1), 'reconnecting');
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 250);

  scheduled[0].callback();
  assert.equal(sockets.length, 2);
  socket = sockets[1];
  socket.open();
  assert.equal(socket.sent.length, 1);
  assert.equal(socket.sent[0].type, 'hello');
  assert.equal(socket.sent.some(message => message.type === 'command'), false);

  socket.receive(response('hello', {}, { sessionId: 'session-2' }));
  assert.equal(client.sessionId, 'session-2');
  assert.notEqual(client.sessionId, 'session-1');
  assert.equal(socket.sent.at(-1).type, 'discovery_request');
});
