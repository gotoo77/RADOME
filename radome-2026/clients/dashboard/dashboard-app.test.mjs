import assert from 'node:assert/strict';
import test from 'node:test';
import { createClimateCommandExecutor, createMediaCommandExecutor } from './dashboard-app.js';
import { ClimateState } from './climate-state.js';
import { InfotainmentState } from './infotainment-state.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test('une commande media expose pending puis succeeded sans mutation optimiste', async () => {
  const infotainment = new InfotainmentState();
  infotainment.applySnapshot({ playback: 'paused', volume: 50, track_index: 4 });
  const pending = deferred();
  const calls = [];
  const client = {
    sendCommand(name, data) {
      calls.push({ name, data });
      return pending.promise;
    },
  };
  const sendMediaCommand = createMediaCommandExecutor({ client, infotainment });

  const resultPromise = sendMediaCommand('media.set_volume', { volume: 72 });
  assert.deepEqual(calls, [{ name: 'media.set_volume', data: { volume: 72 } }]);
  assert.equal(infotainment.snapshot.command.status, 'pending');
  assert.equal(infotainment.snapshot.volume, 50);

  pending.resolve({ outcome: 'succeeded', data: 'accepted' });
  assert.deepEqual(await resultPromise, { outcome: 'succeeded', data: 'accepted' });
  assert.equal(infotainment.snapshot.command.status, 'succeeded');
  assert.equal(infotainment.snapshot.volume, 50);

  infotainment.applyRadomeEvent('media.volume_changed', {
    playback: 'paused',
    volume: 72,
    track_index: 4,
  });
  assert.equal(infotainment.snapshot.volume, 72);
});

test('une commande media refusée conserve l état observé et expose le détail', async () => {
  const infotainment = new InfotainmentState();
  infotainment.applySnapshot({ playback: 'playing', volume: 80, track_index: 1 });
  const client = {
    sendCommand() {
      return Promise.reject(new Error('capability_denied'));
    },
  };
  const sendMediaCommand = createMediaCommandExecutor({ client, infotainment });

  await assert.rejects(
    sendMediaCommand('media.volume_down'),
    /capability_denied/,
  );
  assert.deepEqual(infotainment.snapshot.command, {
    status: 'failed',
    name: 'media.volume_down',
    detail: 'capability_denied',
  });
  assert.equal(infotainment.snapshot.volume, 80);
  assert.equal(infotainment.snapshot.playing, true);
});

test('une commande climat attend l événement avant de modifier la température observée', async () => {
  const climate = new ClimateState();
  climate.applySnapshot({ temperature_c: 20 });
  const pending = deferred();
  const calls = [];
  const client = {
    sendCommand(name, data) {
      calls.push({ name, data });
      return pending.promise;
    },
  };
  const sendClimateCommand = createClimateCommandExecutor({ client, climate });

  const resultPromise = sendClimateCommand(23.5);
  assert.deepEqual(calls, [{
    name: 'climate.set_temperature',
    data: { temperature_c: 23.5 },
  }]);
  assert.equal(climate.snapshot.command.status, 'pending');
  assert.equal(climate.snapshot.temperatureC, 20);

  pending.resolve({ outcome: 'succeeded', data: 'accepted' });
  await resultPromise;
  assert.equal(climate.snapshot.command.status, 'succeeded');
  assert.equal(climate.snapshot.temperatureC, 20);

  climate.applyRadomeEvent('climate.temperature_changed', { temperature_c: 23.5 });
  assert.equal(climate.snapshot.temperatureC, 23.5);
});

test('un refus climat conserve la température du snapshot', async () => {
  const climate = new ClimateState();
  climate.applySnapshot({ temperature_c: 21 });
  const client = {
    sendCommand() {
      return Promise.reject(new Error('temperature_c_out_of_range'));
    },
  };
  const sendClimateCommand = createClimateCommandExecutor({ client, climate });

  await assert.rejects(sendClimateCommand(31), /temperature_c_out_of_range/);
  assert.equal(climate.snapshot.temperatureC, 21);
  assert.deepEqual(climate.snapshot.command, {
    status: 'failed',
    requestedTemperatureC: 31,
    detail: 'temperature_c_out_of_range',
  });
});
