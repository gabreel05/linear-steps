import { useState } from 'react';
import type {
  CramerResult,
  InverseSystemResult,
} from '@linear-steps/contracts';
import { Math } from './Math';
import { matrixTex, rationalTex } from './math-format';
import { DeterminantSteps } from './Determinant';
import { Solution } from './Solution';
export function SystemMethods({
  result,
  onChooseGauss,
}: {
  result: CramerResult | InverseSystemResult;
  onChooseGauss: () => void;
}) {
  const [index, setIndex] = useState(0);
  const cramer = result.method === 'cramer';
  const count = result.status === 'unique' ? result.steps.length + 1 : 1;
  return (
    <div>
      <h3>{cramer ? 'Sistema por Cramer' : 'Sistema pela matriz inversa'}</h3>
      {result.status === 'not-applicable' ? (
        <div role="status">
          <p>
            Este método não se aplica: a matriz é singular. Isso não determina
            se o sistema tem infinitas soluções ou nenhuma solução.
          </p>
          <button type="button" onClick={onChooseGauss}>
            Selecionar Gauss
          </button>
        </div>
      ) : (
        <Math block tex={`x=${matrixTex(result.solution.map((v) => [v]))}`} />
      )}
      <nav aria-label="Etapas do método" className="step-navigation">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Etapa anterior do método
        </button>
        <label>
          Etapa do método
          <select
            aria-label="Etapa do método"
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
          >
            {Array.from({ length: count }, (_, i) => (
              <option key={i} value={i}>
                {i === 0
                  ? cramer
                    ? 'Determinante de A'
                    : 'Cálculo da inversa'
                  : `Cálculo de x${i}`}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={index === count - 1}
          onClick={() => setIndex(index + 1)}
        >
          Próxima etapa do método
        </button>
      </nav>
      {index === 0 ? (
        cramer ? (
          <DeterminantSteps result={result.determinant} />
        ) : (
          <Solution result={result.inverse} />
        )
      ) : (
        result.status === 'unique' &&
        (result.method === 'cramer' ? (
          <div>
            <h4>Substituição da coluna {index} por b</h4>
            <Math
              block
              tex={`A_{${index}}=${matrixTex(result.steps[index - 1]!.replaced)}`}
            />
            <Math
              block
              tex={`x_{${index}}=\\frac{\\det(A_{${index}})}{\\det(A)}=\\frac{${rationalTex(result.steps[index - 1]!.determinant.value)}}{${rationalTex(result.steps[index - 1]!.divisor)}}=${rationalTex(result.steps[index - 1]!.value)}`}
            />
            <DeterminantSteps
              key={index}
              result={result.steps[index - 1]!.determinant}
            />
          </div>
        ) : (
          <div>
            <h4>Produto da linha {index} de A⁻¹ por b</h4>
            <Math
              block
              tex={`x_{${index}}=${result.steps[index - 1]!.terms.map((t) => `(${rationalTex(t.coefficient)})\\cdot(${rationalTex(t.constant)})`).join('+')}=${rationalTex(result.steps[index - 1]!.value)}`}
            />
          </div>
        ))
      )}
    </div>
  );
}
