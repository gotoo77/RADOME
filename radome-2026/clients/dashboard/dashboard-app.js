import { RadomeClient } from '../sdk/radome-client.js';
import { VehicleState } from './vehicle-state.js';
import { DashboardView } from './dashboard-view.js';

export function createDashboardApp({
  url,
  clientId = 'dashboard-web',
  role = 'driver-display',
  capabilities = ['display', 'touch'],
  root = document,
} = {}) {
  const vehicle = new VehicleState();
  const view = new DashboardView(root);
  const client = new RadomeClient({ url, clientId, role, capabilities });

  vehicle.addEventListener('change', ({ detail }) => view.renderVehicle(detail));
  client.on('status', status => view.renderStatus(status));
  client.on('event:vehicle.speed_changed', data => vehicle.applyRadomeEvent('vehicle.speed_changed', data));
  client.on('event:vehicle.engine_rpm_changed', data => vehicle.applyRadomeEvent('vehicle.engine_rpm_changed', data));
  client.on('error', error => view.renderError(error));

  view.renderVehicle(vehicle.snapshot);

  return {
    client,
    vehicle,
    view,
    start() { client.connect(); },
    stop() { client.disconnect(); },
  };
}
