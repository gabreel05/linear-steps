import type { DotProof, ExactReal } from '@linear-steps/contracts';
import type { RationalVector } from './input';
import { Rational } from './rational';
const zero = Rational.fromIntegers(0n);
export function dot(a: RationalVector, b: RationalVector): DotProof {
  let sum = zero;
  const terms = a.map((left, index) => {
    const right = b[index]!;
    const product = left.multiply(right);
    sum = sum.add(product);
    return Object.freeze({
      index,
      left: left.toJSON(),
      right: right.toJSON(),
      product: product.toJSON(),
      partialSum: sum.toJSON(),
    });
  });
  return Object.freeze({ terms: Object.freeze(terms), value: sum.toJSON() });
}
// Integer Newton iteration avoids floating-point conversion, including for large rationals.
function integerRoot(n: bigint): bigint {
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) {
    const next = (x + n / x) / 2n;
    if (next >= x) return x;
    x = next;
  }
}
export function root(value: Rational): ExactReal {
  const r = value.toJSON(),
    n = BigInt(r.numerator),
    d = BigInt(r.denominator);
  const sn = integerRoot(n),
    sd = integerRoot(d);
  return sn * sn === n && sd * sd === d
    ? Object.freeze({
        kind: 'rational',
        value: Rational.fromIntegers(sn, sd).toJSON(),
      })
    : Object.freeze({ kind: 'sqrt', radicand: r });
}
export function overRoot(value: Rational, radicand: Rational): ExactReal {
  if (value.isZero())
    return Object.freeze({ kind: 'rational', value: zero.toJSON() });
  const denominator = root(radicand);
  return denominator.kind === 'rational'
    ? Object.freeze({
        kind: 'rational',
        value: value.divide(Rational.fromJSON(denominator.value)).toJSON(),
      })
    : Object.freeze({
        kind: 'quotient-sqrt',
        numerator: value.toJSON(),
        radicand: radicand.toJSON(),
      });
}
