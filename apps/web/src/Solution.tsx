import { useState } from 'react';
import type {
  GaussianSolution,
  GaussianStep,
  SerializedMatrix,
} from '@linear-steps/contracts';
import { Math } from './Math';
import {
  decimalText,
  rationalTex,
  solutionTex,
  stepTex,
  stepTitle,
} from './math-format';

const classificationLabels = {
  unique: 'Solução única (SPD)',
  infinite: 'Infinitas soluções (SPI)',
  inconsistent: 'Nenhuma solução (SI)',
};

function Matrix({
  matrix,
  step,
  decimal,
}: {
  matrix: SerializedMatrix;
  step: GaussianStep;
  decimal: boolean;
}) {
  return (
    <div className="matrix-scroll">
      <table className="result-matrix">
        <caption>
          {decimal
            ? 'Matriz aumentada — valores aproximados, até 6 casas decimais'
            : 'Matriz aumentada — valores exatos'}
        </caption>
        <thead>
          <tr>
            <th scope="col">Linha</th>
            {matrix[0]!.map((_, j) => (
              <th key={j} scope="col">
                {j === matrix[0]!.length - 1 ? 'b' : `x${j + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => {
            const changed =
              (step.kind === 'swap' && step.rows.includes(i)) ||
              (step.kind === 'add-row' && step.target === i);
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
                      className={`${j === row.length - 1 ? 'rhs-cell' : ''} ${pivot ? 'pivot-cell' : ''}`}
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
  step: GaussianStep;
  result: GaussianSolution;
  index: number;
  decimal: boolean;
}) {
  const formula = stepTex(step, result);
  return (
    <article
      className="step-card"
      aria-label={`Etapa ${index + 1}: ${stepTitle(step)}`}
    >
      <p className="eyebrow">ETAPA {index + 1}</p>
      <h3>{stepTitle(step)}</h3>
      {formula && <Math tex={formula} block />}
      {'matrix' in step && (
        <Matrix matrix={step.matrix} step={step} decimal={decimal} />
      )}
      {step.kind === 'conclusion' && (
        <p>
          {classificationLabels[result.classification]} · posto de A:{' '}
          {result.rank} · posto de [A|b]: {result.augmentedRank}
        </p>
      )}
    </article>
  );
}

export function Solution({ result }: { result: GaussianSolution }) {
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
        <p className="eyebrow">RESULTADO · GAUSS</p>
        <h3>{classificationLabels[result.classification]}</h3>
        <Math tex={solutionTex(result)} block />
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
                    {i + 1} — {stepTitle(step)}
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
