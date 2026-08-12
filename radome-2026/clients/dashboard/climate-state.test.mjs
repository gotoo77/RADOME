import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ClimateState,
  CLIMATE_TEMPERATURE_EVENT,
  parseClimateState,
} from './climate-state.js';

test('parseClimateState valide le contrat serveur et les bornes', () => {
  assert.deepEqual(parseClimateState({ temperature_c: 21.5 }), { temperatureC: 21.5 });
  assert.deepEqual(parseClimateState('temperature_c=18'), { temperatureC: 18 });
  assert.equal(parseClimateState({ temperature_c: 15.9 }), null);
  assert.equal(parseClimateState({ temperature_c: 30.1 }), null);
  assert.equal(parseClimateState({ temperature_c: 'nope' }), null);
  assert.equal(parseClimateState(null), null);
});

test('le snapshot serveur devient la base de vérité du climat', () => {
  const climate = new ClimateState();
  assert.equal(climate.applySnapshot({ temperature_c: 20 }), true);
  assert.deepEqual(climate.snapshot, {
    temperatureC: 20,
    command: { status: 'idle', requestedTemperatureC: null, detail: null },
  });
  assert.equal(climate.applySnapshot({ temperature_c: 20 }), false);
});

test('l événement climat réconcilie l état observé', () => {
  const climate = new ClimateState();
  climate.applySnapshot({ temperature_c: 20 });
  climate.markCommandPending(23.5);
  climate.markCommandSucceeded(23.5);

  assert.equal(climate.snapshot.temperatureC, 20);
  assert.equal(climate.applyRadomeEvent(CLIMATE_TEMPERATURE_EVENT, { temperature_c: 23.5 }), true);
  assert.equal(climate.snapshot.temperatureC, 23.5);
});

test('un refus conserve la température observée', () => {
  const climate = new ClimateState();
  climate.applySnapshot({ temperature_c: 19 });
  climate.markCommandPending(25);
  climate.markCommandFailed(25, new Error('temperature_c_out_of_range'));

  assert.equal(climate.snapshot.temperatureC, 19);
  assert.deepEqual(climate.snapshot.command, {
    status: 'failed',
    requestedTemperatureC: 25,
    detail: 'temperature_c_out_of_range',
  });
});
