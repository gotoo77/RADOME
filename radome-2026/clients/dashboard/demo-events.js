export const DASHBOARD_DEMO_FRAMES = [
  { afterMs: 0, events: [
    ['vehicle.speed_changed', 'speed=0'],
    ['vehicle.engine_rpm_changed', 'rpm=850'],
    ['media.source_changed', 'source=Bluetooth'],
    ['media.title_changed', 'title=Road to Nowhere'],
    ['media.artist_changed', 'artist=Talking Heads'],
    ['media.playback_changed', 'state=playing'],
  ] },
  { afterMs: 1200, events: [
    ['vehicle.speed_changed', 'speed=18'],
    ['vehicle.engine_rpm_changed', 'rpm=1450'],
  ] },
  { afterMs: 1200, events: [
    ['vehicle.speed_changed', 'speed=52'],
    ['vehicle.engine_rpm_changed', 'rpm=2350'],
  ] },
  { afterMs: 1200, events: [
    ['vehicle.speed_changed', 'speed=82'],
    ['vehicle.engine_rpm_changed', 'rpm=2850'],
  ] },
  { afterMs: 1600, events: [
    ['media.playback_changed', 'state=paused'],
    ['vehicle.speed_changed', 'speed=48'],
    ['vehicle.engine_rpm_changed', 'rpm=1800'],
  ] },
  { afterMs: 1200, events: [
    ['media.title_changed', 'title=Once in a Lifetime'],
    ['media.playback_changed', 'state=playing'],
    ['vehicle.speed_changed', 'speed=0'],
    ['vehicle.engine_rpm_changed', 'rpm=850'],
  ] },
];

export function playDashboardDemo(app, frames = DASHBOARD_DEMO_FRAMES) {
  let cancelled = false;
  const timers = [];
  let elapsed = 0;

  for (const frame of frames) {
    elapsed += frame.afterMs;
    timers.push(setTimeout(() => {
      if (cancelled) return;
      for (const [name, data] of frame.events) applyDemoEvent(app, name, data);
    }, elapsed));
  }

  return () => {
    cancelled = true;
    for (const timer of timers) clearTimeout(timer);
  };
}

export function applyDemoEvent({ vehicle, infotainment }, name, data) {
  if (name.startsWith('vehicle.')) return vehicle.applyRadomeEvent(name, data);
  if (name.startsWith('media.')) return infotainment.applyRadomeEvent(name, data);
  return false;
}
