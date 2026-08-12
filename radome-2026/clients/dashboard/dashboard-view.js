export class DashboardView {
  constructor(root = document) {
    this.status = root.querySelector('#status');
    this.vehicleDisplay = root.querySelector('#vehicle-display');
    this.vehicleHealth = root.querySelector('#vehicle-health');
    this.speed = root.querySelector('#speed');
    this.speedBar = root.querySelector('#speed-bar');
    this.rpm = root.querySelector('#rpm');
    this.rpmBar = root.querySelector('#rpm-bar');
    this.mediaPlayer = root.querySelector('#media-player');
    this.mediaSource = root.querySelector('#media-source');
    this.mediaTitle = root.querySelector('#media-title');
    this.mediaArtist = root.querySelector('#media-artist');
    this.mediaPlayback = root.querySelector('#media-playback');
    this.mediaTrack = root.querySelector('#media-track');
    this.mediaVolumeValue = root.querySelector('#media-volume-value');
    this.mediaVolume = root.querySelector('#media-volume');
    this.mediaFeedback = root.querySelector('#media-feedback');
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
    this.mediaSource.textContent = state.source ?? 'RADOME MEDIA';
    this.mediaTitle.textContent = state.title ?? 'Lecteur média';
    this.mediaArtist.textContent = state.artist ?? 'Contrôle véhicule';
    this.mediaPlayback.textContent = state.playing ? 'LECTURE' : 'PAUSE';
    this.mediaPlayback.dataset.state = state.playing ? 'playing' : 'paused';

    const trackIndex = Number.isInteger(state.trackIndex) && state.trackIndex >= 0
      ? state.trackIndex
      : null;
    const volume = Number.isInteger(state.volume) && state.volume >= 0 && state.volume <= 100
      ? state.volume
      : null;

    if (this.mediaTrack) {
      this.mediaTrack.textContent = trackIndex === null ? 'PISTE —' : `PISTE ${trackIndex + 1}`;
    }
    if (this.mediaVolumeValue) {
      this.mediaVolumeValue.textContent = volume === null ? '--' : String(volume);
    }
    if (this.mediaVolume && volume !== null) {
      this.mediaVolume.value = String(volume);
    }
    if (this.mediaPlayer) {
      this.mediaPlayer.dataset.playback = state.playing ? 'playing' : 'paused';
    }

    this.renderMediaCommand(state.command ?? { status: 'idle', name: null, detail: null });
  }

  renderMediaCommand(command) {
    const status = command?.status ?? 'idle';
    const label = mediaCommandLabel(command?.name);
    const messages = {
      idle: 'MÉDIA PRÊT',
      pending: `COMMANDE EN COURS${label ? ` · ${label}` : ''}`,
      succeeded: `COMMANDE ACCEPTÉE${label ? ` · ${label}` : ''}`,
      failed: `COMMANDE REFUSÉE${command?.detail ? ` · ${command.detail}` : ''}`,
    };

    if (this.mediaFeedback) {
      this.mediaFeedback.textContent = messages[status] ?? status;
      this.mediaFeedback.dataset.state = status;
    }
    if (this.mediaPlayer) this.mediaPlayer.dataset.command = status;
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

function mediaCommandLabel(name) {
  const labels = {
    'media.play': 'Lecture',
    'media.pause': 'Pause',
    'media.toggle_playback': 'Lecture / pause',
    'media.next_track': 'Suivant',
    'media.previous_track': 'Précédent',
    'media.volume_up': 'Volume +',
    'media.volume_down': 'Volume −',
    'media.set_volume': 'Volume',
  };
  return labels[name] ?? name ?? '';
}

function numericValue(value) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function progress(value, maximum) {
  if (value === null) return 0;
  return Math.max(0, Math.min(100, (value / maximum) * 100));
}
