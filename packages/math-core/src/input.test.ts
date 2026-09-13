import { describe, expect, it } from 'vitest';
import { parseLinearSystem, parseMatrix, parseVector } from './input';
import { MathInputError } from './errors';

describe('vector, matrix and system input', () => {
  it('parses rectangular matrices and snapshots their input', () => {
    const input = [
      ['1', '0,5', '-1/3'],
      ['0', '2', '4'],
    ];
    const result = parseMatrix(input);
    input[0]![0] = '99';
    expect(result.map((row) => row.map(String))).toEqual([
      ['1', '1/2', '-1/3'],
      ['0', '2', '4'],
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.every(Object.isFrozen)).toBe(true);
  });

  it('accepts the dimension bounds including six equations and six unknowns', () => {
    expect(parseMatrix([['1']])[0]![0]!.toString()).toBe('1');
    const system = parseLinearSystem(
      Array.from({ length: 6 }, () => Array<string>(6).fill('1')),
      Array<string>(6).fill('0'),
    );
    expect(system.coefficients).toHaveLength(6);
    expect(system.constants).toHaveLength(6);
    expect(Object.isFrozen(system)).toBe(true);
  });

  it.each([
    [],
    [['1'], ['2', '3']],
    [[]],
    Array.from({ length: 7 }, () => ['1']),
    [Array<string>(7).fill('1')],
    [null],
    Array(2),
    [['1', undefined]],
    [['a']],
  ])('rejects malformed matrix %#', (input) => {
    expect(() => parseMatrix(input)).toThrowError(MathInputError);
  });

  it.each([[], Array(2), ['0', '1/0'], [1, 2], Array<string>(7).fill('1')])(
    'rejects malformed vector %#',
    (input) => {
      expect(() => parseVector(input)).toThrowError(MathInputError);
    },
  );

  it('requires exactly one constant per equation', () => {
    expect(() =>
      parseLinearSystem(
        [
          ['1', '2'],
          ['3', '4'],
        ],
        ['5'],
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_DIMENSIONS' }));
    expect(
      parseLinearSystem([['1', '2', '3']], ['4']).constants[0]!.toString(),
    ).toBe('4');
  });
});
