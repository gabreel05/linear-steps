import { useEffect, useRef, useState, type FormEvent } from 'react';
import { INPUT_LIMITS, type GaussianSolution } from '@linear-steps/contracts';
import {
  MathInputError,
  parseScalar,
  solveGaussian,
} from '@linear-steps/math-core';
import { Solution } from './Solution';

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
  const [a, setA] = useState(examples[0]!.a);
  const [b, setB] = useState(examples[0]!.b);
  const [result, setResult] = useState<GaussianSolution | null>(null);
  const [error, setError] = useState<{ message: string; cell?: string } | null>(
    null,
  );
  const [revision, setRevision] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (result) heading.current?.focus();
  }, [result]);

  const invalidate = () => {
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
    setResult(null);
    setError(null);
    for (let i = 0; i < a.length; i++) {
      const row = [...a[i]!, b[i]!];
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
    try {
      setResult(solveGaussian(a, b));
      setRevision((value) => value + 1);
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
        <span className="status">Sistemas lineares · em desenvolvimento</span>
      </header>
      <main id="main">
        <section className="workspace-intro">
          <p className="eyebrow">ÁLGEBRA LINEAR · PASSO A PASSO</p>
          <h1>
            Resolva. <span>Entenda cada etapa.</span>
          </h1>
          <p>
            Escreva os coeficientes de Ax = b e acompanhe a eliminação de Gauss
            com frações exatas.
          </p>
        </section>
        <div className="workspace">
          <section className="input-panel" aria-labelledby="input-heading">
            <h2 id="input-heading">Seu sistema</h2>
            <label className="field">
              Carregar exemplo
              <select
                aria-label="Carregar exemplo"
                value=""
                onChange={(event) => {
                  const sample = examples[Number(event.target.value)];
                  if (!sample) return;
                  invalidate();
                  setA(sample.a.map((row) => [...row]));
                  setB([...sample.b]);
                }}
              >
                <option value="" disabled>
                  Escolha um exemplo
                </option>
                {examples.map((sample, i) => (
                  <option key={i} value={i}>
                    {sample.name}
                  </option>
                ))}
              </select>
            </label>
            <form onSubmit={solve} noValidate>
              <div className="dimensions">
                {(['Equações', 'Incógnitas'] as const).map((label, k) => (
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
                  <caption>Coeficientes de A e termos independentes b</caption>
                  <thead>
                    <tr>
                      <th scope="col">Linha</th>
                      {a[0]!.map((_, j) => (
                        <th scope="col" key={j}>
                          x{j + 1}
                        </th>
                      ))}
                      <th scope="col" className="rhs-cell">
                        b
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.map((row, i) => (
                      <tr key={i}>
                        <th scope="row">L{i + 1}</th>
                        {[...row, b[i]!].map((value, j) => {
                          const id = `cell-${i}-${j}`;
                          return (
                            <td
                              key={j}
                              className={j === row.length ? 'rhs-cell' : ''}
                            >
                              <input
                                id={id}
                                aria-label={`Linha ${i + 1}, ${j === row.length ? 'termo independente' : `coeficiente x${j + 1}`}`}
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
              <p id="input-help" className="hint">
                Aceita inteiros, frações como -1/3 e decimais como 0,5. Células
                vazias precisam ser preenchidas; use 0 quando necessário.
              </p>
              <label className="field">
                Método
                <select aria-label="Método">
                  <option value="gauss">Eliminação de Gauss</option>
                </select>
              </label>
              <p className="hint">
                Outros métodos serão adicionados nas próximas entregas.
              </p>
              {error && (
                <p className="error" id="input-error" role="alert">
                  {error.message}
                </p>
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
              <Solution key={revision} result={result} />
            ) : (
              <div className="empty-state">
                <span aria-hidden="true">[ A | b ]</span>
                <h3>O caminho começa com seu sistema.</h3>
                <p>
                  Confira os valores e clique em “Resolver passo a passo”. Ao
                  editar as entradas, resolva novamente para ver as novas
                  etapas.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <footer>
        <span>Linear Steps · Feito para aprender.</span>
        <span>Histórico e exportação em desenvolvimento.</span>
      </footer>
    </div>
  );
}
