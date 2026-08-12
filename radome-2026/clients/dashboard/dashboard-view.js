export class DashboardView {
  constructor(root = document) {
    this.status = root.querySelector('#status');
    this.vehicleDisplay = root.querySelector('#vehicle-display');
    this.vehicleHealth = root.querySelector('#vehicle-health');
    this.speed = root.querySelector('#speed');
    this.speedBar = root.querySelector('#speed-bar');
    this.rpm = root.querySelector('#rpm');
    this.rpmBar = root.querySelector('#rpm-bar');
    this.mediaSource = root.querySelector('#media-source');
    this.mediaTitle = root.querySelector('#media-title');
    this.mediaArtist = root.querySelector('#media-artist');
    this.mediaPlayback = root.querySelector('#media-playback');
  }

  renderVehicle(state) {
    const speed = numericValue(state.speedKmh);
    const rpm = numericValue(state.engineRpm);

    this.speed.textContent = speed === null ? '--' : String(Math.round(speed));
    this.rpm.textContent = rpm === null ? '----' : String(Math.round(rpm));

    if (this.speedBar) this.speedBar.style.width = `${progress(speed, 240)}%`;
    if (this.rpmBar) this.rpmBar.style.width = `${progress(rpm, 8_000)}%`;
    if (this.vehicleDisplay) {
      this.vehicleDisplay.dataset.motion = speed !== null && speed > 0 ? 'moving' : 'stationary';
    }
  }

  renderVehicleHealth(health) {
    const labels = {
      live: 'TÉLÉMÉTRIE ACTIVE',
      waiting: 'EN ATTENTE DE TÉLÉMÉTRIE',
      stale: 'TÉLÉMÉTRIE INTERROMPUE',
      offline: 'SOURCE VÉHICULE HORS LIGNE',
    };
    if (this.vehicleHealth) {
      this.vehicleHealth.textContent = labels[health.state] ?? health.state;
      this.vehicleHealth.dataset.state = health.state;
    }
    if (this.vehicleDisplay) this.vehicleDisplay.dataset.telemetry = health.state;
  }

  renderInfotainment(state) {
    this.mediaSource.textContent = state.source ?? 'Aucune source';
    this.mediaTitle.textContent = state.title ?? 'Aucun média';
    this.mediaArtist.textContent = state.artist ?? '—';
    this.mediaPlayback.textContent = state.playing ? 'LECTURE' : 'PAUSE';
    this.mediaPlayback.dataset.state = state.playing ? 'playing' : 'paused';
  }

  renderStatus(status) {
    const labels = {
      connecting: 'connexion…',
      handshake: 'hello…',
      discovering: 'discovery…',
      announcing_capabilities: 'capabilities…',
      synchronizing: 'synchronisation…',
      connected: 'RADOME connecté',
      reconnecting: 'reconnexion…',
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

function numericValue(value) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function progress(value, maximum) {
  if (value === null) return 0;
  return Math.max(0, Math.min(100, (value / maximum) * 100));
}
