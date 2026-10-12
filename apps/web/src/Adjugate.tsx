import { useState } from 'react';
import type { AdjugateInverseResult } from '@linear-steps/contracts';
import { Math } from './Math';
import { matrixTex, rationalTex } from './math-format';
import { DeterminantSteps } from './Determinant';

export function AdjugateSteps({ result }: { result: AdjugateInverseResult }) {
  const [index, setIndex] = useState(0);
  const labels = [
    'Determinante de A',
    ...result.steps.map((s) => `Cofator C${s.row + 1},${s.column + 1}`),
    'Matriz de cofatores e adjunta',
    'Conclusão',
  ];
  const step =
    index > 0 && index <= result.steps.length
      ? result.steps[index - 1]
      : undefined;
  return (
    <div>
      <h3>Inversa por adjunta</h3>
      {result.classification === 'singular' ? (
        <p role="status">
          Matriz singular — sem inversa: det(A) = 0. Os cofatores e a adjunta
          continuam definidos.
        </p>
      ) : (
        <Math block tex={`A^{-1}=${matrixTex(result.inverse)}`} />
      )}
      <nav aria-label="Etapas da adjunta" className="step-navigation">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Etapa anterior da adjunta
        </button>
        <label>
          Etapa da adjunta
          <select
            aria-label="Etapa da adjunta"
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
          >
            {labels.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={index === labels.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Próxima etapa da adjunta
        </button>
      </nav>
      {index === 0 ? (
        <DeterminantSteps result={result.determinant} />
      ) : step ? (
        <div>
          <h4>
            Cofator C{step.row + 1},{step.column + 1}
          </h4>
          <p>
            Retire a linha {step.row + 1} e a coluna {step.column + 1} de A.
          </p>
          <Math
            block
            tex={`C_{${step.row + 1},${step.column + 1}}=(-1)^{${step.row + 1}+${step.column + 1}}\\cdot(${rationalTex(step.determinant.value)})=${rationalTex(step.value)}`}
          />
          {'kind' in step.determinant ? (
            <p>Na ordem 1, o menor é vazio e seu determinante é 1.</p>
          ) : (
            <>
              <Math
                block
                tex={`M_{${step.row + 1},${step.column + 1}}=${matrixTex(step.minor)}`}
              />
              <DeterminantSteps key={index} result={step.determinant} />
            </>
          )}
        </div>
      ) : index === labels.length - 2 ? (
        <div>
          <h4>Matriz de cofatores e adjunta</h4>
          <Math block tex={`C=${matrixTex(result.cofactors)}`} />
          <Math
            block
            tex={`\\operatorname{adj}(A)=C^T=${matrixTex(result.adjugate)}`}
          />
        </div>
      ) : (
        <div>
          <h4>Conclusão</h4>
          {result.classification === 'singular' ? (
            <Math
              block
              tex={'\\det(A)=0\\;\\Longrightarrow\\; A^{-1}\\text{ não existe}'}
            />
          ) : (
            <Math
              block
              tex={`A^{-1}=\\frac{1}{\\det(A)}\\operatorname{adj}(A)=(${rationalTex(result.factor)})${matrixTex(result.adjugate)}=${matrixTex(result.inverse)}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
