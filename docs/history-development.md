# Banco do histórico no ambiente de desenvolvimento

Esta entrega prepara a tabela e os testes de segurança. A calculadora ainda não oferece botões de histórico. A integração hospedada e a interface serão a próxima revisão.

## Revisar e aplicar

1. Revise `supabase/migrations/20260917000100_calculation_history.sql` no PR. A migração cria somente a tabela de cálculos, os índices e suas políticas; não modifica usuários ou os fluxos de autenticação.
2. Após a revisão, abra o **SQL Editor** do projeto **de desenvolvimento** `linear-steps-dev` no Supabase e crie uma consulta.
3. Cole o conteúdo completo da migração e execute uma única vez. Ela usa uma transação: se algum comando falhar, não continue executando fragmentos isolados. Não é necessário compartilhar a senha do banco.
4. Confira em Table Editor a tabela `calculations` com RLS habilitado. Não crie registros manualmente pelo painel para testar isolamento: o painel usa privilégios administrativos.

A aplicação manual pelo SQL Editor não registra a versão no histórico de migrações da CLI. Antes de adotar `supabase db push`, será necessário reconciliar esse histórico com a migração já aplicada; não tente criar a tabela novamente. Não use `DROP TABLE` para contornar uma aplicação duplicada.

## Contrato para a próxima interface

- Inserir apenas `id`, `operation`, `method`, `title`, `schema_version`, `algorithm_version` e `payload`. O payload é o objeto JSON completo retornado pelo núcleo matemático.
- Gerar o UUID antes do primeiro envio e preservá-lo na nova tentativa. Usar conflito em `user_id,id` com `DO NOTHING`, jamais `DO UPDATE`. No SDK, configurar `ignoreDuplicates: true` e `defaultToNull: false`; consultar o registro depois para confirmar que existe. Uma resposta de conflito ignorado não contém necessariamente o registro.
- Não enviar `user_id` nem `created_at`, sequer com valor nulo. O banco determina ambos. Um salvamento com resposta de rede incerta permanece pendente até ser confirmado pelo servidor.
- Consultar apenas os campos de resumo na listagem, com filtro de operação, ordem por `created_at` e `id` decrescentes e paginação. Carregar o payload completo somente ao reabrir.
- Validar os dados e suas versões antes de mostrar a resolução. Não confiar que JSON armazenado seja uma prova matemática. Não substituir snapshots antigos pelo resultado de uma versão nova do algoritmo.
- Ao trocar de conta ou sair, limpar o histórico visível e descartar respostas pendentes da sessão anterior. O ID de salvamento deve ser associado à conta; não transportar uma tentativa pendente para outra conta.
- Exclusão deve filtrar pelo ID; RLS limita a ação ao proprietário. Confirmar a exclusão na interface antes de enviá-la. Nenhum UPDATE é permitido ao cliente.

## Testes locais

`pnpm check` inclui `tests/history-database.test.ts`. Para rodar somente os testes do banco:

```sh
pnpm exec vitest run tests/history-database.test.ts
```

Não exige Docker, Supabase local, segredos nem conexão com o projeto hospedado. PGlite roda em memória e descarta os dados ao terminar. Os testes verificam isolamento entre duas identidades, acesso anônimo, proprietário forjado, imutabilidade, repetição de salvamento, limite de conteúdo, versões, ordenação, filtros e exclusão.

## Aceite hospedado pendente

Após implementar a interface, executar com duas contas reais de teste:

1. Salvar um sistema com frações, uma matriz reduzida e uma inversa. Reabrir e conferir entrada, etapas e conclusão exatas.
2. Entrar na mesma conta em outro navegador/dispositivo e atualizar a lista; conferir os três registros. Voltar à aba deve também reconsultar.
3. Trocar para a segunda conta e conferir lista vazia. Verificar pela API, com a sessão dessa segunda conta, que ler/excluir o ID da primeira não afeta seus dados, inserir em nome dela falha e atualizar snapshots é negado.
4. Repetir o salvamento com o mesmo ID e verificar que há somente um registro, sem alteração de seu conteúdo ou data. Testar perda da resposta e nova tentativa.
5. Desconectar a rede e tentar salvar. A entrada e a resolução devem continuar disponíveis, sem falso aviso de sucesso. Reconectar e tentar novamente.
6. Excluir um registro próprio, atualizar no outro dispositivo e conferir que desapareceu. Trocar de conta enquanto há consultas pendentes não deve mostrar dados da conta anterior.

O SDK, a Data API e o Supabase Auth não são substituídos pelos testes locais de SQL. Esta lista continua pendente até ser executada no ambiente real.
