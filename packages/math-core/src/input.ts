import { INPUT_LIMITS } from '@linear-steps/contracts';
import { MathInputError } from './errors';
import { Rational } from './rational';

function checkIntegerDigits(text: string): void {
  if (text.replace(/^[+-]/, '').length > INPUT_LIMITS.integerDigits) {
    throw new MathInputError(
      'INPUT_LIMIT',
      `Use no máximo ${INPUT_LIMITS.integerDigits} dígitos por inteiro.`,
    );
  }
}

/** Scalar grammar only: never evaluate expressions or convert input through Number. */
export function parseScalar(input: unknown): Rational {
  if (typeof input !== 'string') {
    throw new MathInputError(
      'INVALID_SCALAR',
      'Informe o número como texto para preservar sua precisão.',
    );
  }
  if (input.length > INPUT_LIMITS.scalarCharacters) {
    throw new MathInputError(
      'INPUT_LIMIT',
      'A entrada numérica é longa demais.',
    );
  }
  const text = input.trim();
  if (/^[+-]?\d+$/.test(text)) {
    checkIntegerDigits(text);
    return Rational.fromIntegers(BigInt(text));
  }
  const ratio = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(text);
  if (ratio) {
    const n = ratio[1]!;
    const d = ratio[2]!;
    checkIntegerDigits(n);
    checkIntegerDigits(d);
    return Rational.fromIntegers(BigInt(n), BigInt(d));
  }
  const decimal = /^([+-]?)(\d+)[.,](\d+)$/.exec(text);
  if (decimal) {
    const sign = decimal[1] === '-' ? -1n : 1n;
    const whole = decimal[2]!;
    const digits = decimal[3]!;
    checkIntegerDigits(whole);
    if (digits.length > INPUT_LIMITS.decimalPlaces) {
      throw new MathInputError(
        'INPUT_LIMIT',
        `Use no máximo ${INPUT_LIMITS.decimalPlaces} casas decimais.`,
      );
    }
    return Rational.fromIntegers(
      sign * BigInt(whole + digits),
      10n ** BigInt(digits.length),
    );
  }
  throw new MathInputError(
    'INVALID_SCALAR',
    'Use um inteiro, decimal (0,5 ou 0.5) ou fração de inteiros (1/2).',
  );
}

export type RationalVector = readonly Rational[];
export type RationalMatrix = readonly RationalVector[];
export type LinearSystemInput = Readonly<{
  coefficients: RationalMatrix;
  constants: RationalVector;
}>;

function dimension(value: unknown): asserts value is unknown[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > INPUT_LIMITS.dimension
  ) {
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      `Use dimensões entre 1 e ${INPUT_LIMITS.dimension}.`,
    );
  }
}

export function parseVector(input: unknown): RationalVector {
  dimension(input);
  // Array.from visits holes too; sparse arrays must not bypass scalar validation.
  return Object.freeze(Array.from(input, parseScalar));
}

export function parseMatrix(input: unknown): RationalMatrix {
  dimension(input);
  const rows = Array.from(input, parseVector);
  if (rows.some((row) => row.length !== rows[0]!.length)) {
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'Todas as linhas devem ter a mesma quantidade de colunas.',
    );
  }
  return Object.freeze(rows);
}

export function parseLinearSystem(
  coefficients: unknown,
  constants: unknown,
): LinearSystemInput {
  const matrix = parseMatrix(coefficients);
  const vector = parseVector(constants);
  if (matrix.length !== vector.length) {
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'Informe um termo independente para cada equação.',
    );
  }
  return Object.freeze({ coefficients: matrix, constants: vector });
}
