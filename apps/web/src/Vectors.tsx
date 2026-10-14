import { useEffect, useRef, useState, type FormEvent } from 'react';
import { INPUT_LIMITS, type VectorResult } from '@linear-steps/contracts';
import { parseScalar } from '@linear-steps/math-core';
import { Math } from './Math';
import {
  calculateVector,
  vectorDisplay,
  vectorLabels,
  type VectorFormInput,
  type VectorOperation,
} from './vector-operations';

export function VectorSteps({ result }: { result: VectorResult }) {
  const [index, setIndex] = useState(0);
  const display = vectorDisplay(result),
    step = display.steps[index]!;
  return (
    <div>
      <h3>{vectorLabels[result.input.operation]}</h3>
      {display.notice && <p role="status">{display.notice}</p>}
      {display.summary && <Math block tex={display.summary} />}
      <nav className="step-navigation" aria-label="Etapas vetoriais">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Etapa vetorial anterior
        </button>
        <label>
          Etapa vetorial
          <select
            aria-label="Etapa vetorial"
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
          >
            {display.steps.map((s, i) => (
              <option key={i} value={i}>
                {i + 1} · {s.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={index === display.steps.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Próxima etapa vetorial
        </button>
      </nav>
      <h4>{step.title}</h4>
      <Math block tex={step.tex} />
    </div>
  );
}
export function VectorWorkspace({
  initial,
  result,
  revision,
  onInvalidate,
  onResult,
}: {
  initial?: VectorFormInput | undefined;
  result: VectorResult | null;
  revision: number;
  onInvalidate: () => void;
  onResult: (result: VectorResult) => void;
}) {
  const [operation, setOperation] = useState<VectorOperation>(
    initial?.operation ?? 'dot',
  );
  const [left, setLeft] = useState(initial?.left ?? ['2', '-1', '3']);
  const [right, setRight] = useState(initial?.right ?? ['4', '2', '-1']);
  const [scalar, setScalar] = useState(initial?.scalar ?? '2');
  const [error, setError] = useState<{ message: string; id?: string } | null>(
    null,
  );
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (result) heading.current?.focus();
  }, [result]);
  const unary = ['norm', 'normalize', 'scale'].includes(operation);
  const invalidate = () => {
    onInvalidate();
    setError(null);
  };
  const solve = (e: FormEvent) => {
    e.preventDefault();
    invalidate();
    const entries = [
      ...left.map((value, i) => ({
        value,
        id: `vector-u-${i}`,
        label: `u, componente ${i + 1}`,
      })),
      ...(!unary
        ? right.map((value, i) => ({
            value,
            id: `vector-v-${i}`,
            label: `v, componente ${i + 1}`,
          }))
        : []),
      ...(operation === 'scale'
        ? [{ value: scalar, id: 'vector-scalar', label: 'Escalar' }]
        : []),
    ];
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
      onResult(calculateVector({ operation, left, right, scalar }));
    } catch (cause) {
      setError({
        message:
          cause instanceof Error ? cause.message : 'Não foi possível resolver.',
      });
    }
  };
  const example = () => {
    invalidate();
    if (operation === 'projection') {
      setLeft(['1', '2', '2']);
      setRight(['1', '1', '0']);
    } else if (
      operation === 'angle' ||
      operation === 'normalize' ||
      operation === 'norm'
    ) {
      setLeft(['1', '1']);
      setRight(['1', '0']);
    } else {
      setLeft(['2', '-1', '3']);
      setRight(['4', '2', '-1']);
    }
    setScalar('2/3');
  };
  return (
    <div className="workspace">
      <section className="input-panel" aria-labelledby="vector-input-heading">
        <h2 id="vector-input-heading">Seus vetores</h2>
        <form onSubmit={solve} noValidate>
          <label className="field">
            Operação vetorial
            <select
              aria-label="Operação vetorial"
              value={operation}
              onChange={(e) => {
                invalidate();
                setOperation(e.target.value as VectorOperation);
              }}
            >
              {Object.entries(vectorLabels).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={example}>
            Carregar exemplo vetorial
          </button>
          <p className="hint">
            {operation === 'between-points'
              ? 'u é o ponto inicial e v é o ponto final. Calculamos v − u.'
              : operation === 'projection'
                ? 'Projetamos u sobre a direção v. A distância calculada é até a reta que passa pela origem.'
                : 'Componentes em coordenadas euclidianas.'}
          </p>
          <label className="field">
            Dimensão
            <select
              aria-label="Dimensão"
              value={left.length}
              onChange={(e) => {
                invalidate();
                const n = Number(e.target.value);
                setLeft(Array.from({ length: n }, (_, i) => left[i] ?? '0'));
                setRight(Array.from({ length: n }, (_, i) => right[i] ?? '0'));
              }}
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
              <caption>Componentes dos vetores</caption>
              <thead>
                <tr>
                  <th scope="col">Componente</th>
                  <th scope="col">u</th>
                  {!unary && <th scope="col">v</th>}
                </tr>
              </thead>
              <tbody>
                {left.map((_, i) => (
                  <tr key={i}>
                    <th scope="row">{i + 1}</th>
                    {(unary ? ['u'] : ['u', 'v']).map((name) => {
                      const id = `vector-${name}-${i}`;
                      return (
                        <td key={name}>
                          <input
                            id={id}
                            aria-label={`${name}, componente ${i + 1}`}
                            aria-invalid={error?.id === id}
                            aria-describedby={
                              error?.id === id ? 'vector-error' : 'vector-help'
                            }
                            value={(name === 'u' ? left : right)[i]}
                            maxLength={INPUT_LIMITS.scalarCharacters}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(e) => {
                              invalidate();
                              const update = (v: string[]) =>
                                v.map((cell, j) =>
                                  j === i ? e.target.value : cell,
                                );
                              if (name === 'u') setLeft(update);
                              else setRight(update);
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
          {operation === 'scale' && (
            <label className="field">
              Escalar
              <input
                id="vector-scalar"
                aria-label="Escalar vetorial"
                aria-invalid={error?.id === 'vector-scalar'}
                aria-describedby={
                  error?.id === 'vector-scalar' ? 'vector-error' : 'vector-help'
                }
                maxLength={INPUT_LIMITS.scalarCharacters}
                value={scalar}
                onChange={(e) => {
                  invalidate();
                  setScalar(e.target.value);
                }}
              />
            </label>
          )}
          <p id="vector-help" className="hint">
            Aceita inteiros, frações e decimais. Raízes aparecem apenas na
            saída. Método: cálculo por componentes.
          </p>
          {error && (
            <p role="alert" id="vector-error" className="error">
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
        aria-labelledby="vector-result-heading"
      >
        <h2 id="vector-result-heading" tabIndex={-1} ref={heading}>
          Resolução vetorial
        </h2>
        {result ? (
          <VectorSteps key={revision} result={result} />
        ) : (
          <p>Confira os componentes e resolva para acompanhar as etapas.</p>
        )}
      </section>
    </div>
  );
}
