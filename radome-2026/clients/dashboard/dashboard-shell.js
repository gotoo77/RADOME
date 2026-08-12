const CONNECTION_STATES = {
  connecting: 'connecting',
  handshake: 'connecting',
  discovering: 'connecting',
  announcing_capabilities: 'connecting',
  synchronizing: 'connecting',
  connected: 'online',
  reconnecting: 'degraded',
  disconnected: 'offline',
};

export class DashboardShell {
  constructor(root = document) {
    this.root = root;
    this.shell = root.querySelector('#cockpit-shell');
    this.diagnosticPanel = root.querySelector('#diagnostic-panel');
    this.diagnosticToggle = root.querySelector('#diagnostic-toggle');
    this.session = root.querySelector('#diagnostic-session');
    this.capabilities = root.querySelector('#diagnostic-capabilities');
    this.lastEvent = root.querySelector('#diagnostic-last-event');
    this.lastError = root.querySelector('#diagnostic-error');

    this.diagnosticToggle?.addEventListener('click', () => this.toggleDiagnostic());
  }

  setConnectionStatus(status) {
    const state = CONNECTION_STATES[status] ?? status ?? 'offline';
    if (this.shell) this.shell.dataset.connection = state;
  }

  setMode(mode) {
    if (this.shell) this.shell.dataset.mode = mode || 'live';
  }

  setDiagnosticVisible(visible) {
    const next = Boolean(visible);
    if (this.diagnosticPanel) this.diagnosticPanel.hidden = !next;
    if (this.diagnosticToggle) {
      this.diagnosticToggle.setAttribute('aria-expanded', String(next));
      this.diagnosticToggle.textContent = next ? 'Fermer diagnostic' : 'Diagnostic';
    }
    if (this.shell) this.shell.dataset.diagnostic = next ? 'open' : 'closed';
  }

  toggleDiagnostic() {
    this.setDiagnosticVisible(this.diagnosticPanel?.hidden ?? true);
  }

  renderSession(sessionId) {
    if (this.session) this.session.textContent = sessionId || '—';
  }

  renderDiscovery(discovery) {
    if (!this.capabilities) return;
    const capabilities = Array.isArray(discovery?.capabilities) ? discovery.capabilities : [];
    const commands = Array.isArray(discovery?.commands) ? discovery.commands : [];
    this.capabilities.textContent = `${capabilities.length} capability(s) · ${commands.length} commande(s)`;
  }

  renderEvent(event) {
    if (!this.lastEvent) return;
    const name = event?.name ?? 'event';
    this.lastEvent.textContent = name;
  }

  renderError(error) {
    if (this.shell) this.shell.dataset.connection = 'error';
    if (this.lastError) this.lastError.textContent = error?.message ?? String(error ?? 'erreur inconnue');
  }
}
