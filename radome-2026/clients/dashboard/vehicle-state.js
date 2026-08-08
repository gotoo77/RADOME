export const VEHICLE_TELEMETRY = Object.freeze({
  speed: Object.freeze({ name: 'vehicle.speed_changed', key: 'speed_kmh' }),
  engineRpm: Object.freeze({ name: 'vehicle.engine_rpm_changed', key: 'engine_rpm' }),
});

export class VehicleState extends EventTarget {
  #state = {
    speedKmh: null,
    engineRpm: null,
  };

  get snapshot() {
    return { ...this.#state };
  }

  applyRadomeEvent(name, data) {
    switch (name) {
      case VEHICLE_TELEMETRY.speed.name: {
        const value = parseNumericPayload(data, VEHICLE_TELEMETRY.speed.key);
        return value === null ? false : this.#update('speedKmh', value);
      }
      case VEHICLE_TELEMETRY.engineRpm.name: {
        const value = parseNumericPayload(data, VEHICLE_TELEMETRY.engineRpm.key);
        return value === null ? false : this.#update('engineRpm', value);
      }
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

export function parseNumericPayload(data, expectedKey) {
  if (typeof data !== 'string') return null;
  const parts = data.split('=');
  if (parts.length !== 2) return null;
  const [key, rawValue] = parts;
  if (key !== expectedKey || !rawValue) return null;
  const value = Number(rawValue);
  return Number.isInteger(value) && value >= 0 && value <= 65535 ? value : null;
}
