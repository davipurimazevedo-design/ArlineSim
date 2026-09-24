// Save em IndexedDB (idb-keyval) com cópia em localStorage.
// A carga lê os dois e fica com o mais recente, então um save interrompido no pagehide
// (IndexedDB é assíncrono) não perde progresso. Todo acesso fica em try/catch.
import { del, get, set } from 'idb-keyval';
import type { GameState } from '../engine';
import { migrate } from './migrate';

export const SAVE_KEY = 'asanorte-save';
export const THEME_KEY = 'asanorte-theme';

function parse(json: string | null | undefined): GameState | null {
  if (!json) return null;
  try {
    return migrate(JSON.parse(json));
  } catch {
    return null;
  }
}

export async function loadGame(): Promise<GameState | null> {
  let fromIdb: GameState | null = null;
  try {
    fromIdb = parse(await get<string>(SAVE_KEY));
  } catch {
    /* IndexedDB indisponível */
  }
  let fromLs: GameState | null = null;
  try {
    fromLs = parse(localStorage.getItem(SAVE_KEY));
  } catch {
    /* localStorage indisponível */
  }
  if (fromIdb && fromLs) return fromIdb.savedAt >= fromLs.savedAt ? fromIdb : fromLs;
  return fromIdb ?? fromLs;
}

export function saveGame(g: GameState): void {
  let json: string;
  try {
    json = JSON.stringify(g);
  } catch {
    return;
  }
  try {
    localStorage.setItem(SAVE_KEY, json);
  } catch {
    /* cota ou modo privado */
  }
  set(SAVE_KEY, json).catch(() => {
    /* IndexedDB indisponível: a cópia em localStorage basta */
  });
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignorado */
  }
  del(SAVE_KEY).catch(() => {});
}

export type Theme = 'light' | 'dark';

export function loadTheme(): Theme | null {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

export function saveTheme(t: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignorado */
  }
}
