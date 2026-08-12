import assert from 'node:assert/strict';
import test from 'node:test';
import { DashboardView } from './dashboard-view.js';

function element() {
  return { textContent: '', dataset: {}, style: {} };
}

function fakeRoot() {
  const elements = new Map([
    ['#status', element()],
    ['#vehicle-display', element()],
    ['#vehicle-health', element()],
    ['#speed', element()],
    ['#speed-bar', element()],
    ['#rpm', element()],
    ['#rpm-bar', element()],
    ['#media-source', element()],
    ['#media-title', element()],
    ['#media-artist', element()],
    ['#media-playback', element()],
  ]);
  return {
    elements,
    querySelector(selector) { return elements.get(selector); },
  };
}

test('DashboardView rend les métriques véhicule et leurs progressions', () => {
  const root = fakeRoot();
  const view = new DashboardView(root);

  view.renderVehicle({ speedKmh: 120, engineRpm: 4_000 });

  assert.equal(root.elements.get('#speed').textContent, '120');
  assert.equal(root.elements.get('#rpm').textContent, '4000');
  assert.equal(root.elements.get('#speed-bar').style.width, '50%');
  assert.equal(root.elements.get('#rpm-bar').style.width, '50%');
  assert.equal(root.elements.get('#vehicle-display').dataset.motion, 'moving');
});

test('DashboardView rend explicitement les valeurs véhicule absentes', () => {
  const root = fakeRoot();
  const view = new DashboardView(root);

  view.renderVehicle({ speedKmh: null, engineRpm: null });

  assert.equal(root.elements.get('#speed').textContent, '--');
  assert.equal(root.elements.get('#rpm').textContent, '----');
  assert.equal(root.elements.get('#speed-bar').style.width, '0%');
  assert.equal(root.elements.get('#rpm-bar').style.width, '0%');
  assert.equal(root.elements.get('#vehicle-display').dataset.motion, 'stationary');
});

test('DashboardView rend les états de fraîcheur de télémétrie', () => {
  const root = fakeRoot();
  const view = new DashboardView(root);

  view.renderVehicleHealth({ state: 'live' });
  assert.equal(root.elements.get('#vehicle-health').textContent, 'TÉLÉMÉTRIE ACTIVE');
  assert.equal(root.elements.get('#vehicle-display').dataset.telemetry, 'live');

  view.renderVehicleHealth({ state: 'stale' });
  assert.equal(root.elements.get('#vehicle-health').textContent, 'TÉLÉMÉTRIE INTERROMPUE');
  assert.equal(root.elements.get('#vehicle-health').dataset.state, 'stale');
});

test('DashboardView rend le panneau infotainment', () => {
  const root = fakeRoot();
  const view = new DashboardView(root);

  view.renderInfotainment({
    source: 'Bluetooth',
    title: 'Road to Nowhere',
    artist: 'Talking Heads',
    playing: true,
  });

  assert.equal(root.elements.get('#media-source').textContent, 'Bluetooth');
  assert.equal(root.elements.get('#media-title').textContent, 'Road to Nowhere');
  assert.equal(root.elements.get('#media-artist').textContent, 'Talking Heads');
  assert.equal(root.elements.get('#media-playback').textContent, 'LECTURE');
  assert.equal(root.elements.get('#media-playback').dataset.state, 'playing');
});

test('DashboardView rend un etat media vide sans undefined', () => {
  const root = fakeRoot();
  const view = new DashboardView(root);

  view.renderInfotainment({ source: null, title: null, artist: null, playing: false });

  assert.equal(root.elements.get('#media-source').textContent, 'Aucune source');
  assert.equal(root.elements.get('#media-title').textContent, 'Aucun média');
  assert.equal(root.elements.get('#media-artist').textContent, '—');
  assert.equal(root.elements.get('#media-playback').textContent, 'PAUSE');
  assert.equal(root.elements.get('#media-playback').dataset.state, 'paused');
});
