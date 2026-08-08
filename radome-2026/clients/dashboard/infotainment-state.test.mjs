import assert from 'node:assert/strict';
import test from 'node:test';
import { InfotainmentState, parseInfotainmentEvent } from './infotainment-state.js';

test('parseInfotainmentEvent accepte le format historique cle=valeur', () => {
  assert.deepEqual(parseInfotainmentEvent('media.title_changed', 'title=Road to Nowhere'), { title: 'Road to Nowhere' });
  assert.deepEqual(parseInfotainmentEvent('media.artist_changed', 'artist=Talking Heads'), { artist: 'Talking Heads' });
});

test('parseInfotainmentEvent normalise la lecture', () => {
  assert.deepEqual(parseInfotainmentEvent('media.playback_changed', 'state=playing'), { playing: true });
  assert.deepEqual(parseInfotainmentEvent('media.playback_changed', 'state=paused'), { playing: false });
  assert.equal(parseInfotainmentEvent('media.playback_changed', 'state=???'), null);
});

test('InfotainmentState applique les evenements media connus', () => {
  const media = new InfotainmentState();
  assert.equal(media.applyRadomeEvent('media.source_changed', 'source=Bluetooth'), true);
  assert.equal(media.applyRadomeEvent('media.title_changed', 'title=Road to Nowhere'), true);
  assert.equal(media.applyRadomeEvent('media.artist_changed', 'artist=Talking Heads'), true);
  assert.equal(media.applyRadomeEvent('media.playback_changed', 'state=playing'), true);
  assert.deepEqual(media.snapshot, {
    source: 'Bluetooth',
    title: 'Road to Nowhere',
    artist: 'Talking Heads',
    playing: true,
  });
});

test('InfotainmentState ignore les evenements inconnus et les doublons', () => {
  const media = new InfotainmentState();
  assert.equal(media.applyRadomeEvent('media.unknown', 'value=x'), false);
  assert.equal(media.applyRadomeEvent('media.title_changed', 'title=Once in a Lifetime'), true);
  assert.equal(media.applyRadomeEvent('media.title_changed', 'title=Once in a Lifetime'), false);
});
