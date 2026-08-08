import { RadomeClient } from '../sdk/radome-client.js';
import { VehicleState } from './vehicle-state.js';
import { InfotainmentState } from './infotainment-state.js';
import { DashboardView } from './dashboard-view.js';

export function createDashboardApp({
  url,
  clientId = 'dashboard-web',
  role = 'driver-display',
  capabilities = ['display', 'touch'],
  root = document,
} = {}) {
  const vehicle = new VehicleState();
  const infotainment = new InfotainmentState();
  const view = new DashboardView(root);
  const client = new RadomeClient({ url, clientId, role, capabilities });

  vehicle.addEventListener('change', ({ detail }) => view.renderVehicle(detail));
  infotainment.addEventListener('change', ({ detail }) => view.renderInfotainment(detail));
  client.on('status', status => view.renderStatus(status));
  client.on('event:vehicle.speed_changed', data => vehicle.applyRadomeEvent('vehicle.speed_changed', data));
  client.on('event:vehicle.engine_rpm_changed', data => vehicle.applyRadomeEvent('vehicle.engine_rpm_changed', data));
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

  return {
    client,
    vehicle,
    infotainment,
    view,
    start() { client.connect(); },
    stop() { client.disconnect(); },
  };
}
