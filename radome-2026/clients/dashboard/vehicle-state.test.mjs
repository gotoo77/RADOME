import assert from 'node:assert/strict';
import test from 'node:test';
import { VehicleState, parseNumericPayload, VEHICLE_TELEMETRY } from './vehicle-state.js';

test('le contrat dashboard utilise les noms et cles canoniques', () => {
  assert.deepEqual(VEHICLE_TELEMETRY.speed, { name: 'vehicle.speed_changed', key: 'speed_kmh' });
  assert.deepEqual(VEHICLE_TELEMETRY.engineRpm, { name: 'vehicle.engine_rpm_changed', key: 'engine_rpm' });
});

test('parseNumericPayload exige la cle attendue et un u16', () => {
  assert.equal(parseNumericPayload('speed_kmh=90', 'speed_kmh'), 90);
  assert.equal(parseNumericPayload('speed=90', 'speed_kmh'), null);
  assert.equal(parseNumericPayload('90', 'speed_kmh'), null);
  assert.equal(parseNumericPayload('speed_kmh=12.5', 'speed_kmh'), null);
  assert.equal(parseNumericPayload('speed_kmh=-1', 'speed_kmh'), null);
  assert.equal(parseNumericPayload('speed_kmh=65536', 'speed_kmh'), null);
  assert.equal(parseNumericPayload('speed_kmh=', 'speed_kmh'), null);
  assert.equal(parseNumericPayload('speed_kmh=90=oops', 'speed_kmh'), null);
});

test('VehicleState applique les evenements RADOME conformes', () => {
  const vehicle = new VehicleState();
  assert.equal(vehicle.applyRadomeEvent('vehicle.speed_changed', 'speed_kmh=90'), true);
  assert.equal(vehicle.applyRadomeEvent('vehicle.engine_rpm_changed', 'engine_rpm=2450'), true);
  assert.deepEqual(vehicle.snapshot, { speedKmh: 90, engineRpm: 2450 });
});

test('VehicleState rejette les evenements inconnus ou non conformes', () => {
  const vehicle = new VehicleState();
  assert.equal(vehicle.applyRadomeEvent('vehicle.unknown', 'value=12'), false);
  assert.equal(vehicle.applyRadomeEvent('vehicle.speed_changed', 'speed=90'), false);
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
