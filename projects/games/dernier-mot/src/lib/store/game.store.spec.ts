import { TestBed } from '@angular/core/testing';
import { StorageService } from '@lets-ple/game-core';
import { createMemoryDictionary } from '../domain/dictionary';
import { createMatch } from '../domain/game';
import { DernierMotGameStore } from './game.store';

const dictionary = createMemoryDictionary(['CHA', 'CHAT', 'CHATON']);
const ACTIVE_MATCH_KEY = 'dernierMot:activeMatch';

describe('DernierMotGameStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function storage(): StorageService {
    return TestBed.inject(StorageService);
  }

  it('reprend une partie sérialisée au même tour', () => {
    const saved = createMatch(['Alice', 'Marc'], dictionary, 'partie-42');
    const marcTurn = {
      ...saved,
      currentPlayerId: 'player-1',
      nextRoundStarterId: 'player-1',
    };
    storage().write(ACTIVE_MATCH_KEY, marcTurn);

    const store = DernierMotGameStore.resume(dictionary, storage());

    expect(store.state()?.currentPlayerId).toBe('player-1');
  });

  it('efface la partie active au redémarrage', () => {
    const store = DernierMotGameStore.create(['Alice', 'Marc'], dictionary, storage(), 'partie-42');

    store.restart();

    expect(storage().read(ACTIVE_MATCH_KEY, null)).toBeNull();
    expect(store.state()).toBeNull();
  });

  it('revient au setup quand la sauvegarde JSON est corrompue', () => {
    localStorage.setItem('letsple:v1:dernierMot:activeMatch', '{invalide');

    const store = DernierMotGameStore.resume(dictionary, storage());

    expect(store.state()).toBeNull();
  });

  it('revient au setup quand la version de sauvegarde ne correspond pas', () => {
    storage().write(ACTIVE_MATCH_KEY, { version: 2 });

    const store = DernierMotGameStore.resume(dictionary, storage());

    expect(store.state()).toBeNull();
  });

  it('revient au setup sans exception quand localStorage est indisponible', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota dépassée');
    });

    const store = DernierMotGameStore.resume(dictionary, new StorageService());

    expect(store.state()).toBeNull();
    setItem.mockRestore();
  });

  it('persiste l’état réduit et expose le joueur actif', () => {
    const store = DernierMotGameStore.create(['Alice', 'Marc'], dictionary, storage(), 'partie-42');

    store.playLetter('C');

    expect(storage().read(ACTIVE_MATCH_KEY, null)).toMatchObject({ prefix: 'C' });
    expect(store.currentPlayer()?.id).toBe(store.state()?.currentPlayerId);
    expect(store.activePlayers()).toHaveLength(2);
    expect(store.canStartNextRound()).toBe(false);
  });

  it('expose le prochain joueur calculé par le réducteur pendant un résultat', () => {
    const store = DernierMotGameStore.create(['Alice', 'Marc'], dictionary, storage(), 'partie-42');
    const actorId = store.currentPlayer()?.id;

    store.playLetter('C');

    expect(store.playerAfterResult()?.id).not.toBe(actorId);
  });

  it('expose le passage de manche et les gagnants calculés', () => {
    const terminalDictionary = createMemoryDictionary(['A']);
    const store = DernierMotGameStore.create(
      ['Alice', 'Marc'],
      terminalDictionary,
      storage(),
      'partie-42',
    );

    for (let round = 0; round < 7; round += 1) {
      store.playLetter('A');
      if (round < 6) {
        expect(store.canStartNextRound()).toBe(true);
        store.startNextRound();
      }
    }

    expect(store.state()?.phase).toBe('game-over');
    expect(store.winners()).toEqual([store.currentPlayer()]);
  });
});
