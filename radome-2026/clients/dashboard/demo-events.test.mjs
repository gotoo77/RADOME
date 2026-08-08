import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDemoEvent, DASHBOARD_DEMO_FRAMES } from './demo-events.js';
import { VehicleState } from './vehicle-state.js';

function recorder() {
  const calls = [];
  return {
    calls,
    applyRadomeEvent(name, data) {
      calls.push([name, data]);
      return true;
    },
  };
}

test('le scenario de demo contient une evolution temporelle', () => {
  assert.ok(DASHBOARD_DEMO_FRAMES.length >= 2);
  assert.equal(DASHBOARD_DEMO_FRAMES[0].afterMs, 0);
  assert.ok(DASHBOARD_DEMO_FRAMES.slice(1).every(frame => frame.afterMs > 0));
});

test('tous les evenements vehicule de la demo respectent le contrat', () => {
  const vehicle = new VehicleState();
  for (const frame of DASHBOARD_DEMO_FRAMES) {
    for (const [name, data] of frame.events.filter(([name]) => name.startsWith('vehicle.'))) {
      assert.equal(vehicle.applyRadomeEvent(name, data), true, `${name} ${data}`);
    }
  }
});

test('applyDemoEvent route vehicule et media vers leurs modeles', () => {
  const vehicle = recorder();
  const infotainment = recorder();
  const app = { vehicle, infotainment };

  assert.equal(applyDemoEvent(app, 'vehicle.speed_changed', 'speed_kmh=42'), true);
  assert.equal(applyDemoEvent(app, 'media.title_changed', 'title=Test'), true);
  assert.equal(applyDemoEvent(app, 'unknown.event', 'x'), false);

  assert.deepEqual(vehicle.calls, [['vehicle.speed_changed', 'speed_kmh=42']]);
  assert.deepEqual(infotainment.calls, [['media.title_changed', 'title=Test']]);
});
