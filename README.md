# Linear Steps

Aprenda álgebra linear acompanhando cada transformação matemática.

Aplicação em desenvolvimento, com foco em matrizes, sistemas lineares, vetores e espaços vetoriais. A V1 terá métodos selecionáveis, frações exatas, histórico sincronizado e exportação PDF/JSON. Esses recursos serão entregues incrementalmente; a presença de um item no escopo não significa que ele já está implementado.

## Documentação

- [Especificação aprovada](docs/specification.md)
- [Cobertura de aceitação](docs/coverage.md)
- [Plano de entregas](docs/delivery-plan.md)
- [Decisão de arquitetura](docs/decisions/001-architecture.md)

Os materiais originais do curso permanecem fora deste repositório. Os casos matemáticos de referência estão em `tests/fixtures/reference-cases.json`; a cobertura já executada está registrada em `docs/coverage.md`.

## Desenvolvimento local

Use Node.js 24.19.0 e pnpm 11.19.0. Na raiz do repositório:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

A interface resolve sistemas por Gauss com entrada em grade, de 1 a 6 equações e incógnitas. Inclui exemplos, resultado exato, navegação pelas etapas, destaques de pivôs e linhas alteradas e aproximação decimal opcional das matrizes. Abra o endereço exibido por `pnpm dev` e clique em “Resolver passo a passo” para testar o exemplo inicial.

O painel de autenticação por e-mail está implementado e exige configuração do Supabase para funcionar; a validação com e-mails reais ainda está pendente. Sem essa configuração, a calculadora continua disponível. Siga o [guia de autenticação em desenvolvimento](docs/auth-development.md). Histórico sincronizado, exportação e os demais métodos seguem nas próximas entregas. Veja também as decisões da [interface de resolução](docs/decisions/004-solution-interface.md).

```sh
pnpm check       # formatação, lint, testes e build com verificação de tipos
pnpm format      # aplica a formatação
pnpm test:watch  # testes durante o desenvolvimento
```

O workspace contém `apps/web` (React), `packages/contracts` (dados serializáveis) e `packages/math-core` (algoritmos). Os testes verificam limites entre dependências, aritmética racional, validação de entradas e serialização. Os hooks verificam arquivos preparados para commit e executam tipos/testes antes do push. O GitHub Actions executa a verificação completa em pull requests e na branch principal.

Exemplo de uso do núcleo em TypeScript:

```ts
import { parseScalar, Rational } from '@linear-steps/math-core';

const result = parseScalar('0,1').add(parseScalar('1/5'));
result.toString(); // '3/10'
const restored = Rational.fromJSON(JSON.parse(JSON.stringify(result)));
restored.equals(result); // true
```

Os formatos aceitos e os limites estão no [ADR de entrada racional](docs/decisions/002-exact-rational-input.md).

Para resolver um sistema no núcleo:

```ts
import { solveGaussian } from '@linear-steps/math-core';

const resolution = solveGaussian(
  [
    ['1', '1'],
    ['2', '2'],
  ],
  ['2', '4'],
);
// classification: 'infinite'; x = (2, 0) + t₁(-1, 1)
// resolution.steps contém matrizes, pivôs e operações serializáveis.
```

O [ADR de Gauss](docs/decisions/003-gaussian-elimination.md) explica o contrato das etapas e as três classificações.

## Revisão

A base do histórico privado está em `supabase/migrations`, com testes de permissões e RLS executados em PostgreSQL via PGlite durante `pnpm check`. A interface de histórico e a validação com duas contas no Supabase hospedado ainda estão pendentes. Veja o [guia de desenvolvimento do histórico](docs/history-development.md) e a [decisão de armazenamento](docs/decisions/008-history-storage.md).

O núcleo também exporta `reduceMatrix(matrix)` (forma reduzida e posto) e `invertMatrix(matrix)` (inversa ou classificação singular), ambos com etapas exatas. Na interface, selecione “Forma reduzida e posto” ou “Matriz inversa” no campo Operação. Os exemplos incluem MAT-01, MAT-04, matriz singular e normalização com fração. Veja o [ADR de Gauss-Jordan](docs/decisions/005-gauss-jordan.md) e sua [integração visual](docs/decisions/006-matrix-interface.md).

Alterações passam por branches e pull requests. Não fazer merge antes da revisão do responsável pelo projeto. Código e identificadores em inglês; interface em português. A licença de distribuição ainda será definida.
