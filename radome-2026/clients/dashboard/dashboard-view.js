export class DashboardView {
  constructor(root = document) {
    this.status = root.querySelector('#status');
    this.speed = root.querySelector('#speed');
    this.rpm = root.querySelector('#rpm');
    this.mediaSource = root.querySelector('#media-source');
    this.mediaTitle = root.querySelector('#media-title');
    this.mediaArtist = root.querySelector('#media-artist');
    this.mediaPlayback = root.querySelector('#media-playback');
  }

  renderVehicle(state) {
    this.speed.textContent = formatValue(state.speedKmh, '--');
    this.rpm.textContent = formatValue(state.engineRpm, '----');
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

function formatValue(value, fallback) {
  return Number.isFinite(value) ? String(Math.round(value)) : fallback;
}
