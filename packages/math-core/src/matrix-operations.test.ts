import { describe, expect, it } from 'vitest';
import type {
  MatrixOperationResult,
  SerializedMatrix,
} from '@linear-steps/contracts';
import {
  addMatrices,
  subtractMatrices,
  scaleMatrix,
  multiplyMatrices,
  transposeMatrix,
} from './index';
import { Rational } from './rational';

const text = (matrix: SerializedMatrix) =>
  matrix.map((row) => row.map((v) => Rational.fromJSON(v).toString()));
const a = [
  ['1/2', '-2', '3'],
  ['0', '1/3', '4'],
];
const b = [
  ['2', '1'],
  ['3', '-1'],
  ['-2', '4'],
];

function checkTrace(output: MatrixOperationResult) {
  expect(output.steps).toHaveLength(
    output.result.length * output.result[0]!.length,
  );
  const input = output.input;
  for (const [position, step] of output.steps.entries()) {
    expect([step.row, step.column]).toEqual([
      Math.floor(position / output.result[0]!.length),
      position % output.result[0]!.length,
    ]);
    expect(step.kind).toBe(input.operation);
    let value: Rational;
    if (step.kind === 'add' || step.kind === 'subtract') {
      if (input.operation !== 'add' && input.operation !== 'subtract')
        throw Error('input');
      expect(step.left).toEqual(input.left[step.row]![step.column]);
      expect(step.right).toEqual(input.right[step.row]![step.column]);
      const left = Rational.fromJSON(step.left);
      const right = Rational.fromJSON(step.right);
      value = step.kind === 'add' ? left.add(right) : left.subtract(right);
    } else if (step.kind === 'scale') {
      if (input.operation !== 'scale') throw Error('input');
      expect(step.scalar).toEqual(input.scalar);
      expect(step.operand).toEqual(input.matrix[step.row]![step.column]);
      value = Rational.fromJSON(step.scalar).multiply(
        Rational.fromJSON(step.operand),
      );
    } else if (step.kind === 'multiply') {
      if (input.operation !== 'multiply') throw Error('input');
      expect(step.terms).toHaveLength(input.left[0]!.length);
      value = Rational.fromIntegers(0n);
      for (const [k, term] of step.terms.entries()) {
        expect(term.index).toBe(k);
        expect(term.left).toEqual(input.left[step.row]![k]);
        expect(term.right).toEqual(input.right[k]![step.column]);
        const product = Rational.fromJSON(term.left).multiply(
          Rational.fromJSON(term.right),
        );
        expect(term.product).toEqual(product.toJSON());
        value = value.add(product);
      }
    } else {
      if (step.kind !== 'transpose' || input.operation !== 'transpose')
        throw Error('input');
      expect([step.sourceRow, step.sourceColumn]).toEqual([
        step.column,
        step.row,
      ]);
      value = Rational.fromJSON(
        input.matrix[step.sourceRow]![step.sourceColumn],
      );
    }
    expect(step.value).toEqual(value.toJSON());
    expect(output.result[step.row]![step.column]).toEqual(step.value);
  }
}

function frozen(value: unknown) {
  if (value && typeof value === 'object') {
    expect(Object.isFrozen(value)).toBe(true);
    Object.values(value).forEach(frozen);
  }
}

