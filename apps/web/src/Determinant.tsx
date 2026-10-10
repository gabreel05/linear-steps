import { useState } from 'react';
import type { DeterminantResult } from '@linear-steps/contracts';
import { Math } from './Math';
import { rationalTex } from './math-format';
import { determinantFrames, determinantLabels } from './determinant-steps';
export function DeterminantSteps({ result }: { result: DeterminantResult }) {
  const [index, setIndex] = useState(0);
  const frames = determinantFrames(result);
  const frame = frames[index]!;
  return (
    <div>
      <h3>Determinante</h3>
      <Math block tex={`\\det(A)=${rationalTex(result.value)}`} />
      <p>{determinantLabels[result.method]}</p>
      <div className="step-navigation">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Etapa anterior
        </button>
        <span aria-live="polite">
          Etapa {index + 1} de {frames.length}
        </span>
        <label>
          Ir para etapa
          <select
            aria-label="Ir para etapa"
            value={index}
            onChange={(event) => setIndex(Number(event.target.value))}
          >
            {frames.map((f, i) => (
              <option value={i} key={i}>
                {i + 1} · {f.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={index === frames.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Próxima etapa
        </button>
      </div>
      <h4>{frame.title}</h4>
      <p className="hint">
        Destaques indicam os elementos usados ou as linhas alteradas nesta
        etapa. Na eliminação, o pivô recebe destaque próprio.
      </p>
      <div className="matrix-scroll">
        <table className="result-matrix">
          <caption>Matriz da etapa · elementos destacados</caption>
          <tbody>
            {frame.matrix.map((row, r) => (
              <tr key={r}>
                {row.map((v, c) => (
                  <td
                    key={c}
                    className={
                      frame.pivot === r && r === c
                        ? 'pivot-cell'
                        : frame.active(r, c)
                          ? 'matrix-active'
                          : ''
                    }
                    aria-label={
                      frame.pivot === r && r === c ? 'Pivô' : undefined
                    }
                  >
                    <Math tex={rationalTex(v)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Math block tex={frame.tex} />
    </div>
  );
}
