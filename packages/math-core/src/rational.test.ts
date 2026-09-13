import { describe, expect, it } from 'vitest';
import { INPUT_LIMITS } from '@linear-steps/contracts';
import { MathInputError } from './errors';
import { parseScalar } from './input';
import { Rational } from './rational';

describe('exact scalar input', () => {
  it.each([
    ['0,1', '1/10'],
    ['0.1', '1/10'],
    ['1/10', '1/10'],
    ['  -6 / -8  ', '3/4'],
    ['+6/-8', '-3/4'],
    ['-0.000', '0'],
    ['0/-5', '0'],
    ['+00012', '12'],
    ['-12.50', '-25/2'],
    ['9007199254740993', '9007199254740993'],
    ['9007199254740993.01', '900719925474099301/100'],
    ['0.000000000001', '1/1000000000000'],
    ['99999999999999999999999999999999', '99999999999999999999999999999999'],
  ])('parses %s as %s', (input, expected) => {
    expect(parseScalar(input).toString()).toBe(expected);
  });

  it.each([
    '',
    ' ',
    'a',
    '√2',
    'sqrt(2)',
    '1+2',
    '1e3',
    'NaN',
    'Infinity',
    '0.(3)',
    '1 2',
    '1,000.5',
    '1/2/3',
    '1.5/2',
    '.5',
    '1.',
    '--1',
    null,
    undefined,
    0.1,
    {},
    [],
  ])('rejects unsupported input %s', (input) => {
    expect(() => parseScalar(input)).toThrowError(MathInputError);
  });

  it.each(['1/0', '0/0', '1/-0'])('rejects zero denominator %s', (input) => {
    expect(() => parseScalar(input)).toThrowError(
      expect.objectContaining({ code: 'DIVISION_BY_ZERO' }),
    );
  });

  it.each([
    '1'.repeat(33),
    `1/${'1'.repeat(33)}`,
    `0.${'1'.repeat(13)}`,
    ' '.repeat(129),
  ])('enforces input limits for %s', (input) => {
    expect(() => parseScalar(input)).toThrowError(
      expect.objectContaining({ code: 'INPUT_LIMIT' }),
    );
  });
});

describe('rational arithmetic and serialization', () => {
  it('adds finite decimals exactly', () => {
    expect(parseScalar('0.1').add(parseScalar('0.2')).toString()).toBe('3/10');
  });

  it('keeps operands and serialized snapshots immutable', () => {
    const a = parseScalar('-2/3');
    const b = parseScalar('5/7');
    const snapshot = a.toJSON();
    expect(a.add(b).toString()).toBe('1/21');
    expect(a.subtract(b).toString()).toBe('-29/21');
    expect(a.multiply(b).toString()).toBe('-10/21');
    expect(a.divide(b).toString()).toBe('-14/15');
    expect(a.negate().toString()).toBe('2/3');
    expect(a.abs().toString()).toBe('2/3');
    expect(a.toJSON()).toEqual(snapshot);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(b.toString()).toBe('5/7');
  });

  it('compares normalized values and recognizes zero', () => {
    expect(parseScalar('2/4').equals(parseScalar('0,5'))).toBe(true);
    expect(parseScalar('-2/4').equals(parseScalar('0,5'))).toBe(false);
    expect(parseScalar('0').isZero()).toBe(true);
    expect(parseScalar('1').isZero()).toBe(false);
    expect(() => parseScalar('1').divide(parseScalar('0'))).toThrowError(
      expect.objectContaining({ code: 'DIVISION_BY_ZERO' }),
    );
  });

  it('round-trips computed values beyond the user-input digit limit through JSON', () => {
    const value = parseScalar('9'.repeat(32)).multiply(
      parseScalar('9'.repeat(32)),
    );
    expect(
      Rational.fromJSON(JSON.parse(JSON.stringify(value))).equals(value),
    ).toBe(true);
    expect(JSON.stringify(parseScalar('-2/4'))).toBe(
      '{"numerator":"-1","denominator":"2"}',
    );
  });

  it.each([
    null,
    [],
    {},
    { numerator: 1, denominator: 2 },
    { numerator: '1', denominator: '0' },
    { numerator: '1', denominator: '-2' },
    { numerator: '2', denominator: '4' },
    { numerator: '-0', denominator: '1' },
    { numerator: '0', denominator: '2' },
    { numerator: '01', denominator: '2' },
    { numerator: '+1', denominator: '2' },
    { numerator: '1.5', denominator: '2' },
    { numerator: '1', denominator: '2', extra: true },
    {
      numerator: '1'.repeat(INPUT_LIMITS.rationalDigits + 2),
      denominator: '1',
    },
  ])('rejects malformed or noncanonical JSON %#', (input) => {
    expect(() => Rational.fromJSON(input)).toThrowError(MathInputError);
  });

  it('stops oversized arithmetic instead of silently approximating', () => {
    const large = Rational.fromIntegers(10n ** 4095n);
    expect(() => large.multiply(large)).toThrowError(
      expect.objectContaining({ code: 'ARITHMETIC_LIMIT' }),
    );
  });

  it('agrees with independent BigInt cross-products over signed operands', () => {
    // Independent oracle: compare unreduced integer ratios by cross multiplication.
    function assertRatio(result: Rational, n: bigint, d: bigint) {
      const value = result.toJSON();
      expect(BigInt(value.numerator) * d).toBe(n * BigInt(value.denominator));
      expect(BigInt(value.denominator) > 0n).toBe(true);
    }
    for (let i = -25n; i <= 25n; i++) {
      const n = i * 9007199254740993n;
      const d = 2n * (i < 0n ? -i : i) + 1n;
      const m = 3n * i + 2n;
      const e = d + 6n;
      const a = Rational.fromIntegers(n, d);
      const b = Rational.fromIntegers(m, e);
      assertRatio(a.add(b), n * e + m * d, d * e);
      assertRatio(a.subtract(b), n * e - m * d, d * e);
      assertRatio(a.multiply(b), n * m, d * e);
      assertRatio(a.divide(b), n * e, d * m);
    }
  });
});
