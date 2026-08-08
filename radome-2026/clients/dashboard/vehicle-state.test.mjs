import assert from 'node:assert/strict';
import test from 'node:test';
import { VehicleState, parseNumericPayload } from './vehicle-state.js';

test('parseNumericPayload accepte le format historique cle=valeur', () => {
  assert.equal(parseNumericPayload('speed_kmh=90'), 90);
  assert.equal(parseNumericPayload('engine_rpm=2450'), 2450);
});

test('parseNumericPayload accepte aussi une valeur numerique directe', () => {
  assert.equal(parseNumericPayload(42), 42);
  assert.equal(parseNumericPayload('12.5'), 12.5);
});

test('parseNumericPayload rejette les donnees non numeriques', () => {
  assert.equal(parseNumericPayload('speed_kmh=oops'), null);
  assert.equal(parseNumericPayload(undefined), null);
});

test('VehicleState applique les evenements RADOME connus', () => {
  const vehicle = new VehicleState();
  assert.equal(vehicle.applyRadomeEvent('vehicle.speed_changed', 'speed_kmh=90'), true);
  assert.equal(vehicle.applyRadomeEvent('vehicle.engine_rpm_changed', 'engine_rpm=2450'), true);
  assert.deepEqual(vehicle.snapshot, { speedKmh: 90, engineRpm: 2450 });
});

test('VehicleState ignore les evenements inconnus et invalides', () => {
  const vehicle = new VehicleState();
  assert.equal(vehicle.applyRadomeEvent('vehicle.unknown', 'value=12'), false);
  assert.equal(vehicle.applyRadomeEvent('vehicle.speed_changed', 'speed_kmh=nope'), false);
  assert.deepEqual(vehicle.snapshot, { speedKmh: null, engineRpm: null });
});

test('VehicleState emet change uniquement lorsque la valeur change', () => {
  const vehicle = new VehicleState();
  const changes = [];
  vehicle.addEventListener('change', event => changes.push(event.detail));

  assert.equal(vehicle.applyRadomeEvent('vehicle.speed_changed', 'speed_kmh=50'), true);
  assert.equal(vehicle.applyRadomeEvent('vehicle.speed_changed', 'speed_kmh=50'), false);
  assert.equal(vehicle.applyRadomeEvent('vehicle.speed_changed', 'speed_kmh=51'), true);

  assert.deepEqual(changes, [
    { speedKmh: 50, engineRpm: null },
    { speedKmh: 51, engineRpm: null },
  ]);
});
