import { useState } from 'react';
import {
  AIRPORTS,
  BUSINESS_MODEL_IDS,
  BUSINESS_MODELS,
  type BusinessModelId,
  fmtMoney,
  HUBS,
  hubDifficulty,
  START_CASH_BY_DIFFICULTY,
  type AirportCode,
  type Difficulty,
} from '../../engine';
import { useGame } from '../../store/gameStore';
import { Btn } from '../components/Btn';
import { Icon } from '../components/Icon';

const DIFF_CLASS: Record<Difficulty, string> = { Fácil: 'd-easy', Médio: 'd-mid', Difícil: 'd-hard' };

export function NewGame() {
  const start = useGame((s) => s.start);
  const [name, setName] = useState('Asa Norte Linhas Aéreas');
  const [hub, setHub] = useState<AirportCode>('BSB');
  const [model, setModel] = useState<BusinessModelId>('tradicional');
  const bm = BUSINESS_MODELS[model];
  const ok = name.trim().length > 0;

  return (
    <main className="newgame">
      <form
        className="ng-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) start(name.trim(), hub, model);
        }}
      >
        <span className="tail big" aria-hidden="true">
          <Icon n="plane" size={30} />
        </span>
        <h1>Fundar companhia aérea</h1>
        <p>
          Você começa com {fmtMoney(START_CASH_BY_DIFFICULTY[hubDifficulty(hub)])}, uma licença regional e
          slots no hub. Hubs menores dão mais capital inicial. Um dia de operação passa a cada segundo.
        </p>
        <label>
          <span>Nome</span>
          <input type="text" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
        </label>
        <span className="lbl" id="model-label">
          Modelo de negócio
        </span>
        <div className="models" role="radiogroup" aria-labelledby="model-label">
          {BUSINESS_MODEL_IDS.filter((id) => BUSINESS_MODELS[id].available).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={model === id}
              onClick={() => setModel(id)}
            >
              <b>{BUSINESS_MODELS[id].name}</b>
              <small>{BUSINESS_MODELS[id].tagline}</small>
            </button>
          ))}
        </div>
        <div className="model-detail" aria-live="polite">
          <div>
            <small>Ganha</small>
            <ul className="gain">
              {bm.gains.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <small>Perde</small>
            <ul className="loss">
              {bm.losses.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <small>O modelo não pode ser trocado depois.</small>
        <span className="lbl" id="hub-label">
          Hub
        </span>
        <div className="hubs" role="radiogroup" aria-labelledby="hub-label">
          {HUBS.map((c) => {
            const diff = hubDifficulty(c);
            return (
              <button key={c} type="button" role="radio" aria-checked={hub === c} onClick={() => setHub(c)}>
                <b>{c}</b>
                <small>{AIRPORTS[c].city}</small>
                <em className={DIFF_CLASS[diff]}>
                  {diff} · {fmtMoney(START_CASH_BY_DIFFICULTY[diff])}
                </em>
              </button>
            );
          })}
        </div>
        <Btn kind="primary" type="submit" disabled={!ok}>
          Iniciar operações
        </Btn>
      </form>
    </main>
  );
}
