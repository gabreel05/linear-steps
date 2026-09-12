# Linear Steps

Aprenda álgebra linear acompanhando cada transformação matemática.

Aplicação em desenvolvimento, com foco em matrizes, sistemas lineares, vetores e espaços vetoriais. A V1 terá métodos selecionáveis, frações exatas, histórico sincronizado e exportação PDF/JSON. Esses recursos serão entregues incrementalmente; a presença de um item no escopo não significa que ele já está implementado.

## Documentação

- [Especificação aprovada](docs/specification.md)
- [Cobertura de aceitação](docs/coverage.md)
- [Plano de entregas](docs/delivery-plan.md)
- [Decisão de arquitetura](docs/decisions/001-architecture.md)

Os materiais originais do curso permanecem fora deste repositório. Os casos matemáticos de referência estão em `tests/fixtures/reference-cases.json` e ainda não representam testes executados da aplicação.

## Desenvolvimento local

Use Node.js 24.19.0 e pnpm 11.19.0. Na raiz do repositório:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

A interface inicial identifica os módulos planejados; os algoritmos e a autenticação serão implementados nas próximas entregas. Ainda não é necessário configurar Supabase para executar essa estrutura.

```sh
pnpm check       # formatação, lint, testes e build com verificação de tipos
pnpm format      # aplica a formatação
pnpm test:watch  # testes durante o desenvolvimento
```

O workspace contém `apps/web` (React), `packages/contracts` (dados serializáveis) e `packages/math-core` (algoritmos). Os testes iniciais verificam limites entre dependências; a suíte matemática será adicionada com os algoritmos. Os hooks verificam arquivos preparados para commit e executam tipos/testes antes do push. O GitHub Actions executa a verificação completa em pull requests e na branch principal.

## Revisão

Alterações passam por branches e pull requests. Não fazer merge antes da revisão do responsável pelo projeto. Código e identificadores em inglês; interface em português. A licença de distribuição ainda será definida.
