export class VehicleState extends EventTarget {
  #state = {
    speedKmh: null,
    engineRpm: null,
  };

  get snapshot() {
    return { ...this.#state };
  }

  applyRadomeEvent(name, data) {
    const value = parseNumericPayload(data);
    if (value === null) return false;

    switch (name) {
      case 'vehicle.speed_changed':
        return this.#update('speedKmh', value);
      case 'vehicle.engine_rpm_changed':
        return this.#update('engineRpm', value);
      default:
        return false;
    }
  }

  #update(key, value) {
    if (this.#state[key] === value) return false;
    this.#state[key] = value;
    this.dispatchEvent(new CustomEvent('change', { detail: this.snapshot }));
    return true;
  }
}

export function parseNumericPayload(data) {
  const raw = String(data ?? '');
  const separator = raw.indexOf('=');
  const candidate = (separator >= 0 ? raw.slice(separator + 1) : raw).trim();
  if (!candidate) return null;
  const value = Number(candidate);
  return Number.isFinite(value) ? value : null;
}
