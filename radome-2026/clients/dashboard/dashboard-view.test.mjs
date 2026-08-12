import assert from 'node:assert/strict';
import test from 'node:test';
import { DashboardView } from './dashboard-view.js';

function element() {
  return { textContent: '', dataset: {}, style: {}, value: '', disabled: false };
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
    ['#media-player', element()],
    ['#media-source', element()],
    ['#media-title', element()],
    ['#media-artist', element()],
    ['#media-playback', element()],
    ['#media-track', element()],
    ['#media-volume-value', element()],
    ['#media-volume', element()],
    ['#media-feedback', element()],
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

test('DashboardView rend le media player depuis l état serveur', () => {
  const root = fakeRoot();
  const view = new DashboardView(root);

  view.renderInfotainment({
    source: 'Bluetooth',
    title: 'Road to Nowhere',
    artist: 'Talking Heads',
    playing: true,
    volume: 64,
    trackIndex: 2,
    command: { status: 'idle', name: null, detail: null },
  });

  assert.equal(root.elements.get('#media-source').textContent, 'Bluetooth');
  assert.equal(root.elements.get('#media-title').textContent, 'Road to Nowhere');
  assert.equal(root.elements.get('#media-artist').textContent, 'Talking Heads');
  assert.equal(root.elements.get('#media-playback').textContent, 'LECTURE');
  assert.equal(root.elements.get('#media-playback').dataset.state, 'playing');
  assert.equal(root.elements.get('#media-track').textContent, 'PISTE 3');
  assert.equal(root.elements.get('#media-volume-value').textContent, '64');
  assert.equal(root.elements.get('#media-volume').value, '64');
  assert.equal(root.elements.get('#media-player').dataset.playback, 'playing');
  assert.equal(root.elements.get('#media-feedback').textContent, 'MÉDIA PRÊT');
});

test('DashboardView rend un état media inconnu sans inventer de valeur', () => {
  const root = fakeRoot();
  const view = new DashboardView(root);

  view.renderInfotainment({
    source: null,
    title: null,
    artist: null,
    playing: false,
    volume: null,
    trackIndex: null,
    command: { status: 'idle', name: null, detail: null },
  });

  assert.equal(root.elements.get('#media-source').textContent, 'RADOME MEDIA');
  assert.equal(root.elements.get('#media-title').textContent, 'Lecteur média');
  assert.equal(root.elements.get('#media-artist').textContent, 'Contrôle véhicule');
  assert.equal(root.elements.get('#media-track').textContent, 'PISTE —');
  assert.equal(root.elements.get('#media-volume-value').textContent, '--');
});

test('DashboardView rend le feedback pending succès et refus', () => {
  const root = fakeRoot();
  const view = new DashboardView(root);

  view.renderMediaCommand({ status: 'pending', name: 'media.next_track', detail: null });
  assert.equal(root.elements.get('#media-feedback').textContent, 'COMMANDE EN COURS · Suivant');
  assert.equal(root.elements.get('#media-player').dataset.command, 'pending');

  view.renderMediaCommand({ status: 'succeeded', name: 'media.volume_up', detail: null });
  assert.equal(root.elements.get('#media-feedback').textContent, 'COMMANDE ACCEPTÉE · Volume +');

  view.renderMediaCommand({ status: 'failed', name: 'media.set_volume', detail: 'volume_out_of_range' });
  assert.equal(root.elements.get('#media-feedback').textContent, 'COMMANDE REFUSÉE · volume_out_of_range');
  assert.equal(root.elements.get('#media-feedback').dataset.state, 'failed');
});
