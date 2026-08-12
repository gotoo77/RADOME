import { CLIMATE_MAX_C, CLIMATE_MIN_C } from './climate-state.js';

const STYLE_ID = 'radome-climate-control-style';

export function mountClimateControl(root = document) {
  let section = root.querySelector('#climate-control');
  if (!section) {
    injectClimateStyles(root);
    section = root.createElement('section');
    section.id = 'climate-control';
    section.className = 'climate-control';
    section.dataset.command = 'idle';
    section.innerHTML = `
      <div class="climate-copy">
        <div class="climate-label">Climate Control</div>
        <div class="climate-temperature-row">
          <span id="climate-temperature" class="climate-temperature">--</span>
          <span class="climate-unit">°C</span>
        </div>
        <div class="climate-caption">Température habitacle</div>
      </div>
      <div class="climate-console">
        <div class="climate-target-head">
          <span>Consigne</span>
          <span><strong id="climate-target-value">--</strong> °C</span>
        </div>
        <div class="climate-controls">
          <button id="climate-down" class="climate-button" type="button" disabled aria-label="Baisser la température">−</button>
          <input id="climate-target" type="range" min="${CLIMATE_MIN_C}" max="${CLIMATE_MAX_C}" step="0.5" value="20" disabled aria-label="Régler la température">
          <button id="climate-up" class="climate-button" type="button" disabled aria-label="Monter la température">+</button>
        </div>
        <button id="climate-apply" class="climate-apply" type="button" disabled>Appliquer</button>
        <div id="climate-feedback" class="climate-feedback" data-state="idle" aria-live="polite">CLIMATISATION PRÊTE</div>
      </div>`;

    const operationalSecondary = root.querySelector('#operational-secondary');
    const tools = root.querySelector('.tools');
    const parent = operationalSecondary ?? tools?.parentNode ?? root.querySelector('main') ?? root.body;
    if (operationalSecondary) operationalSecondary.appendChild(section);
    else if (tools?.parentNode) tools.parentNode.insertBefore(section, tools);
    else parent?.appendChild(section);
  }
  return new ClimateControlView(root);
}

export class ClimateControlView {
  constructor(root = document) {
    this.root = root;
    this.section = root.querySelector('#climate-control');
    this.temperature = root.querySelector('#climate-temperature');
    this.target = root.querySelector('#climate-target');
    this.targetValue = root.querySelector('#climate-target-value');
    this.down = root.querySelector('#climate-down');
    this.up = root.querySelector('#climate-up');
    this.apply = root.querySelector('#climate-apply');
    this.feedback = root.querySelector('#climate-feedback');
    this.operational = false;
    this.commandAvailable = false;
    this.busy = false;
    this.requestHandler = null;

    this.target?.addEventListener('input', () => this.#renderTarget());
    this.down?.addEventListener('click', () => this.#adjust(-0.5));
    this.up?.addEventListener('click', () => this.#adjust(0.5));
    this.apply?.addEventListener('click', () => this.#request());
  }

  bindTemperatureRequest(handler) {
    this.requestHandler = handler;
  }

  setAvailability({ operational, commandAvailable }) {
    this.operational = Boolean(operational);
    this.commandAvailable = Boolean(commandAvailable);
    this.#refreshDisabledState();
  }

  render(state) {
    const temperatureC = finiteTemperature(state?.temperatureC);
    if (this.temperature) {
      this.temperature.textContent = temperatureC === null ? '--' : formatTemperature(temperatureC);
    }

    if (temperatureC !== null && this.target && !this.busy) {
      this.target.value = String(temperatureC);
      this.#renderTarget();
    }

    this.renderCommand(state?.command);
  }

  renderCommand(command = { status: 'idle', requestedTemperatureC: null, detail: null }) {
    const status = command?.status ?? 'idle';
    this.busy = status === 'pending';
    const requested = finiteTemperature(command?.requestedTemperatureC);
    const requestedLabel = requested === null ? '' : ` · ${formatTemperature(requested)} °C`;
    const messages = {
      idle: 'CLIMATISATION PRÊTE',
      pending: `RÉGLAGE EN COURS${requestedLabel}`,
      succeeded: `RÉGLAGE ACCEPTÉ${requestedLabel}`,
      failed: `RÉGLAGE REFUSÉ${command?.detail ? ` · ${command.detail}` : ''}`,
    };

    if (this.feedback) {
      this.feedback.textContent = messages[status] ?? status;
      this.feedback.dataset.state = status;
    }
    if (this.section) this.section.dataset.command = status;
    this.#refreshDisabledState();
  }

  #adjust(delta) {
    if (!this.target) return;
    const current = Number(this.target.value);
    const next = Math.max(CLIMATE_MIN_C, Math.min(CLIMATE_MAX_C, current + delta));
    this.target.value = String(next);
    this.#renderTarget();
  }

  #renderTarget() {
    if (!this.targetValue || !this.target) return;
    this.targetValue.textContent = formatTemperature(Number(this.target.value));
  }

  #request() {
    if (!this.requestHandler || !this.target || this.busy || !this.operational || !this.commandAvailable) return;
    const temperatureC = finiteTemperature(Number(this.target.value));
    if (temperatureC !== null) this.requestHandler(temperatureC);
  }

  #refreshDisabledState() {
    const disabled = this.busy || !this.operational || !this.commandAvailable;
    if (this.target) this.target.disabled = disabled;
    if (this.down) this.down.disabled = disabled;
    if (this.up) this.up.disabled = disabled;
    if (this.apply) this.apply.disabled = disabled;
  }
}

