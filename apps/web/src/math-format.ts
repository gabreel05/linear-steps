import type {
  AffineValue,
  GaussianSolution,
  GaussianStep,
  SerializedRational,
  SerializedVector,
} from '@linear-steps/contracts';

export function rationalTex(value: SerializedRational): string {
  const { numerator: n, denominator: d } = value;
  if (d === '1') return n;
  return `${n.startsWith('-') ? '-' : ''}\\frac{${n.replace('-', '')}}{${d}}`;
}

export function decimalText(value: SerializedRational): string {
  const n = BigInt(value.numerator);
  const d = BigInt(value.denominator);
  const absolute = n < 0n ? -n : n;
  const scale = 1000000n;
  const rounded = (absolute * scale * 2n + d) / (2n * d);
  const digits = (rounded % scale)
    .toString()
    .padStart(6, '0')
    .replace(/0+$/, '');
  return `${n < 0n && rounded !== 0n ? '-' : ''}${rounded / scale}${digits ? `,${digits}` : ''}`;
}

export function affineTex(value: AffineValue): string {
  let text =
    value.constant.numerator === '0' ? '' : rationalTex(value.constant);
  value.parameters.forEach((coefficient, k) => {
    if (coefficient.numerator === '0') return;
    const negative = coefficient.numerator.startsWith('-');
    const absolute = {
      ...coefficient,
      numerator: coefficient.numerator.replace('-', ''),
    };
    const unit = absolute.numerator === absolute.denominator;
    text += `${negative ? '-' : text ? '+' : ''}${unit ? '' : rationalTex(absolute)}t_{${k + 1}}`;
  });
  return text || '0';
}

const vectorTex = (values: SerializedVector) =>
  `\\begin{pmatrix}${values.map(rationalTex).join('\\\\')}\\end{pmatrix}`;

export function solutionTex(result: GaussianSolution): string {
  if (result.classification === 'unique') {
    return `\\begin{aligned}${result.solution.map((value, i) => `x_{${i + 1}}&=${rationalTex(value)}`).join('\\\\')}\\end{aligned}`;
  }
  if (result.classification === 'inconsistent') {
    const row = result.echelon[result.contradictionRow]!;
    return `0=${rationalTex(row[row.length - 1]!)}\\quad\\Longrightarrow\\quad S=\\varnothing`;
  }
  return `x=${vectorTex(result.particular)}${result.directions.map((direction, i) => `+t_{${i + 1}}${vectorTex(direction)}`).join('')}\\quad t_{1}${result.directions.length > 1 ? `,\\ldots,t_{${result.directions.length}}` : ''}\\in\\mathbb{R}`;
}

export function stepTitle(step: GaussianStep): string {
  switch (step.kind) {
    case 'initial':
      return 'Matriz aumentada inicial';
    case 'pivot':
      return `Pivô na linha ${step.pivot.row + 1}, coluna ${step.pivot.column + 1}`;
    case 'swap':
      return `Trocar linhas ${step.rows[0] + 1} e ${step.rows[1] + 1}`;
    case 'add-row':
      return `Alterar linha ${step.target + 1} usando a linha ${step.source + 1}`;
    case 'free-variable':
      return `Variável livre x${step.column + 1}`;
    case 'back-substitute':
      return `Retrosubstituição: x${step.column + 1}`;
    case 'conclusion':
      return 'Conclusão';
  }
}

export function stepTex(
  step: GaussianStep,
  result: GaussianSolution,
): string | null {
  switch (step.kind) {
    case 'initial':
    case 'pivot':
      return null;
    case 'swap':
      return `L_{${step.rows[0] + 1}}\\leftrightarrow L_{${step.rows[1] + 1}}`;
    case 'add-row': {
      const negative = step.factor.numerator.startsWith('-');
      const absolute = {
        ...step.factor,
        numerator: step.factor.numerator.replace('-', ''),
      };
      const factor =
        absolute.numerator === absolute.denominator
          ? ''
          : rationalTex(absolute);
      return `L_{${step.target + 1}}\\leftarrow L_{${step.target + 1}}${negative ? '-' : '+'}${factor}L_{${step.source + 1}}`;
    }
    case 'free-variable':
      return `x_{${step.column + 1}}=${affineTex(step.value)}`;
    case 'back-substitute': {
      const terms = step.terms
        .map(
          (term) =>
            `\\left(${rationalTex(term.coefficient)}\\right)\\left(${affineTex(term.value)}\\right)`,
        )
        .join('+');
      return `x_{${step.column + 1}}=\\frac{${rationalTex(step.rhs)}${terms ? `-\\left[${terms}\\right]` : ''}}{${rationalTex(step.divisor)}}=${affineTex(step.value)}`;
    }
    case 'conclusion':
      return solutionTex(result);
  }
}
