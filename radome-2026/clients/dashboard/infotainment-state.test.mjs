import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InfotainmentState,
  MEDIA_STATE_EVENTS,
  parseInfotainmentEvent,
  parseMediaState,
} from './infotainment-state.js';

test('parseMediaState valide le contrat serveur', () => {
  assert.deepEqual(parseMediaState({ playback: 'playing', volume: 42, track_index: 3 }), {
    playing: true,
    volume: 42,
    trackIndex: 3,
  });
  assert.deepEqual(parseMediaState({ playback: 'paused' }), { playing: false });
  assert.equal(parseMediaState({ playback: 'stopped' }), null);
  assert.equal(parseMediaState({ volume: 101 }), null);
  assert.equal(parseMediaState({ track_index: -1 }), null);
});

test('le snapshot serveur devient la base de vérité du media player', () => {
  const media = new InfotainmentState();
  assert.equal(media.applySnapshot({ playback: 'paused', volume: 50, track_index: 7 }), true);
  assert.deepEqual(media.snapshot, {
    source: null,
    title: null,
    artist: null,
    playing: false,
    volume: 50,
    trackIndex: 7,
    command: { status: 'idle', name: null, detail: null },
  });
});

test('tous les événements de commande media réconcilient depuis l’état observé', () => {
  const media = new InfotainmentState();
  for (const [index, name] of MEDIA_STATE_EVENTS.entries()) {
    assert.equal(media.applyRadomeEvent(name, {
      playback: index % 2 === 0 ? 'playing' : 'paused',
      volume: 20 + index,
      track_index: index,
    }), true);
  }
  assert.deepEqual(media.snapshot, {
    source: null,
    title: null,
    artist: null,
    playing: false,
    volume: 27,
    trackIndex: 7,
    command: { status: 'idle', name: null, detail: null },
  });
});

test('le feedback commande ne modifie jamais optimistement l’état media', () => {
  const media = new InfotainmentState();
  media.applySnapshot({ playback: 'paused', volume: 50, track_index: 2 });

  media.markCommandPending('media.next_track');
  assert.deepEqual(media.snapshot.command, {
    status: 'pending',
    name: 'media.next_track',
    detail: null,
  });
  assert.equal(media.snapshot.trackIndex, 2);

  media.markCommandSucceeded('media.next_track');
  assert.equal(media.snapshot.command.status, 'succeeded');
  assert.equal(media.snapshot.trackIndex, 2);

  media.applyRadomeEvent('media.next_track_requested', {
    playback: 'paused',
    volume: 50,
    track_index: 3,
  });
  assert.equal(media.snapshot.trackIndex, 3);

  media.markCommandFailed('media.set_volume', new Error('volume_out_of_range'));
  assert.deepEqual(media.snapshot.command, {
    status: 'failed',
    name: 'media.set_volume',
    detail: 'volume_out_of_range',
  });
});

test('parseInfotainmentEvent conserve les métadonnées historiques de démo', () => {
  assert.deepEqual(parseInfotainmentEvent('media.title_changed', 'title=Road to Nowhere'), { title: 'Road to Nowhere' });
  assert.deepEqual(parseInfotainmentEvent('media.artist_changed', 'artist=Talking Heads'), { artist: 'Talking Heads' });
  assert.deepEqual(parseInfotainmentEvent('media.playback_changed', 'state=playing'), { playing: true });
  assert.deepEqual(parseInfotainmentEvent('media.playback_changed', 'state=paused'), { playing: false });
  assert.equal(parseInfotainmentEvent('media.playback_changed', 'state=???'), null);
});

test('InfotainmentState ignore les evenements inconnus et les doublons', () => {
  const media = new InfotainmentState();
  assert.equal(media.applyRadomeEvent('media.unknown', 'value=x'), false);
  assert.equal(media.applyRadomeEvent('media.title_changed', 'title=Once in a Lifetime'), true);
  assert.equal(media.applyRadomeEvent('media.title_changed', 'title=Once in a Lifetime'), false);
});
