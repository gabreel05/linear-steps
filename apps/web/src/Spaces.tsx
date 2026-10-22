import { useEffect, useRef, useState, type FormEvent } from 'react';
import { INPUT_LIMITS } from '@linear-steps/contracts';
import { parseScalar } from '@linear-steps/math-core';
import { Math } from './Math';
import { Solution } from './Solution';
import {
  calculateSpan,
  spanDisplay,
  spanLabels,
  type SpanFormInput,
  type SpanResult,
} from './span-operations';

export function SpanSteps({ result }: { result: SpanResult }) {
  const display = spanDisplay(result);
  return (
    <>
      <h3>{display.title}</h3>
      {display.formulas.map((tex, i) => (
        <Math key={i} tex={tex} block />
      ))}
      {result.operation === 'span-basis' && (
        <>
          <p>
            {result.spansAmbientSpace
              ? 'O conjunto gera todo o espaço ambiente.'
              : 'O conjunto não gera todo o espaço ambiente.'}{' '}
            {result.isBasisOfAmbientSpace
              ? 'É uma base de Rⁿ.'
              : 'Não é uma base de Rⁿ.'}
          </p>
          <p>
            {result.basisIndices.length
              ? `Base selecionada dos vetores originais: ${result.basisIndices.map((i) => `v${i + 1}`).join(', ')}.`
              : 'O espaço gerado é {0}; sua base é vazia.'}
          </p>
          {!result.independent && (
            <p>
              A relação exibida tem coeficientes não todos nulos. As demais
              relações são descritas pelos parâmetros livres abaixo.
            </p>
          )}
        </>
      )}
      <h3>Sistema dos coeficientes</h3>
      <p>
        Cada coluna de A é um vetor informado. Nas etapas, x1, x2, … são os
        coeficientes que multiplicam v1, v2, …
        {result.operation === 'span-basis'
          ? ' Para testar LI/LD, resolvemos Ax = 0.'
          : ' Para representar b, resolvemos Ax = b.'}
      </p>
      <Math tex={display.setup} block />
      <Solution result={result.system} />
    </>
  );
}