describe('exact matrix operations', () => {
  it('adds and subtracts rectangular matrices with fractions and decimals', () => {
    const x = [
      ['0.1', '-1/2'],
      ['3', '0'],
    ];
    const y = [
      ['0,2', '1/3'],
      ['-4', '2/5'],
    ];
    expect(text(addMatrices(x, y).result)).toEqual([
      ['3/10', '-1/6'],
      ['-1', '2/5'],
    ]);
    expect(text(subtractMatrices(x, y).result)).toEqual([
      ['-1/10', '-5/6'],
      ['7', '-2/5'],
    ]);
  });

  it('scales every entry, including negative and zero scalars', () => {
    expect(text(scaleMatrix(a, '-3/2').result)).toEqual([
      ['-3/4', '3', '-9/2'],
      ['0', '-1/2', '-6'],
    ]);
    expect(text(scaleMatrix(a, '0').result)).toEqual([
      ['0', '0', '0'],
      ['0', '0', '0'],
    ]);
  });

  it('multiplies a 2×3 matrix by a 3×2 matrix using row-column sums', () => {
    expect(text(multiplyMatrices(a, b).result)).toEqual([
      ['-11', '29/2'],
      ['-7', '47/3'],
    ]);
  });

  it('distinguishes AB from BA and handles row and column vectors', () => {
    expect(text(multiplyMatrices([['1', '2']], [['3'], ['4']]).result)).toEqual(
      [['11']],
    );
    expect(text(multiplyMatrices([['3'], ['4']], [['1', '2']]).result)).toEqual(
      [
        ['3', '6'],
        ['4', '8'],
      ],
    );
  });

  it('transposes rectangular matrices and reverses itself', () => {
    const transposed = transposeMatrix(a);
    expect(text(transposed.result)).toEqual([
      ['1/2', '0'],
      ['-2', '1/3'],
      ['3', '4'],
    ]);
    expect(text(transposeMatrix(text(transposed.result)).result)).toEqual(a);
  });

  it('preserves integers beyond Number precision', () => {
    expect(
      text(multiplyMatrices([['9007199254740993']], [['3']]).result),
    ).toEqual([['27021597764222979']]);
  });

  it('satisfies distributivity and transpose of a product', () => {
    const c = [
      ['1', '2'],
      ['0', '-1'],
      ['1/2', '0'],
    ];
    expect(multiplyMatrices(a, text(addMatrices(b, c).result)).result).toEqual(
      addMatrices(
        text(multiplyMatrices(a, b).result),
        text(multiplyMatrices(a, c).result),
      ).result,
    );
    expect(transposeMatrix(text(multiplyMatrices(a, b).result)).result).toEqual(
      multiplyMatrices(
        text(transposeMatrix(b).result),
        text(transposeMatrix(a).result),
      ).result,
    );
  });

  it('supports all allowed rectangular shapes and identity multiplication', () => {
    for (let rows = 1; rows <= 6; rows++) {
      for (let columns = 1; columns <= 6; columns++) {
        const matrix = Array.from({ length: rows }, (_, i) =>
          Array.from({ length: columns }, (_, j) => String(i - j)),
        );
        const identity = Array.from({ length: columns }, (_, i) =>
          Array.from({ length: columns }, (_, j) => (i === j ? '1' : '0')),
        );
        expect(text(multiplyMatrices(matrix, identity).result)).toEqual(matrix);
        expect(
          text(transposeMatrix(text(transposeMatrix(matrix).result)).result),
        ).toEqual(matrix);
      }
    }
  });

  it('records replayable immutable steps and JSON-safe inputs without mutating callers', () => {
    const original = JSON.stringify([a, b]);
    for (const output of [
      addMatrices(a, a),
      subtractMatrices(a, a),
      scaleMatrix(a, '2/3'),
      multiplyMatrices(a, b),
      transposeMatrix(a),
    ]) {
      checkTrace(output);
      frozen(output);
      expect(JSON.parse(JSON.stringify(output))).toEqual(output);
    }
    expect(JSON.stringify([a, b])).toBe(original);
    const mutable = [['1']];
    const output = transposeMatrix(mutable);
    mutable[0]![0] = '9';
    expect(text(output.result)).toEqual([['1']]);
  });

  it('rejects incompatible dimensions instead of truncating or broadcasting', () => {
    for (const run of [
      () => addMatrices(a, b),
      () => subtractMatrices([['1']], [['1', '2']]),
      () => addMatrices([['1']], [['1'], ['2']]),
      () => multiplyMatrices(a, a),
    ])
      expect(run).toThrow(
        expect.objectContaining({ code: 'INVALID_DIMENSIONS' }),
      );
  });

  it.each([
    [],
    [['1'], ['2', '3']],
    Array(2),
    [['a']],
    [['1/0']],
    Array.from({ length: 7 }, () => ['1']),
  ])('rejects malformed matrix %j for every operation', (invalid) => {
    for (const run of [
      () => addMatrices(invalid, [['1']]),
      () => subtractMatrices([['1']], invalid),
      () => multiplyMatrices(invalid, [['1']]),
      () => multiplyMatrices([['1']], invalid),
      () => scaleMatrix(invalid, '2'),
      () => transposeMatrix(invalid),
    ])
      expect(run).toThrow();
  });

  it.each(['a', '√2', '1/0', '', 2])('rejects invalid scalar %j', (scalar) => {
    expect(() => scaleMatrix([['1']], scalar)).toThrow();
  });
});
