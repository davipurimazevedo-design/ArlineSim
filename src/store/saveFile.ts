// Save em arquivo: exportar para .json e importar de volta, com as migrações de versão.
// Puro (sem DOM): a interface cuida do download e da leitura do arquivo.
import { SAVE_VERSION } from '../engine/newGame';
import type { GameState } from '../engine/types';
import { migrate } from './migrate';

/** Nome do arquivo: asa-norte_<companhia>_dia-<N>.json, sem acentos nem espaços. */
export function saveFileName(g: GameState): string {
  const slug =
    g.name
      .normalize('NFD')
      .replace(/\p{Mn}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'companhia';
  return `asa-norte_${slug}_dia-${g.day}.json`;
}

export function serializeSave(g: GameState): string {
  return JSON.stringify(g, null, 1);
}

export type ParsedSave = { game: GameState; error: null } | { game: null; error: string };

/** Lê o texto de um arquivo de save. Nunca lança: devolve o jogo migrado ou a mensagem de erro. */
export function parseSaveFile(text: string): ParsedSave {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { game: null, error: 'O arquivo não é um save do Asa Norte (não está em formato JSON).' };
  }
  const v = raw && typeof raw === 'object' ? (raw as { v?: unknown }).v : undefined;
  if (typeof v === 'number' && v > SAVE_VERSION)
    return {
      game: null,
      error: 'Este save é de uma versão mais nova do jogo. Atualize o jogo para abri-lo.',
    };
  const game = migrate(raw);
  if (!game) return { game: null, error: 'O arquivo não é um save válido do Asa Norte ou está corrompido.' };
  return { game, error: null };
}
