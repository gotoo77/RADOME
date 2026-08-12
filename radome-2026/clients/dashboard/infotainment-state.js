export const MEDIA_STATE_EVENTS = Object.freeze([
  'media.playback_started',
  'media.playback_paused',
  'media.playback_toggled',
  'media.next_track_requested',
  'media.previous_track_requested',
  'media.volume_up_requested',
  'media.volume_down_requested',
  'media.volume_changed',
]);

export class InfotainmentState extends EventTarget {
  #state = {
    source: null,
    title: null,
    artist: null,
    playing: false,
    volume: null,
    trackIndex: null,
    command: {
      status: 'idle',
      name: null,
      detail: null,
    },
  };

  get snapshot() {
    return {
      ...this.#state,
      command: { ...this.#state.command },
    };
  }

  applySnapshot(snapshot) {
    const patch = parseMediaState(snapshot);
    return patch ? this.#applyPatch(patch) : false;
  }

  applyRadomeEvent(type, payload) {
    if (MEDIA_STATE_EVENTS.includes(type)) {
      const patch = parseMediaState(payload);
      return patch ? this.#applyPatch(patch) : false;
    }

    const patch = parseInfotainmentEvent(type, payload);
    return patch ? this.#applyPatch(patch) : false;
  }

  markCommandPending(name) {
    return this.#setCommand({ status: 'pending', name, detail: null });
  }

  markCommandSucceeded(name) {
    return this.#setCommand({ status: 'succeeded', name, detail: null });
  }

  markCommandFailed(name, error) {
    const detail = error instanceof Error ? error.message : String(error ?? 'commande refusée');
    return this.#setCommand({ status: 'failed', name, detail });
  }

  clearCommandFeedback() {
    return this.#setCommand({ status: 'idle', name: null, detail: null });
  }

  #setCommand(command) {
    const previous = this.#state.command;
    if (
      previous.status === command.status
      && previous.name === command.name
      && previous.detail === command.detail
    ) return false;

    this.#state = { ...this.#state, command };
    this.#emitChange();
    return true;
  }

  #applyPatch(patch) {
    const changed = Object.entries(patch).some(([key, value]) => this.#state[key] !== value);
    if (!changed) return false;

    this.#state = { ...this.#state, ...patch };
    this.#emitChange();
    return true;
  }

  #emitChange() {
    this.dispatchEvent(new CustomEvent('change', { detail: this.snapshot }));
  }
}

export function parseMediaState(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const patch = {};
  if ('playback' in payload) {
    if (payload.playback === 'playing') patch.playing = true;
    else if (payload.playback === 'paused') patch.playing = false;
    else return null;
  }
  if ('volume' in payload) {
    if (!Number.isInteger(payload.volume) || payload.volume < 0 || payload.volume > 100) return null;
    patch.volume = payload.volume;
  }
  if ('track_index' in payload) {
    if (!Number.isInteger(payload.track_index) || payload.track_index < 0) return null;
    patch.trackIndex = payload.track_index;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export function parseInfotainmentEvent(type, payload) {
  const value = parsePayload(payload);
  if (value === null) return null;

  switch (type) {
    case 'media.source_changed': return { source: value };
    case 'media.title_changed': return { title: value };
    case 'media.artist_changed': return { artist: value };
    case 'media.playback_changed': {
      const normalized = value.toLowerCase();
      if (['playing', 'play', 'true', '1'].includes(normalized)) return { playing: true };
      if (['paused', 'pause', 'stopped', 'stop', 'false', '0'].includes(normalized)) return { playing: false };
      return null;
    }
    default: return null;
  }
}

function parsePayload(payload) {
  if (typeof payload !== 'string') return null;
  const trimmed = payload.trim();
  if (!trimmed) return null;
  const separator = trimmed.indexOf('=');
  return (separator >= 0 ? trimmed.slice(separator + 1) : trimmed).trim() || null;
}
