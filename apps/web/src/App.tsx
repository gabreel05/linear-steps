import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  INPUT_LIMITS,
  type DeterminantMethod,
  type DeterminantOptions,
} from '@linear-steps/contracts';
import {
  MathInputError,
  parseScalar,
  solveGaussian,
  solveCramer,
  solveByInverse,
  reduceMatrix,
  invertMatrix,
  invertByAdjugate,
  determinant,
} from '@linear-steps/math-core';
import { Solution } from './Solution';
import { SystemMethods } from './SystemMethods';
import { AdjugateSteps } from './Adjugate';
import { VectorWorkspace } from './Vectors';
import type { VectorFormInput } from './vector-operations';
import { DeterminantSteps } from './Determinant';
import { determinantLabels } from './determinant-steps';
import { Account } from './auth/Account';
import { History } from './history/History';
import type { CalculationResult } from './math-format';

import { calculateBasic, isBasic, basicLabels } from './matrix-operations';
import { MatrixSteps, MatrixEditor } from './MatrixOperations';
import type { Operation } from './history/records';
const matrixExamples = [
  {
    name: 'Lista · forma reduzida 3 × 4',
    a: [
      ['1', '2', '-1', '3'],
      ['2', '4', '1', '8'],
      ['-1', '-2', '3', '2'],
    ],
  },
  {
    name: 'Lista · inversa 3 × 3',
    a: [
      ['1', '0', '2'],
      ['2', '1', '3'],
      ['4', '1', '8'],
    ],
  },
  {
    name: 'Matriz singular',
    a: [
      ['1', '2'],
      ['2', '4'],
    ],
  },
  {
    name: 'Normalização com fração',
    a: [
      ['2', '1'],
      ['0', '3'],
    ],
  },
];

const examples = [
  {
    name: 'Lista · sistema 3 × 3',
    a: [
      ['2', '3', '-1'],
      ['4', '4', '-3'],
      ['2', '-3', '1'],
    ],
    b: ['5', '3', '-1'],
  },
  {
    name: 'Infinitas soluções',
    a: [
      ['1', '1'],
      ['2', '2'],
    ],
    b: ['2', '4'],
  },
  {
    name: 'Nenhuma solução',
    a: [
      ['1', '1'],
      ['2', '2'],
    ],
    b: ['2', '5'],
  },
  {
    name: 'Troca de linhas',
    a: [
      ['0', '1'],
      ['1', '1'],
    ],
    b: ['1', '3'],
  },
];

