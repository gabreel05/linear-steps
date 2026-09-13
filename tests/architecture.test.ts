import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function manifest(path: string): { dependencies?: Record<string, string> } {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
}

describe('workspace dependency boundaries', () => {
  it('keeps serialization contracts dependency-free', () => {
    expect(
      Object.keys(
        manifest('../packages/contracts/package.json').dependencies ?? {},
      ),
    ).toEqual([]);
  });

  it('keeps the math core independent of UI and persistence packages', () => {
    const dependencies = Object.keys(
      manifest('../packages/math-core/package.json').dependencies ?? {},
    );
    const allowed = new Set(['@linear-steps/contracts', 'mathjs']);
    expect(dependencies.filter((name) => !allowed.has(name))).toEqual([]);
  });
});
