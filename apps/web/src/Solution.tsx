import { useState } from 'react';
import type { SerializedMatrix } from '@linear-steps/contracts';
import { Math } from './Math';
import {
  decimalText,
  rationalTex,
  resultTex,
  resultTitle,
  type CalculationResult,
  type CalculationStep,
  stepTex,
  stepTitle,
} from './math-format';

function Matrix({
  matrix,
  step,
  decimal,
  result,
}: {
  matrix: SerializedMatrix;
  step: CalculationStep;
  decimal: boolean;
  result: CalculationResult;
}) {
  const system = result.method === 'gauss';
  const inverse = !system && 'classification' in result;
  const split = system
    ? matrix[0]!.length - 1
    : inverse
      ? result.input.length
      : -1;
  const caption = system
    ? 'Matriz aumentada'
    : inverse
      ? 'Bloco aumentado [A | I] em transformação'
      : 'Matriz em transformação';
  return (
    <div className="matrix-scroll">
      <table className="result-matrix">
        <caption>
          {decimal
            ? `${caption} — valores aproximados, até 6 casas decimais`
            : `${caption} — valores exatos`}
        </caption>
        <thead>
          <tr>
            <th scope="col">Linha</th>
            {matrix[0]!.map((_, j) => (
              <th key={j} scope="col">
                {system
                  ? j === split
                    ? 'b'
                    : `x${j + 1}`
                  : inverse && j >= split
                    ? `Direita ${j - split + 1}`
                    : `Coluna ${j + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => {
            const changed =
              (step.kind === 'swap' && step.rows.includes(i)) ||
              (step.kind === 'add-row' && step.target === i) ||
              (step.kind === 'scale-row' && step.row === i);
            return (
              <tr key={i} className={changed ? 'changed-row' : ''}>
                <th scope="row">
                  L{i + 1}
                  {changed && <span className="row-note">alterada</span>}
                  {step.kind === 'add-row' && step.source === i && (
                    <span className="row-note">origem</span>
                  )}
                </th>
                {row.map((value, j) => {
                  const pivot =
                    'pivot' in step &&
                    step.pivot.row === i &&
                    step.pivot.column === j;
                  return (
                    <td
                      key={j}
                      className={`${j === split ? 'rhs-cell' : ''} ${pivot ? 'pivot-cell' : ''}`}
                    >
                      {decimal ? (
                        decimalText(value)
                      ) : (
                        <Math tex={rationalTex(value)} />
                      )}
                      {pivot && <span className="row-note">pivô</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Step({
  step,
  result,
  index,
  decimal,
}: {
  step: CalculationStep;
  result: CalculationResult;
  index: number;
  decimal: boolean;
}) {
  const formula = stepTex(step, result);
  const title = stepTitle(
    step,
    result.method === 'gauss' || 'classification' in result,
  );
  return (
    <article className="step-card" aria-label={`Etapa ${index + 1}: ${title}`}>
      <p className="eyebrow">ETAPA {index + 1}</p>
      <h3>{title}</h3>
      {formula && <Math tex={formula} block />}
      {'matrix' in step && (
        <Matrix
          matrix={step.matrix}
          step={step}
          decimal={decimal}
          result={result}
        />
      )}
      {step.kind === 'conclusion' && result.method === 'gauss' && (
        <p>
          {resultTitle(result)} · posto de A: {result.rank} · posto de [A|b]:{' '}
          {result.augmentedRank}
        </p>
      )}
    </article>
  );
}

export function Solution({ result }: { result: CalculationResult }) {
  const [index, setIndex] = useState(0);
  const [all, setAll] = useState(false);
  const [decimal, setDecimal] = useState(false);
  const last = result.steps.length - 1;
  const go = (value: number) =>
    setIndex(globalThis.Math.max(0, globalThis.Math.min(last, value)));
  return (
    <div
      className="solution"
      onKeyDown={(event) => {
        if (
          all ||
          ['INPUT', 'SELECT', 'TEXTAREA'].includes(
            (event.target as HTMLElement).tagName,
          )
        )
          return;
        const destination = {
          ArrowLeft: index - 1,
          ArrowRight: index + 1,
          Home: 0,
          End: last,
        }[event.key];
        if (destination !== undefined) {
          event.preventDefault();
          go(destination);
        }
      }}
    >
      <div className="answer">
        <p className="eyebrow">
          RESULTADO · {result.method === 'gauss' ? 'GAUSS' : 'GAUSS-JORDAN'}
        </p>
        <h3>{resultTitle(result)}</h3>
        <Math tex={resultTex(result)} block />
        {result.method === 'gauss-jordan' && <p>Posto de A: {result.rank}</p>}
        {result.method === 'gauss-jordan' && 'classification' in result && (
          <p className="hint">
            {result.classification === 'invertible'
              ? 'As operações transformam [A | I] em [I | A⁻¹].'
              : 'O bloco esquerdo não pode se tornar a identidade. O bloco direito não é uma inversa.'}
          </p>
        )}
      </div>
      <div className="viewer-options">
        <label>
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />{' '}
          Mostrar todas as etapas
        </label>
        <label>
          <input
            type="checkbox"
            checked={decimal}
            onChange={(e) => setDecimal(e.target.checked)}
          />{' '}
          Aproximar valores das matrizes
        </label>
      </div>
      {decimal && (
        <p className="hint">
          A aproximação é apenas visual. Operações, fórmulas e resultado
          permanecem exatos; valores pequenos podem aparecer como zero na
          matriz.
        </p>
      )}
      {!all && (
        <>
          <nav className="step-navigation" aria-label="Navegação pelas etapas">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
            >
              ← Anterior
            </button>
            <label>
              Etapa{' '}
              <select
                aria-label="Selecionar etapa"
                value={index}
                onChange={(e) => go(Number(e.target.value))}
              >
                {result.steps.map((step, i) => (
                  <option key={i} value={i}>
                    {i + 1} —{' '}
                    {stepTitle(
                      step,
                      result.method === 'gauss' || 'classification' in result,
                    )}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === last}
            >
              Próxima →
            </button>
          </nav>
          <p className="hint" role="status">
            Etapa {index + 1} de {result.steps.length}. Use ← e → nos controles
            para navegar.
          </p>
        </>
      )}
      {all ? (
        result.steps.map((step, i) => (
          <Step
            key={i}
            step={step}
            result={result}
            index={i}
            decimal={decimal}
          />
        ))
      ) : (
        <Step
          step={result.steps[index]!}
          result={result}
          index={index}
          decimal={decimal}
        />
      )}
    </div>
  );
}
