export const DASHBOARD_DEMO_EVENTS = [
  ['vehicle.speed_changed', 'speed=0'],
  ['vehicle.engine_rpm_changed', 'rpm=850'],
  ['media.source_changed', 'source=Bluetooth'],
  ['media.title_changed', 'title=Road to Nowhere'],
  ['media.artist_changed', 'artist=Talking Heads'],
  ['media.playback_changed', 'state=playing'],
];

export function playDashboardDemo({ vehicle, infotainment }, events = DASHBOARD_DEMO_EVENTS) {
  for (const [name, data] of events) {
    if (name.startsWith('vehicle.')) vehicle.applyRadomeEvent(name, data);
    if (name.startsWith('media.')) infotainment.applyRadomeEvent(name, data);
  }
}
