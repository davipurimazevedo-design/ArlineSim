import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../../src/engine/newGame';
import { tick } from '../../src/engine/tick';
import { parseSaveFile, saveFileName, serializeSave } from '../../src/store/saveFile';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

describe('save em arquivo', () => {
  it('nome do arquivo sem acentos nem espaços', () => {
    const s = makeGame();
    s.name = 'Águia do Cerrado Linhas Aéreas!';
    s.day = 42;
    expect(saveFileName(s)).toBe('asa-norte_aguia-do-cerrado-linhas-aereas_dia-42.json');
  });

  it('exporta e importa o mesmo jogo', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    addTestRoute(s, 'BSB', 'GRU', p.id);
    for (let i = 0; i < 5; i++) tick(s, { noEvents: true });
    const back = parseSaveFile(serializeSave(s));
    expect(back.error).toBeNull();
    expect(back.game).toEqual(JSON.parse(JSON.stringify(s)));
  });

  it('save antigo passa pelas migrações', () => {
    const s = makeGame();
    const old = JSON.parse(JSON.stringify({ ...s, v: 8 }));
    delete old.fxIdx;
    const back = parseSaveFile(JSON.stringify(old));
    expect(back.game?.v).toBe(SAVE_VERSION);
    expect(back.game?.fxIdx).toBe(1);
  });

  it('erros claros para arquivo inválido, corrompido ou de versão mais nova', () => {
    expect(parseSaveFile('isto não é json').error).toMatch(/JSON/);
    expect(parseSaveFile('{"foo": 1}').error).toMatch(/válido/);
    expect(parseSaveFile(JSON.stringify({ ...makeGame(), v: SAVE_VERSION + 1 })).error).toMatch(/mais nova/);
  });
});
