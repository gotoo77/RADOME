import { VEHICLE_TELEMETRY } from './vehicle-state.js';

const speed = value => [VEHICLE_TELEMETRY.speed.name, `${VEHICLE_TELEMETRY.speed.key}=${value}`];
const rpm = value => [VEHICLE_TELEMETRY.engineRpm.name, `${VEHICLE_TELEMETRY.engineRpm.key}=${value}`];

export const DASHBOARD_DEMO_FRAMES = [
  { afterMs: 0, events: [
    speed(0),
    rpm(850),
    ['media.source_changed', 'source=Bluetooth'],
    ['media.title_changed', 'title=Road to Nowhere'],
    ['media.artist_changed', 'artist=Talking Heads'],
    ['media.playback_changed', 'state=playing'],
  ] },
  { afterMs: 1200, events: [speed(18), rpm(1450)] },
  { afterMs: 1200, events: [speed(52), rpm(2350)] },
  { afterMs: 1200, events: [speed(82), rpm(2850)] },
  { afterMs: 1600, events: [
    ['media.playback_changed', 'state=paused'],
    speed(48),
    rpm(1800),
  ] },
  { afterMs: 1200, events: [
    ['media.title_changed', 'title=Once in a Lifetime'],
    ['media.playback_changed', 'state=playing'],
    speed(0),
    rpm(850),
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
