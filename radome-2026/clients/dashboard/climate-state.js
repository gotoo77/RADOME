export const CLIMATE_TEMPERATURE_EVENT = 'climate.temperature_changed';
export const CLIMATE_MIN_C = 16;
export const CLIMATE_MAX_C = 30;

const idleCommand = () => ({
  status: 'idle',
  requestedTemperatureC: null,
  detail: null,
});

export class ClimateState extends EventTarget {
  #state = {
    temperatureC: null,
    command: idleCommand(),
  };

  get snapshot() {
    return {
      temperatureC: this.#state.temperatureC,
      command: { ...this.#state.command },
    };
  }

  applySnapshot(snapshot) {
    const parsed = parseClimateState(snapshot);
    if (!parsed) return false;
    return this.#replaceObserved(parsed.temperatureC);
  }

  applyRadomeEvent(name, data) {
    if (name !== CLIMATE_TEMPERATURE_EVENT) return false;
    const parsed = parseClimateState(data);
    if (!parsed) return false;
    return this.#replaceObserved(parsed.temperatureC);
  }

  markCommandPending(temperatureC) {
    this.#setCommand('pending', temperatureC, null);
  }

  markCommandSucceeded(temperatureC) {
    this.#setCommand('succeeded', temperatureC, null);
  }

  markCommandFailed(temperatureC, error) {
    this.#setCommand('failed', temperatureC, error?.message ?? String(error));
  }

  #replaceObserved(temperatureC) {
    if (this.#state.temperatureC === temperatureC) return false;
    this.#state = { ...this.#state, temperatureC };
    this.#emitChange();
    return true;
  }

  #setCommand(status, requestedTemperatureC, detail) {
    this.#state = {
      ...this.#state,
      command: { status, requestedTemperatureC, detail },
    };
    this.#emitChange();
  }

  #emitChange() {
    this.dispatchEvent(new CustomEvent('change', { detail: this.snapshot }));
  }
}

export function parseClimateState(value) {
  if (typeof value === 'string') {
    const match = /^temperature_c=(-?\d+(?:\.\d+)?)$/.exec(value.trim());
    if (!match) return null;
    value = { temperature_c: Number(match[1]) };
  }

  if (!value || typeof value !== 'object') return null;
  const temperatureC = Number(value.temperature_c);
  if (!Number.isFinite(temperatureC)) return null;
  if (temperatureC < CLIMATE_MIN_C || temperatureC > CLIMATE_MAX_C) return null;
  return { temperatureC };
}
