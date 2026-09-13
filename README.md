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

A interface inicial identifica os módulos planejados. O núcleo já oferece frações exatas, validação de entradas e solução de sistemas por Gauss com etapas estruturadas, com testes independentes da interface. A tela interativa de resolução e a autenticação serão implementadas nas próximas entregas. Ainda não é necessário configurar Supabase para executar essa estrutura.

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

Alterações passam por branches e pull requests. Não fazer merge antes da revisão do responsável pelo projeto. Código e identificadores em inglês; interface em português. A licença de distribuição ainda será definida.
