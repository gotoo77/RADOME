import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

test('le cockpit normal contient véhicule média et emplacement climat', () => {
  const operationalStart = html.indexOf('<div class="operational-cockpit"');
  const diagnosticStart = html.indexOf('<section id="diagnostic-panel"');
  assert.ok(operationalStart >= 0);
  assert.ok(diagnosticStart > operationalStart);

  const operational = html.slice(operationalStart, diagnosticStart);
  assert.match(operational, /id="vehicle-display"/);
  assert.match(operational, /id="media-player"/);
  assert.match(operational, /id="operational-secondary"/);
  assert.doesNotMatch(operational, /record-start|record-stop|replay-file|diagnostic-session/);
});

test('les outils techniques sont cachés dans un panneau diagnostic dédié', () => {
  assert.match(html, /id="diagnostic-panel"[^>]*hidden/);
  assert.match(html, /id="diagnostic-toggle"[^>]*aria-controls="diagnostic-panel"/);
  assert.match(html, /id="diagnostic-session"/);
  assert.match(html, /id="diagnostic-capabilities"/);
  assert.match(html, /id="diagnostic-last-event"/);
  assert.match(html, /id="diagnostic-error"/);
  assert.match(html, /id="record-start"/);
  assert.match(html, /id="replay-file"/);
});

test('la composition prévoit desktop et écran embarqué étroit', () => {
  assert.match(html, /grid-template-columns: minmax\(0, 1\.35fr\) minmax\(360px, \.65fr\)/);
  assert.match(html, /@media \(max-width: 1120px\)/);
  assert.match(html, /@media \(max-width: 760px\)/);
});
