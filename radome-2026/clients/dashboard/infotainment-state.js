export class InfotainmentState extends EventTarget {
  #state = {
    source: null,
    title: null,
    artist: null,
    playing: false,
  };

  get snapshot() {
    return { ...this.#state };
  }

  applyRadomeEvent(type, payload) {
    const patch = parseInfotainmentEvent(type, payload);
    if (!patch) return false;

    const changed = Object.entries(patch).some(([key, value]) => this.#state[key] !== value);
    if (!changed) return false;

    this.#state = { ...this.#state, ...patch };
    this.dispatchEvent(new CustomEvent('change', { detail: this.snapshot }));
    return true;
  }
}

export function parseInfotainmentEvent(type, payload) {
  const value = parsePayload(payload);
  if (value === null) return null;

  switch (type) {
    case 'media.source_changed':
      return { source: value };
    case 'media.title_changed':
      return { title: value };
    case 'media.artist_changed':
      return { artist: value };
    case 'media.playback_changed': {
      const normalized = value.toLowerCase();
      if (['playing', 'play', 'true', '1'].includes(normalized)) return { playing: true };
      if (['paused', 'pause', 'stopped', 'stop', 'false', '0'].includes(normalized)) return { playing: false };
      return null;
    }
    default:
      return null;
  }
}

function parsePayload(payload) {
  if (typeof payload !== 'string') return null;
  const trimmed = payload.trim();
  if (!trimmed) return null;
  const separator = trimmed.indexOf('=');
  return (separator >= 0 ? trimmed.slice(separator + 1) : trimmed).trim() || null;
}