export function App() {
  const [operation, setOperation] = useState<Operation>('system');
  const [vectorSeed, setVectorSeed] = useState<VectorFormInput>();
  const [vectorRevision, setVectorRevision] = useState(0);
  const system = operation === 'system';
  const [inverseMethod, setInverseMethod] = useState<
    'gauss-jordan' | 'adjugate'
  >('gauss-jordan');
  const [systemMethod, setSystemMethod] = useState<
    'gauss' | 'cramer' | 'inverse'
  >('gauss');
  const [detMethod, setDetMethod] = useState<DeterminantMethod>('triangular');
  const [axis, setAxis] = useState<'row' | 'column'>('row');
  const [expansionIndex, setExpansionIndex] = useState(0);
  const detOptions: DeterminantOptions =
    detMethod === 'laplace'
      ? { method: detMethod, axis, index: expansionIndex }
      : { method: detMethod };
  const basic = isBasic(operation);
  const binary =
    operation === 'add' || operation === 'subtract' || operation === 'multiply';
  const [right, setRight] = useState([
    ['1', '0', '0'],
    ['0', '1', '0'],
    ['0', '0', '1'],
  ]);
  const [scalar, setScalar] = useState('2');
  const samples: { name: string; a: string[][]; b?: string[] }[] = basic
    ? [
        {
          name: 'Exemplo com frações · 2 × 2',
          a: [
            ['1/2', '-2'],
            ['3', '0'],
          ],
        },
      ]
    : system
      ? examples
      : operation === 'determinant'
        ? [
            {
              name: 'Lista · determinante 175',
              a: [
                ['3', '1', '-2'],
                ['-5', '4', '-6'],
                ['0', '2', '7'],
              ],
            },
            ...matrixExamples,
          ]
        : matrixExamples;
  const [a, setA] = useState(examples[0]!.a);
  const [b, setB] = useState(examples[0]!.b);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<{ message: string; cell?: string } | null>(
    null,
  );
  const [revision, setRevision] = useState(0);
  const [savable, setSavable] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (result) heading.current?.focus();
  }, [result]);

  const invalidate = () => {
    setSavable(false);
    setResult(null);
    setError(null);
  };
  const resize = (rows: number, columns: number) => {
    invalidate();
    setA(
      Array.from({ length: rows }, (_, i) =>
        Array.from({ length: columns }, (_, j) => a[i]?.[j] ?? '0'),
      ),
    );
    setB(Array.from({ length: rows }, (_, i) => b[i] ?? '0'));
  };
  const solve = (event: FormEvent) => {
    event.preventDefault();
    setSavable(false);
    setResult(null);
    setError(null);
    for (let i = 0; i < a.length; i++) {
      const row = system ? [...a[i]!, b[i]!] : a[i]!;
      for (let j = 0; j < row.length; j++) {
        try {
          parseScalar(row[j]);
        } catch (cause) {
          const cell = `cell-${i}-${j}`;
          setError({
            message: `Linha ${i + 1}, ${j === a[0]!.length ? 'termo independente' : `coluna ${j + 1}`}: ${cause instanceof Error ? cause.message : 'Entrada inválida.'}`,
            cell,
          });
          document.getElementById(cell)?.focus();
          return;
        }
      }
    }
    if (binary || operation === 'scale') {
      const entries = binary
        ? right.flatMap((row, i) =>
            row.map((value, j) => ({
              value,
              label: 'B, linha ' + (i + 1) + ', coluna ' + (j + 1),
              id: 'right-' + i + '-' + j,
            })),
          )
        : [{ value: scalar, label: 'Escalar', id: 'scalar-input' }];
      for (const entry of entries) {
        try {
          parseScalar(entry.value);
        } catch (cause) {
          setError({
            message:
              entry.label +
              ': ' +
              (cause instanceof Error ? cause.message : 'Entrada inválida.'),
            cell: entry.id,
          });
          document.getElementById(entry.id)?.focus();
          return;
        }
      }
    }
    try {
      setResult(
        operation === 'determinant'
          ? determinant(a, detOptions)
          : basic
            ? calculateBasic(operation, a, right, scalar)
            : system
              ? systemMethod === 'cramer'
                ? solveCramer(a, b)
                : systemMethod === 'inverse'
                  ? solveByInverse(a, b)
                  : solveGaussian(a, b)
              : operation === 'rref'
                ? reduceMatrix(a)
                : inverseMethod === 'adjugate'
                  ? invertByAdjugate(a)
                  : invertMatrix(a),
      );
      setRevision((value) => value + 1);
      setSavable(true);
    } catch (cause) {
      setError({
        message:
          cause instanceof MathInputError
            ? cause.message
            : 'Não foi possível concluir o cálculo. Revise as entradas e tente novamente.',
      });
    }
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Ir para o conteúdo
      </a>
      <header className="topbar">
        <a className="brand" href="#main">
          <span aria-hidden="true">[ L ]</span> Linear Steps
        </a>
        <span className="status">
          Matrizes, sistemas e vetores · em desenvolvimento
        </span>
      </header>
      <main id="main">
        <Account />
        <section className="workspace-intro">
          <p className="eyebrow">ÁLGEBRA LINEAR · PASSO A PASSO</p>
          <h1>
            Resolva. <span>Entenda cada etapa.</span>
          </h1>
          <p>
            Trabalhe com matrizes, sistemas e vetores e acompanhe cada operação
            com resultados exatos.
          </p>
        </section>
        <label className="field">
          Área de cálculo
          <select
            aria-label="Área de cálculo"
            value={operation === 'vector' ? 'vector' : 'matrix'}
            onChange={(e) => {
              invalidate();
              setOperation(e.target.value === 'vector' ? 'vector' : 'system');
              setVectorSeed(undefined);
            }}
          >
            <option value="matrix">Matrizes e sistemas</option>
            <option value="vector">Vetores</option>
          </select>
        </label>
        {operation === 'vector' ? (
          <VectorWorkspace
            key={vectorRevision}
            initial={vectorSeed}
            result={result?.method === 'components' ? result : null}
            revision={revision}
            onInvalidate={invalidate}
            onResult={(value) => {
              setResult(value);
              setRevision((r) => r + 1);
              setSavable(true);
            }}
          />
        ) : (
          <div className="workspace">
            <section className="input-panel" aria-labelledby="input-heading">
              <h2 id="input-heading">
                {system ? 'Seu sistema' : 'Sua matriz'}
              </h2>
              <label className="field">
                Operação
                <select
                  aria-label="Operação"
                  value={operation}
                  onChange={(event) => {
                    invalidate();
                    setOperation(event.target.value as Operation);
                  }}
                >
                  <option value="system">Resolver sistema</option>
                  <option value="rref">Forma reduzida e posto</option>
                  <option value="inverse">Matriz inversa</option>
                  <option value="determinant">Determinante</option>
                  {Object.entries(basicLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Carregar exemplo
                <select
                  aria-label="Carregar exemplo"
                  value=""
                  onChange={(event) => {
                    const sample = samples[Number(event.target.value)];
                    if (!sample) return;
                    invalidate();
                    setA(sample.a.map((row) => [...row]));
                    if (basic) {
                      setRight([
                        ['1', '2'],
                        ['0', '1/3'],
                      ]);
                      setScalar('2/3');
                    }
                    setB(sample.b ? [...sample.b] : sample.a.map(() => '0'));
                  }}
                >
                  <option value="" disabled>
                    Escolha um exemplo
                  </option>
                  {samples.map((sample, i) => (
                    <option key={i} value={i}>
                      {sample.name}
                    </option>
                  ))}
                </select>
              </label>
              <form onSubmit={solve} noValidate>
                <div className="dimensions">
                  {(system
                    ? ['Equações', 'Incógnitas']
                    : ['Linhas', 'Colunas']
                  ).map((label, k) => (
                    <label key={label} className="field">
                      {label}
                      <select
                        aria-label={label}
                        value={k === 0 ? a.length : a[0]!.length}
                        onChange={(event) =>
                          resize(
                            k === 0 ? Number(event.target.value) : a.length,
                            k === 1 ? Number(event.target.value) : a[0]!.length,
                          )
                        }
                      >
                        {Array.from(
                          { length: INPUT_LIMITS.dimension },
                          (_, i) => (
                            <option key={i} value={i + 1}>
                              {i + 1}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="input-scroll">
                  <table className="input-matrix">
                    <caption>
                      {system
                        ? 'Coeficientes de A e termos independentes b'
                        : 'Elementos da matriz A'}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Linha</th>
                        {a[0]!.map((_, j) => (
                          <th scope="col" key={j}>
                            {system ? 'x' : 'C'}
                            {j + 1}
                          </th>
                        ))}
                        {system && (
                          <th scope="col" className="rhs-cell">
                            b
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {a.map((row, i) => (
                        <tr key={i}>
                          <th scope="row">L{i + 1}</th>
                          {(system ? [...row, b[i]!] : row).map((value, j) => {
                            const id = `cell-${i}-${j}`;
                            return (
                              <td
                                key={j}
                                className={j === row.length ? 'rhs-cell' : ''}
                              >
                                <input
                                  id={id}
                                  aria-label={`Linha ${i + 1}, ${system ? (j === row.length ? 'termo independente' : `coeficiente x${j + 1}`) : `coluna ${j + 1}`}`}
                                  aria-invalid={error?.cell === id}
                                  aria-describedby={
                                    error?.cell === id
                                      ? 'input-error'
                                      : 'input-help'
                                  }
                                  value={value}
                                  maxLength={INPUT_LIMITS.scalarCharacters}
                                  autoComplete="off"
                                  spellCheck={false}
                                  onChange={(event) => {
                                    invalidate();
                                    if (j === row.length)
                                      setB(
                                        b.map((cell, k) =>
                                          k === i ? event.target.value : cell,
                                        ),
                                      );
                                    else
                                      setA(
                                        a.map((line, k) =>
                                          k === i
                                            ? line.map((cell, l) =>
                                                l === j
                                                  ? event.target.value
                                                  : cell,
                                              )
                                            : line,
                                        ),
                                      );
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {binary && (
                  <MatrixEditor
                    errorCell={error?.cell}
                    value={right}
                    onChange={(value) => {
                      invalidate();
                      setRight(value);
                    }}
                  />
                )}
                {operation === 'scale' && (
                  <label className="field">
                    Escalar
                    <input
                      id="scalar-input"
                      aria-invalid={error?.cell === 'scalar-input'}
                      aria-describedby={
                        error?.cell === 'scalar-input'
                          ? 'input-error'
                          : 'input-help'
                      }
                      aria-label="Escalar"
                      value={scalar}
                      maxLength={INPUT_LIMITS.scalarCharacters}
                      onChange={(event) => {
                        invalidate();
                        setScalar(event.target.value);
                      }}
                    />
                  </label>
                )}
                <p id="input-help" className="hint">
                  Aceita inteiros, frações como -1/3 e decimais como 0,5.
                  Células vazias precisam ser preenchidas; use 0 quando
                  necessário.
                </p>
                {operation === 'determinant' ? (
                  <>
                    <label className="field">
                      Método
                      <select
                        aria-label="Método"
                        value={detMethod}
                        onChange={(e) => {
                          invalidate();
                          setDetMethod(e.target.value as DeterminantMethod);
                        }}
                      >
                        {Object.entries(determinantLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    {detMethod === 'laplace' && (
                      <div className="dimensions">
                        <label className="field">
                          Expandir por
                          <select
                            aria-label="Expandir por"
                            value={axis}
                            onChange={(e) => {
                              invalidate();
                              setAxis(e.target.value as 'row' | 'column');
                            }}
                          >
                            <option value="row">Linha</option>
                            <option value="column">Coluna</option>
                          </select>
                        </label>
                        <label className="field">
                          Índice da expansão
                          <select
                            aria-label="Índice da expansão"
                            value={expansionIndex}
                            onChange={(e) => {
                              invalidate();
                              setExpansionIndex(Number(e.target.value));
                            }}
                          >
                            {Array.from({ length: 6 }, (_, i) => (
                              <option key={i} value={i}>
                                {i + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                    <p className="hint">
                      Exige matriz quadrada. O método selecionado será mantido;
                      dimensões ou índices incompatíveis serão informados ao
                      resolver.
                    </p>
                  </>
                ) : (
                  <label className="field">
                    Método
                    <select
                      aria-label="Método"
                      key={operation}
                      value={
                        system
                          ? systemMethod
                          : basic
                            ? 'entrywise'
                            : operation === 'inverse'
                              ? inverseMethod
                              : 'gauss-jordan'
                      }
                      onChange={(e) => {
                        invalidate();
                        if (operation === 'inverse')
                          setInverseMethod(
                            e.target.value as 'gauss-jordan' | 'adjugate',
                          );
                        else
                          setSystemMethod(
                            e.target.value as 'gauss' | 'cramer' | 'inverse',
                          );
                      }}
                    >
                      <option
                        value={
                          basic
                            ? 'entrywise'
                            : system
                              ? 'gauss'
                              : 'gauss-jordan'
                        }
                      >
                        {basic
                          ? operation === 'multiply'
                            ? 'Produto linha-coluna'
                            : 'Cálculo por elemento'
                          : system
                            ? 'Eliminação de Gauss'
                            : 'Gauss-Jordan'}
                      </option>
                      {system && (
                        <>
                          <option value="cramer">
                            Regra de Cramer (até ordem 4)
                          </option>
                          <option value="inverse">
                            Matriz inversa (até ordem 6)
                          </option>
                        </>
                      )}
                      {operation === 'inverse' && (
                        <option value="adjugate">
                          Adjunta e determinante (até ordem 4)
                        </option>
                      )}
                    </select>
                  </label>
                )}
                <p className="hint">
                  {basic
                    ? operation === 'multiply'
                      ? 'As colunas de A devem corresponder às linhas de B.'
                      : binary
                        ? 'A e B devem ter as mesmas dimensões.'
                        : 'Acompanhe o cálculo de cada elemento da saída.'
                    : operation === 'inverse'
                      ? inverseMethod === 'adjugate'
                        ? 'Acompanhe os cofatores, a transposição e a divisão pelo determinante.'
                        : 'A inversa exige uma matriz quadrada. O bloco identidade é acrescentado automaticamente.'
                      : operation === 'determinant'
                        ? 'Percorra os produtos, menores ou operações de linha do método escolhido.'
                        : 'Outros métodos serão adicionados nas próximas entregas.'}
                </p>
                {error && (
                  <p className="error" id="input-error" role="alert">
                    {error.message}
                  </p>
                )}
                {error && system && systemMethod !== 'gauss' && (
                  <button
                    type="button"
                    onClick={() => {
                      invalidate();
                      setSystemMethod('gauss');
                    }}
                  >
                    Selecionar Gauss
                  </button>
                )}
                {error &&
                  operation === 'inverse' &&
                  inverseMethod === 'adjugate' && (
                    <button
                      type="button"
                      onClick={() => {
                        invalidate();
                        setInverseMethod('gauss-jordan');
                      }}
                    >
                      Selecionar Gauss-Jordan
                    </button>
                  )}
                <button className="primary" type="submit">
                  Resolver passo a passo
                </button>
              </form>
            </section>
            <section
              className="solution-panel"
              aria-labelledby="solution-heading"
            >
              <h2 id="solution-heading" tabIndex={-1} ref={heading}>
                Resolução
              </h2>
              {result ? (
                result.method === 'components' ? null : result.method ===
                  'adjugate' ? (
                  <AdjugateSteps key={revision} result={result} />
                ) : result.method === 'cramer' ||
                  result.method === 'inverse' ? (
                  <SystemMethods
                    key={revision}
                    result={result}
                    onChooseGauss={() => {
                      invalidate();
                      setSystemMethod('gauss');
                    }}
                  />
                ) : result.method === 'entrywise' ? (
                  <MatrixSteps key={revision} result={result} />
                ) : 'proof' in result ? (
                  <DeterminantSteps key={revision} result={result} />
                ) : (
                  <Solution key={revision} result={result} />
                )
              ) : (
                <div className="empty-state">
                  <span aria-hidden="true">
                    {system
                      ? '[ A | b ]'
                      : operation === 'inverse'
                        ? '[ A | I ]'
                        : '[ A ]'}
                  </span>
                  <h3>
                    {system
                      ? 'O caminho começa com seu sistema.'
                      : 'O caminho começa com sua matriz.'}
                  </h3>
                  <p>
                    Confira os valores e clique em “Resolver passo a passo”. Ao
                    editar as entradas, resolva novamente para ver as novas
                    etapas.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
        <History
          draft={result && savable ? { operation, result } : null}
          revision={revision}
          onOpen={(saved) => {
            setOperation(saved.operation);
            setVectorSeed(saved.vectorInput);
            setVectorRevision((v) => v + 1);
            if (
              saved.operation === 'inverse' &&
              (saved.result.method === 'adjugate' ||
                saved.result.method === 'gauss-jordan')
            )
              setInverseMethod(saved.result.method);
            if (
              saved.operation === 'system' &&
              (saved.result.method === 'gauss' ||
                saved.result.method === 'cramer' ||
                saved.result.method === 'inverse')
            )
              setSystemMethod(saved.result.method);
            if (saved.operation !== 'vector') {
              setA(saved.a);
              setB(saved.b);
              setRight(saved.right ?? [['0']]);
              setScalar(saved.scalar ?? '1');
            }
            if (saved.determinantOptions) {
              setDetMethod(saved.determinantOptions.method);
              if (saved.determinantOptions.method === 'laplace') {
                setAxis(saved.determinantOptions.axis);
                setExpansionIndex(saved.determinantOptions.index);
              }
            }
            setError(null);
            setResult(saved.result);
            setSavable(false);
            setRevision((value) => value + 1);
          }}
        />
      </main>
      <footer>
        <span>Linear Steps · Feito para aprender.</span>
        <span>Histórico na sua conta · Exportação em desenvolvimento.</span>
      </footer>
    </div>
  );
}