function finiteTemperature(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < CLIMATE_MIN_C || number > CLIMATE_MAX_C) return null;
  return number;
}

function formatTemperature(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function injectClimateStyles(root) {
  if (root.querySelector(`#${STYLE_ID}`)) return;
  const style = root.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .climate-control {
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(180px, .7fr) minmax(280px, 1.3fr);
      gap: clamp(1.25rem, 3vw, 2.5rem);
      align-items: center;
      padding: clamp(1.35rem, 2.5vw, 1.8rem);
      border: 1px solid #29323d;
      border-radius: 1.2rem;
      background: linear-gradient(120deg, rgba(116, 151, 184, .07), transparent 42%), #0e1319;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .025);
    }
    .climate-label, .climate-caption, .climate-target-head, .climate-feedback {
      text-transform: uppercase;
      letter-spacing: .12em;
    }
    .climate-label { color: #8c98a7; font-size: .68rem; margin-bottom: .9rem; }
    .climate-temperature-row { display: flex; align-items: baseline; gap: .55rem; }
    .climate-temperature { font-size: clamp(3.5rem, 7vw, 5.2rem); font-weight: 700; line-height: .9; font-variant-numeric: tabular-nums; }
    .climate-unit { color: #9ba7b5; font-size: 1rem; }
    .climate-caption { margin-top: .8rem; color: #5f6b79; font-size: .62rem; }
    .climate-console { display: grid; gap: .9rem; }
    .climate-target-head { display: flex; justify-content: space-between; gap: 1rem; color: #8591a0; font-size: .68rem; }
    .climate-target-head strong { color: #edf2f7; font-size: 1.15rem; font-variant-numeric: tabular-nums; }
    .climate-controls { display: grid; grid-template-columns: 3.6rem minmax(0, 1fr) 3.6rem; gap: .75rem; align-items: center; }
    .climate-button, .climate-apply {
      min-height: 3.5rem;
      border: 1px solid #3a4654;
      border-radius: .85rem;
      background: #171e27;
      color: #eef2f7;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
      touch-action: manipulation;
    }
    .climate-button { font-size: 1.5rem; }
    .climate-apply { background: #e7edf4; color: #0d1117; border-color: #e7edf4; }
    .climate-button:disabled, .climate-apply:disabled, #climate-target:disabled { opacity: .35; cursor: default; }
    #climate-target { width: 100%; accent-color: #b3c9dc; cursor: pointer; }
    .climate-feedback { min-height: 1rem; color: #737f8d; font-size: .64rem; }
    .climate-feedback[data-state="pending"] { color: #9eb5cf; }
    .climate-feedback[data-state="succeeded"] { color: #93c6a9; }
    .climate-feedback[data-state="failed"] { color: #d49b9b; }
    .climate-control[data-command="pending"] { border-color: #43546a; }
    @media (max-width: 760px) {
      .climate-control { grid-template-columns: 1fr; }
      .climate-temperature { font-size: clamp(4.6rem, 22vw, 7rem); }
      .climate-button, .climate-apply { min-height: 4rem; }
    }`;
  (root.head ?? root.querySelector('head'))?.appendChild(style);
}
