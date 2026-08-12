import { RadomeClient } from '../sdk/radome-client.js';
import { VehicleState } from './vehicle-state.js';
import { VehicleTelemetryHealth } from './vehicle-telemetry-health.js';
import { InfotainmentState, MEDIA_STATE_EVENTS } from './infotainment-state.js';
import { ClimateState, CLIMATE_TEMPERATURE_EVENT } from './climate-state.js';
import { mountClimateControl } from './climate-control-view.js';
import { DashboardView } from './dashboard-view.js';

export function createDashboardApp({
  url,
  clientId = 'dashboard-web',
  role = 'driver-display',
  capabilities = ['display', 'touch'],
  supportedCapabilities = ['media.control', 'climate.control'],
  vehicleTelemetryStaleAfterMs = 3_000,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  root = document,
} = {}) {
  const vehicle = new VehicleState();
  const vehicleHealth = new VehicleTelemetryHealth({ staleAfterMs: vehicleTelemetryStaleAfterMs });
  const infotainment = new InfotainmentState();
  const climate = new ClimateState();
  const climateView = mountClimateControl(root);
  const view = new DashboardView(root);
  const client = new RadomeClient({
    url,
    clientId,
    role,
    capabilities,
    supportedCapabilities,
  });
  const sendMediaCommand = createMediaCommandExecutor({ client, infotainment });
  const sendClimateCommand = createClimateCommandExecutor({ client, climate });
  let healthTimer = null;
  let connectionStatus = 'disconnected';

  const renderHealth = () => view.renderVehicleHealth(vehicleHealth.snapshot);
  const cancelHealthTimer = () => {
    if (healthTimer !== null) {
      clearTimer(healthTimer);
      healthTimer = null;
    }
  };
  const scheduleHealthExpiry = () => {
    cancelHealthTimer();
    healthTimer = setTimer(() => {
      healthTimer = null;
      renderHealth();
    }, vehicleTelemetryStaleAfterMs + 1);
  };
  const applyVehicleEvent = (name, data) => {
    vehicleHealth.noteTelemetry();
    renderHealth();
    scheduleHealthExpiry();
    return vehicle.applyRadomeEvent(name, data);
  };
  const setVehicleTelemetryConnectionStatus = status => {
    if (status === 'reconnecting' || status === 'disconnected') {
      vehicleHealth.reset();
      cancelHealthTimer();
    }
    vehicleHealth.setConnectionStatus(status);
    renderHealth();
  };
  const refreshClimateAvailability = () => {
    climateView.setAvailability({
      operational: connectionStatus === 'connected',
      commandAvailable: client.hasCommand('climate.set_temperature'),
    });
  };

  vehicle.addEventListener('change', ({ detail }) => view.renderVehicle(detail));
  infotainment.addEventListener('change', ({ detail }) => view.renderInfotainment(detail));
  climate.addEventListener('change', ({ detail }) => climateView.render(detail));
  climateView.bindTemperatureRequest(temperatureC => {
    sendClimateCommand(temperatureC).catch(() => {
      // ClimateState conserve l'état serveur et expose le refus localement.
    });
  });

  client.on('status', status => {
    connectionStatus = status;
    view.renderStatus(status);
    setVehicleTelemetryConnectionStatus(status);
    refreshClimateAvailability();
  });
  client.on('discovery', refreshClimateAvailability);
  client.on('snapshot', snapshot => {
    infotainment.applySnapshot(snapshot?.media);
    climate.applySnapshot(snapshot?.climate);
  });
  client.on('event:vehicle.speed_changed', data => applyVehicleEvent('vehicle.speed_changed', data));
  client.on('event:vehicle.engine_rpm_changed', data => applyVehicleEvent('vehicle.engine_rpm_changed', data));

  for (const name of MEDIA_STATE_EVENTS) {
    client.on(`event:${name}`, data => infotainment.applyRadomeEvent(name, data));
  }
  for (const name of [
    'media.source_changed',
    'media.title_changed',
    'media.artist_changed',
    'media.playback_changed',
  ]) {
    client.on(`event:${name}`, data => infotainment.applyRadomeEvent(name, data));
  }
  client.on(`event:${CLIMATE_TEMPERATURE_EVENT}`, data => climate.applyRadomeEvent(CLIMATE_TEMPERATURE_EVENT, data));
  client.on('error', error => view.renderError(error));

  view.renderVehicle(vehicle.snapshot);
  view.renderInfotainment(infotainment.snapshot);
  climateView.render(climate.snapshot);
  refreshClimateAvailability();
  renderHealth();

  return {
    client,
    vehicle,
    vehicleHealth,
    infotainment,
    climate,
    climateView,
    view,
    applyVehicleEvent,
    setVehicleTelemetryConnectionStatus,
    sendMediaCommand,
    sendClimateCommand,
    play() { return sendMediaCommand('media.play'); },
    pause() { return sendMediaCommand('media.pause'); },
    togglePlayback() { return sendMediaCommand('media.toggle_playback'); },
    nextTrack() { return sendMediaCommand('media.next_track'); },
    previousTrack() { return sendMediaCommand('media.previous_track'); },
    volumeUp() { return sendMediaCommand('media.volume_up'); },
    volumeDown() { return sendMediaCommand('media.volume_down'); },
    setVolume(volume) { return sendMediaCommand('media.set_volume', { volume }); },
    setClimateTemperature(temperatureC) { return sendClimateCommand(temperatureC); },
    start() { client.connect(); },
    stop() {
      cancelHealthTimer();
      client.disconnect();
    },
  };
}

export function createMediaCommandExecutor({ client, infotainment }) {
  return async (name, data = null) => {
    infotainment.markCommandPending(name);
    try {
      const result = await client.sendCommand(name, data);
      infotainment.markCommandSucceeded(name);
      return result;
    } catch (error) {
      infotainment.markCommandFailed(name, error);
      throw error;
    }
  };
}

export function createClimateCommandExecutor({ client, climate }) {
  return async temperatureC => {
    climate.markCommandPending(temperatureC);
    try {
      const result = await client.sendCommand('climate.set_temperature', { temperature_c: temperatureC });
      climate.markCommandSucceeded(temperatureC);
      return result;
    } catch (error) {
      climate.markCommandFailed(temperatureC, error);
      throw error;
    }
  };
}
