import assert from 'node:assert/strict';
import test from 'node:test';
import { DashboardShell } from './dashboard-shell.js';

function element() {
  return {
    dataset: {},
    hidden: false,
    textContent: '',
    attributes: new Map(),
    listeners: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); },
    addEventListener(type, listener) { this.listeners.set(type, listener); },
  };
}

function fakeRoot() {
  const elements = new Map([
    ['#cockpit-shell', element()],
    ['#diagnostic-panel', element()],
    ['#diagnostic-toggle', element()],
    ['#diagnostic-session', element()],
    ['#diagnostic-capabilities', element()],
    ['#diagnostic-last-event', element()],
    ['#diagnostic-error', element()],
  ]);
  elements.get('#diagnostic-panel').hidden = true;
  return {
    elements,
    querySelector(selector) { return elements.get(selector) ?? null; },
  };
}

test('DashboardShell distingue connexion normale et état dégradé', () => {
  const root = fakeRoot();
  const shell = new DashboardShell(root);

  shell.setConnectionStatus('connected');
  assert.equal(root.elements.get('#cockpit-shell').dataset.connection, 'online');

  shell.setConnectionStatus('reconnecting');
  assert.equal(root.elements.get('#cockpit-shell').dataset.connection, 'degraded');

  shell.setConnectionStatus('disconnected');
  assert.equal(root.elements.get('#cockpit-shell').dataset.connection, 'offline');
});

test('le diagnostic reste séparé et explicitement ouvrable', () => {
  const root = fakeRoot();
  const shell = new DashboardShell(root);

  shell.setDiagnosticVisible(true);
  assert.equal(root.elements.get('#diagnostic-panel').hidden, false);
  assert.equal(root.elements.get('#diagnostic-toggle').attributes.get('aria-expanded'), 'true');
  assert.equal(root.elements.get('#cockpit-shell').dataset.diagnostic, 'open');

  shell.toggleDiagnostic();
  assert.equal(root.elements.get('#diagnostic-panel').hidden, true);
  assert.equal(root.elements.get('#cockpit-shell').dataset.diagnostic, 'closed');
});

test('le panneau diagnostic résume le protocole sans polluer le cockpit', () => {
  const root = fakeRoot();
  const shell = new DashboardShell(root);

  shell.renderSession('session-42');
  shell.renderDiscovery({ capabilities: ['media.control', 'climate.control'], commands: [{}, {}, {}] });
  shell.renderEvent({ name: 'vehicle.speed_changed' });
  shell.renderError(new Error('socket down'));

  assert.equal(root.elements.get('#diagnostic-session').textContent, 'session-42');
  assert.equal(root.elements.get('#diagnostic-capabilities').textContent, '2 capability(s) · 3 commande(s)');
  assert.equal(root.elements.get('#diagnostic-last-event').textContent, 'vehicle.speed_changed');
  assert.equal(root.elements.get('#diagnostic-error').textContent, 'socket down');
  assert.equal(root.elements.get('#cockpit-shell').dataset.connection, 'error');
});
