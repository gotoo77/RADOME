import { RadomeClient } from '../sdk/radome-client.js';
import { VehicleState } from './vehicle-state.js';
import { VehicleTelemetryHealth } from './vehicle-telemetry-health.js';
import { InfotainmentState, MEDIA_STATE_EVENTS } from './infotainment-state.js';
import { DashboardView } from './dashboard-view.js';

export function createDashboardApp({
  url,
  clientId = 'dashboard-web',
  role = 'driver-display',
  capabilities = ['display', 'touch'],
  supportedCapabilities = ['media.control'],
  vehicleTelemetryStaleAfterMs = 3_000,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  root = document,
} = {}) {
  const vehicle = new VehicleState();
  const vehicleHealth = new VehicleTelemetryHealth({ staleAfterMs: vehicleTelemetryStaleAfterMs });
  const infotainment = new InfotainmentState();
  const view = new DashboardView(root);
  const client = new RadomeClient({
    url,
    clientId,
    role,
    capabilities,
    supportedCapabilities,
  });
  let healthTimer = null;

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
  const sendMediaCommand = async (name, data = null) => {
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

  vehicle.addEventListener('change', ({ detail }) => view.renderVehicle(detail));
  infotainment.addEventListener('change', ({ detail }) => view.renderInfotainment(detail));
  client.on('status', status => {
    view.renderStatus(status);
    setVehicleTelemetryConnectionStatus(status);
  });
  client.on('snapshot', snapshot => {
    infotainment.applySnapshot(snapshot?.media);
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
  client.on('error', error => view.renderError(error));

  view.renderVehicle(vehicle.snapshot);
  view.renderInfotainment(infotainment.snapshot);
  renderHealth();

  return {
    client,
    vehicle,
    vehicleHealth,
    infotainment,
    view,
    applyVehicleEvent,
    setVehicleTelemetryConnectionStatus,
    sendMediaCommand,
    play() { return sendMediaCommand('media.play'); },
    pause() { return sendMediaCommand('media.pause'); },
    togglePlayback() { return sendMediaCommand('media.toggle_playback'); },
    nextTrack() { return sendMediaCommand('media.next_track'); },
    previousTrack() { return sendMediaCommand('media.previous_track'); },
    volumeUp() { return sendMediaCommand('media.volume_up'); },
    volumeDown() { return sendMediaCommand('media.volume_down'); },
    setVolume(volume) { return sendMediaCommand('media.set_volume', { volume }); },
    start() { client.connect(); },
    stop() {
      cancelHealthTimer();
      client.disconnect();
    },
  };
}
