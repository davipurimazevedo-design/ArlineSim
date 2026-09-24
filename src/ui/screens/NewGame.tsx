import { useState } from 'react';
import {
  AIRPORTS,
  BUSINESS_MODEL_IDS,
  BUSINESS_MODELS,
  type BusinessModelId,
  fmtMoney,
  hubsFor,
  hubDifficulty,
  START_CASH_BY_DIFFICULTY,
  type AirportCode,
  type Difficulty,
} from '../../engine';
import { useGame } from '../../store/gameStore';
import { AirportPicker } from '../components/AirportPicker';
import { Btn } from '../components/Btn';
import { Icon } from '../components/Icon';

/** atalhos na tela de fundação (os hubs do protótipo) */
const SUGGESTED: AirportCode[] = ['GRU', 'GIG', 'BSB', 'CNF', 'REC', 'SLZ'];

const DIFF_CLASS: Record<Difficulty, string> = { Fácil: 'd-easy', Médio: 'd-mid', Difícil: 'd-hard' };

export function NewGame() {
  const start = useGame((s) => s.start);
  const [name, setName] = useState('Asa Norte Linhas Aéreas');
  const [hub, setHub] = useState<AirportCode>('BSB');
  const [model, setModel] = useState<BusinessModelId>('tradicional');
  const bm = BUSINESS_MODELS[model];
  const hubs = hubsFor(bm.hubMinSize);
  const cash = bm.startCash ?? START_CASH_BY_DIFFICULTY[hubDifficulty(hub)];
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
          Você começa com {fmtMoney(cash)},{' '}
          {bm.id === 'pequeno' ? 'uma licença de táxi aéreo' : 'uma licença regional'} e slots no hub.{' '}
          {bm.startCash ? '' : 'Hubs menores dão mais capital inicial. '}Um dia de operação passa a cada
          segundo.
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
              onClick={() => {
                setModel(id);
                // o hub escolhido pode não valer no novo modelo (cidades pequenas só no Pequeno porte)
                if (!hubsFor(BUSINESS_MODELS[id].hubMinSize).includes(hub)) setHub('BSB');
              }}
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
        <AirportPicker
          label="Hub (cidade-base da companhia)"
          value={hub}
          onChange={setHub}
          only={hubs}
          placeholder="Busque a cidade ou o código"
        />
        <div className="hubs" role="radiogroup" aria-label="Hubs sugeridos">
          {SUGGESTED.map((c) => {
            const diff = hubDifficulty(c);
            return (
              <button key={c} type="button" role="radio" aria-checked={hub === c} onClick={() => setHub(c)}>
                <b>{c}</b>
                <small>{AIRPORTS[c].city}</small>
                <em className={DIFF_CLASS[diff]}>{diff}</em>
              </button>
            );
          })}
        </div>
        <p className="hub-info">
          <b>
            {AIRPORTS[hub].city} ({hub}) · {AIRPORTS[hub].uf}
          </b>{' '}
          · porte {AIRPORTS[hub].size} ·{' '}
          <span className={DIFF_CLASS[hubDifficulty(hub)]}>{hubDifficulty(hub)}</span> · capital inicial{' '}
          {fmtMoney(cash)}
        </p>
        <Btn kind="primary" type="submit" disabled={!ok}>
          Iniciar operações
        </Btn>
      </form>
    </main>
  );
}