export function SpanWorkspace({
  initial,
  result,
  revision,
  onInvalidate,
  onResult,
}: {
  initial?: SpanFormInput | undefined;
  result: SpanResult | null;
  revision: number;
  onInvalidate: () => void;
  onResult: (result: SpanResult) => void;
}) {
  const [operation, setOperation] = useState<SpanFormInput['operation']>(
    initial?.operation ?? 'span-basis',
  );
  const [vectors, setVectors] = useState(
    initial?.vectors ?? [
      ['1', '0', '0'],
      ['2', '0', '0'],
      ['0', '1', '0'],
    ],
  );
  const [target, setTarget] = useState(initial?.target ?? ['3', '2', '0']);
  const [error, setError] = useState<{ message: string; id?: string } | null>(
    null,
  );
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (result) heading.current?.focus();
  }, [result]);
  const invalidate = () => {
    onInvalidate();
    setError(null);
  };
  const resize = (count: number, dimension: number) => {
    invalidate();
    setVectors(
      Array.from({ length: count }, (_, i) =>
        Array.from({ length: dimension }, (_, j) => vectors[i]?.[j] ?? '0'),
      ),
    );
    setTarget(Array.from({ length: dimension }, (_, j) => target[j] ?? '0'));
  };
  const example = (kind: string) => {
    invalidate();
    if (kind === 'basis') {
      setVectors([
        ['1', '0'],
        ['0', '1'],
      ]);
      setTarget(['2', '3']);
    } else if (kind === 'zero') {
      setVectors([
        ['0', '0'],
        ['0', '0'],
      ]);
      setTarget(['0', '0']);
    } else {
      setVectors([
        ['1', '0', '0'],
        ['2', '0', '0'],
        ['0', '1', '0'],
      ]);
      setTarget(kind === 'outside' ? ['0', '0', '1'] : ['3', '2', '0']);
    }
  };
  const solve = (event: FormEvent) => {
    event.preventDefault();
    invalidate();
    const entries = vectors.flatMap((v, i) =>
      v.map((value, j) => ({
        value,
        id: `space-${i}-${j}`,
        label: `v${i + 1}, componente ${j + 1}`,
      })),
    );
    if (operation === 'linear-combination')
      entries.push(
        ...target.map((value, j) => ({
          value,
          id: `space-target-${j}`,
          label: `b, componente ${j + 1}`,
        })),
      );
    for (const entry of entries) {
      try {
        parseScalar(entry.value);
      } catch (cause) {
        setError({
          id: entry.id,
          message: `${entry.label}: ${cause instanceof Error ? cause.message : 'Entrada inválida.'}`,
        });
        document.getElementById(entry.id)?.focus();
        return;
      }
    }
    try {
      onResult(calculateSpan({ operation, vectors, target }));
    } catch (cause) {
      setError({
        message:
          cause instanceof Error ? cause.message : 'Não foi possível resolver.',
      });
    }
  };
  return (
    <div className="workspace">
      <section className="input-panel" aria-labelledby="space-input-heading">
        <h2 id="space-input-heading">Seus espaços vetoriais</h2>
        <form onSubmit={solve} noValidate>
          <label className="field">
            Operação de espaço vetorial
            <select
              aria-label="Operação de espaço vetorial"
              value={operation}
              onChange={(e) => {
                invalidate();
                setOperation(e.target.value as SpanFormInput['operation']);
              }}
            >
              {Object.entries(spanLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Exemplo de espaço vetorial
            <select
              aria-label="Exemplo de espaço vetorial"
              value=""
              onChange={(e) => example(e.target.value)}
            >
              <option value="" disabled>
                Escolha um exemplo
              </option>
              <option value="dependent">Conjunto dependente</option>
              <option value="basis">Base de R²</option>
              <option value="outside">Alvo fora do espaço gerado</option>
              <option value="zero">Espaço zero</option>
            </select>
          </label>
          <label className="field">
            Quantidade de vetores
            <select
              aria-label="Quantidade de vetores"
              value={vectors.length}
              onChange={(e) => resize(Number(e.target.value), target.length)}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Dimensão ambiente
            <select
              aria-label="Dimensão ambiente"
              value={target.length}
              onChange={(e) => resize(vectors.length, Number(e.target.value))}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <div className="input-scroll">
            <table className="input-matrix">
              <caption>Vetores nas colunas e vetor alvo b</caption>
              <thead>
                <tr>
                  <th scope="col">Componente</th>
                  {vectors.map((_, i) => (
                    <th key={i} scope="col">
                      v{i + 1}
                    </th>
                  ))}
                  {operation === 'linear-combination' && <th scope="col">b</th>}
                </tr>
              </thead>
              <tbody>
                {target.map((_, j) => (
                  <tr key={j}>
                    <th scope="row">{j + 1}</th>
                    {[
                      ...vectors,
                      ...(operation === 'linear-combination' ? [target] : []),
                    ].map((v, i) => {
                      const isTarget = i === vectors.length,
                        id = isTarget ? `space-target-${j}` : `space-${i}-${j}`;
                      return (
                        <td key={i}>
                          <input
                            id={id}
                            aria-label={`${isTarget ? 'b' : `v${i + 1}`}, componente ${j + 1}`}
                            value={v[j]}
                            aria-invalid={error?.id === id}
                            aria-describedby={
                              error?.id === id ? 'space-error' : 'space-help'
                            }
                            maxLength={INPUT_LIMITS.scalarCharacters}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(e) => {
                              invalidate();
                              if (isTarget)
                                setTarget(
                                  target.map((x, k) =>
                                    k === j ? e.target.value : x,
                                  ),
                                );
                              else
                                setVectors(
                                  vectors.map((row, k) =>
                                    k === i
                                      ? row.map((x, l) =>
                                          l === j ? e.target.value : x,
                                        )
                                      : row,
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
          <p id="space-help" className="hint">
            Vetores em Rⁿ, com inteiros, frações ou decimais. Método: eliminação
            de Gauss. A base é selecionada dos vetores originais.
          </p>
          {error && (
            <p id="space-error" role="alert" className="error">
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
        aria-labelledby="space-result-heading"
      >
        <h2 id="space-result-heading" tabIndex={-1} ref={heading}>
          Resolução de espaços vetoriais
        </h2>
        {result ? (
          <SpanSteps key={revision} result={result} />
        ) : (
          <p>Informe os vetores e resolva para acompanhar as etapas.</p>
        )}
      </section>
    </div>
  );
}
