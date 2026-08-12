import assert from 'node:assert/strict';
import test from 'node:test';
import { ClimateControlView } from './climate-control-view.js';

function element(value = '') {
  const listeners = new Map();
  return {
    textContent: '',
    dataset: {},
    value,
    disabled: false,
    addEventListener(type, listener) { listeners.set(type, listener); },
    emit(type) { listeners.get(type)?.(); },
  };
}

function fakeRoot() {
  const elements = new Map([
    ['#climate-control', element()],
    ['#climate-temperature', element()],
    ['#climate-target', element('20')],
    ['#climate-target-value', element()],
    ['#climate-down', element()],
    ['#climate-up', element()],
    ['#climate-apply', element()],
    ['#climate-feedback', element()],
  ]);
  return {
    elements,
    querySelector(selector) { return elements.get(selector) ?? null; },
  };
}

test('ClimateControlView rend l état serveur sans inventer de température', () => {
  const root = fakeRoot();
  const view = new ClimateControlView(root);

  view.render({ temperatureC: null, command: { status: 'idle' } });
  assert.equal(root.elements.get('#climate-temperature').textContent, '--');

  view.render({ temperatureC: 21.5, command: { status: 'idle' } });
  assert.equal(root.elements.get('#climate-temperature').textContent, '21.5');
  assert.equal(root.elements.get('#climate-target').value, '21.5');
  assert.equal(root.elements.get('#climate-target-value').textContent, '21.5');
});

test('ClimateControlView active les contrôles seulement si la commande est disponible', () => {
  const root = fakeRoot();
  const view = new ClimateControlView(root);

  view.setAvailability({ operational: false, commandAvailable: true });
  assert.equal(root.elements.get('#climate-apply').disabled, true);

  view.setAvailability({ operational: true, commandAvailable: false });
  assert.equal(root.elements.get('#climate-target').disabled, true);

  view.setAvailability({ operational: true, commandAvailable: true });
  assert.equal(root.elements.get('#climate-target').disabled, false);
  assert.equal(root.elements.get('#climate-apply').disabled, false);
});

test('ClimateControlView demande explicitement la consigne choisie', () => {
  const root = fakeRoot();
  const view = new ClimateControlView(root);
  const requested = [];
  view.bindTemperatureRequest(value => requested.push(value));
  view.setAvailability({ operational: true, commandAvailable: true });

  root.elements.get('#climate-target').value = '24.5';
  root.elements.get('#climate-target').emit('input');
  root.elements.get('#climate-apply').emit('click');

  assert.equal(root.elements.get('#climate-target-value').textContent, '24.5');
  assert.deepEqual(requested, [24.5]);
});

test('ClimateControlView bloque une nouvelle commande pendant pending', () => {
  const root = fakeRoot();
  const view = new ClimateControlView(root);
  view.setAvailability({ operational: true, commandAvailable: true });
  view.renderCommand({ status: 'pending', requestedTemperatureC: 22, detail: null });

  assert.equal(root.elements.get('#climate-control').dataset.command, 'pending');
  assert.equal(root.elements.get('#climate-apply').disabled, true);
  assert.match(root.elements.get('#climate-feedback').textContent, /22 °C/);
});
