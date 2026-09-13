import { fraction, type Fraction } from 'mathjs';
import { INPUT_LIMITS, type SerializedRational } from '@linear-steps/contracts';
import { MathInputError } from './errors';

/** Immutable domain value. The mutable library object never crosses this boundary. */
export class Rational {
  readonly #value: Fraction;

  private constructor(value: Fraction) {
    if (
      value.n.toString().length > INPUT_LIMITS.rationalDigits ||
      value.d.toString().length > INPUT_LIMITS.rationalDigits
    ) {
      throw new MathInputError(
        'ARITHMETIC_LIMIT',
        'O cálculo excedeu o limite de precisão exata permitido.',
      );
    }
    this.#value = value;
    Object.freeze(this);
  }

  static fromIntegers(numerator: bigint, denominator: bigint = 1n): Rational {
    if (denominator === 0n) {
      throw new MathInputError(
        'DIVISION_BY_ZERO',
        'O denominador não pode ser zero.',
      );
    }
    for (const part of [numerator, denominator]) {
      if (
        part.toString().replace('-', '').length > INPUT_LIMITS.rationalDigits
      ) {
        throw new MathInputError(
          'ARITHMETIC_LIMIT',
          'O racional excedeu o limite de dígitos permitido.',
        );
      }
    }
    return new Rational(fraction(numerator, denominator));
  }

  /** Accept only the canonical JSON representation, including for computed values. */
  static fromJSON(input: unknown): Rational {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new MathInputError(
        'INVALID_RATIONAL',
        'O racional deve conter numerador e denominador como strings.',
      );
    }
    const value = input as Record<string, unknown>;
    const n = value['numerator'];
    const d = value['denominator'];
    if (
      Object.keys(value).length !== 2 ||
      typeof n !== 'string' ||
      typeof d !== 'string' ||
      n.length > INPUT_LIMITS.rationalDigits + 1 ||
      d.length > INPUT_LIMITS.rationalDigits ||
      !/^-?(0|[1-9]\d*)$/.test(n) ||
      !/^[1-9]\d*$/.test(d)
    ) {
      throw new MathInputError(
        'INVALID_RATIONAL',
        'Formato de racional inválido ou limite de dígitos excedido.',
      );
    }
    const result = Rational.fromIntegers(BigInt(n), BigInt(d));
    const canonical = result.toJSON();
    if (canonical.numerator !== n || canonical.denominator !== d) {
      throw new MathInputError(
        'INVALID_RATIONAL',
        'O racional deve estar reduzido, com denominador positivo e zero como 0/1.',
      );
    }
    return result;
  }

  add(other: Rational): Rational {
    return new Rational(this.#value.add(other.#value));
  }
  subtract(other: Rational): Rational {
    return new Rational(this.#value.sub(other.#value));
  }
  multiply(other: Rational): Rational {
    return new Rational(this.#value.mul(other.#value));
  }
  divide(other: Rational): Rational {
    if (other.isZero())
      throw new MathInputError(
        'DIVISION_BY_ZERO',
        'Não é possível dividir por zero.',
      );
    return new Rational(this.#value.div(other.#value));
  }
  negate(): Rational {
    return new Rational(this.#value.neg());
  }
  abs(): Rational {
    return new Rational(this.#value.abs());
  }
  equals(other: Rational): boolean {
    return this.#value.equals(other.#value);
  }
  isZero(): boolean {
    return this.#value.n === 0n;
  }

  toJSON(): SerializedRational {
    return Object.freeze({
      numerator: (this.#value.s * this.#value.n).toString(),
      denominator: this.#value.d.toString(),
    });
  }

  toString(): string {
    const { numerator, denominator } = this.toJSON();
    return denominator === '1' ? numerator : `${numerator}/${denominator}`;
  }
}
