export class DashboardView {
  constructor(root = document) {
    this.status = root.querySelector('#status');
    this.speed = root.querySelector('#speed');
    this.rpm = root.querySelector('#rpm');
  }

  renderVehicle(state) {
    this.speed.textContent = formatValue(state.speedKmh, '--');
    this.rpm.textContent = formatValue(state.engineRpm, '----');
  }

  renderStatus(status) {
    const labels = {
      connected: 'RADOME connecté',
      handshake: 'connexion…',
      disconnected: 'déconnecté',
    };
    this.status.textContent = labels[status] ?? status;
    this.status.dataset.state = status;
  }

  renderError(error) {
    this.status.textContent = `erreur: ${error.message}`;
    this.status.dataset.state = 'error';
  }
}

function formatValue(value, fallback) {
  return Number.isFinite(value) ? String(Math.round(value)) : fallback;
}
