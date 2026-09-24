import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { AIRPORT_CODES, AIRPORTS, type AirportCode } from '../../engine';

/** Normaliza para busca: minúsculas e sem acento. */
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MAX_RESULTS = 8;

interface Props {
  label: string;
  value: AirportCode | '';
  onChange: (code: AirportCode) => void;
  /** códigos com slot da companhia (marcados na lista e mostrados primeiro sem busca) */
  owned?: AirportCode[];
  /** códigos que não aparecem */
  exclude?: AirportCode[];
  placeholder?: string;
}

/** Campo de busca de aeroporto por código ou cidade, com lista de resultados. */
export function AirportPicker({ label, value, onChange, owned = [], exclude = [], placeholder }: Props) {
  const uid = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const open = query !== null;

  const results = useMemo(() => {
    const q = norm(query ?? '').trim();
    const list = AIRPORT_CODES.filter((c) => !exclude.includes(c));
    if (!q) {
      // sem busca: os aeroportos da companhia e depois os maiores
      return [...list]
        .sort(
          (a, b) =>
            Number(owned.includes(b)) - Number(owned.includes(a)) || AIRPORTS[b].size - AIRPORTS[a].size,
        )
        .slice(0, MAX_RESULTS);
    }
    return list
      .map((c) => {
        const code = c.toLowerCase();
        const city = norm(AIRPORTS[c].city);
        const score =
          code === q ? 0 : code.startsWith(q) ? 1 : city.startsWith(q) ? 2 : city.includes(q) ? 3 : 9;
        return { c, score };
      })
      .filter((x) => x.score < 9)
      .sort((a, b) => a.score - b.score || AIRPORTS[b.c].size - AIRPORTS[a.c].size)
      .slice(0, MAX_RESULTS)
      .map((x) => x.c);
  }, [query, owned, exclude]);

  const pick = (c: AirportCode) => {
    onChange(c);
    setQuery(null);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setQuery(null);
    }
  };

  const shown = open ? query : value ? `${value} · ${AIRPORTS[value].city}` : '';

  return (
    <div className="field picker">
      <label htmlFor={uid}>{label}</label>
      <input
        id={uid}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={uid + 'list'}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder ?? 'Cidade ou código'}
        value={shown}
        onFocus={() => {
          setQuery('');
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKey}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
      />
      {open && (
        <ul id={uid + 'list'} role="listbox" className="picker-list">
          {results.length === 0 && <li className="picker-empty">Nenhum aeroporto encontrado.</li>}
          {results.map((c, i) => {
            const a = AIRPORTS[c];
            return (
              <li
                key={c}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'on' : ''}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c);
                }}
              >
                <b className="num">{c}</b>
                <span>{a.city}</span>
                <small>
                  porte {a.size}
                  {a.intl ? ' · exterior' : ''}
                  {owned.includes(c) ? ' · seu slot' : ''}
                </small>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
