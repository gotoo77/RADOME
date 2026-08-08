import assert from 'node:assert/strict';
import test from 'node:test';
import { DashboardView } from './dashboard-view.js';

function element() {
  return { textContent: '', dataset: {} };
}

function fakeRoot() {
  const elements = new Map([
    ['#status', element()],
    ['#speed', element()],
    ['#rpm', element()],
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
