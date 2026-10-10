import { useState } from 'react';
import {
  INPUT_LIMITS,
  type MatrixOperationResult,
  type SerializedMatrix,
} from '@linear-steps/contracts';
import { Math } from './Math';
import { matrixTex, rationalTex } from './math-format';
import { basicLabels, cellTex } from './matrix-operations';

export function MatrixEditor({
  value,
  onChange,
  errorCell,
}: {
  value: string[][];
  errorCell?: string | undefined;
  onChange: (value: string[][]) => void;
}) {
  return (
    <fieldset className="second-matrix">
      <legend>Matriz B</legend>
      <div className="dimensions">
        {['Linhas de B', 'Colunas de B'].map((label, k) => (
          <label className="field" key={label}>
            {label}
            <select
              aria-label={label}
              value={k === 0 ? value.length : value[0]!.length}
              onChange={(e) => {
                const rows = k === 0 ? Number(e.target.value) : value.length;
                const columns =
                  k === 1 ? Number(e.target.value) : value[0]!.length;
                onChange(
                  Array.from({ length: rows }, (_, i) =>
                    Array.from(
                      { length: columns },
                      (_, j) => value[i]?.[j] ?? '0',
                    ),
                  ),
                );
              }}
            >
              {Array.from({ length: INPUT_LIMITS.dimension }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="input-scroll">
        <table className="input-matrix">
          <caption>Elementos da matriz B</caption>
          <tbody>
            {value.map((row, i) => (
              <tr key={i}>
                <th scope="row">L{i + 1}</th>
                {row.map((cell, j) => (
                  <td key={j}>
                    <input
                      id={`right-${i}-${j}`}
                      aria-invalid={errorCell === `right-${i}-${j}`}
                      aria-describedby={
                        errorCell === `right-${i}-${j}`
                          ? 'input-error'
                          : 'input-help'
                      }
                      aria-label={`B, linha ${i + 1}, coluna ${j + 1}`}
                      value={cell}
                      maxLength={INPUT_LIMITS.scalarCharacters}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) =>
                        onChange(
                          value.map((r, ri) =>
                            ri === i
                              ? r.map((v, ci) =>
                                  ci === j ? e.target.value : v,
                                )
                              : r,
                          ),
                        )
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}

function Operand({
  name,
  matrix,
  active,
}: {
  name: string;
  matrix: SerializedMatrix;
  active: (row: number, column: number) => boolean;
}) {
  return (
    <div className="matrix-scroll">
      <table className="result-matrix">
        <caption>Matriz {name} · elementos usados nesta etapa</caption>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td key={j} className={active(i, j) ? 'matrix-active' : ''}>
                  <Math tex={rationalTex(v)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MatrixSteps({ result }: { result: MatrixOperationResult }) {
  const [index, setIndex] = useState(0);
  const step = result.steps[index]!;
  const input = result.input;
  const a = 'left' in input ? input.left : input.matrix;
  return (
    <div className="matrix-steps">
      <h3>{basicLabels[input.operation]}</h3>
      <Math tex={`C=${matrixTex(result.result)}`} block />
      <nav aria-label="Etapas do cálculo" className="step-navigation">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Etapa anterior
        </button>
        <span aria-live="polite">
          Etapa {index + 1} de {result.steps.length} · elemento ({step.row + 1},{' '}
          {step.column + 1})
        </span>
        <button
          type="button"
          disabled={index === result.steps.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Próxima etapa
        </button>
      </nav>
      <Operand
        name="A"
        matrix={a}
        active={(i, j) =>
          input.operation === 'multiply'
            ? i === step.row
            : input.operation === 'transpose'
              ? i === step.column && j === step.row
              : i === step.row && j === step.column
        }
      />
      {'right' in input && (
        <Operand
          name="B"
          matrix={input.right}
          active={(i, j) =>
            input.operation === 'multiply'
              ? j === step.column
              : i === step.row && j === step.column
          }
        />
      )}
      <div className="cell-expression" aria-live="polite">
        <Math tex={cellTex(step)} block />
      </div>
      <p className="hint">
        Os elementos destacados participam do cálculo desta etapa. Os índices
        exibidos começam em 1.
      </p>
    </div>
  );
}
