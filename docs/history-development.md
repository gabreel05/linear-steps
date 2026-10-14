# Banco do histórico no ambiente de desenvolvimento

Tabela, políticas e interface estão implementadas. A integração com o projeto hospedado precisa ser validada após aplicar a migração. Ao entrar na conta, o painel “Seu histórico” aparece abaixo da calculadora; resolver um problema libera o campo de título e o botão de salvar.

## Revisar e aplicar

1. Revise `supabase/migrations/20260917000100_calculation_history.sql` no PR. A migração cria somente a tabela de cálculos, os índices e suas políticas; não modifica usuários ou os fluxos de autenticação.
2. Após a revisão, abra o **SQL Editor** do projeto **de desenvolvimento** `linear-steps-dev` no Supabase e crie uma consulta.
3. Cole o conteúdo completo da migração e execute uma única vez. Ela usa uma transação: se algum comando falhar, não continue executando fragmentos isolados. Não é necessário compartilhar a senha do banco.
4. Confira em Table Editor a tabela `calculations` com RLS habilitado. Não crie registros manualmente pelo painel para testar isolamento: o painel usa privilégios administrativos.

A aplicação manual pelo SQL Editor não registra a versão no histórico de migrações da CLI. Antes de adotar `supabase db push`, será necessário reconciliar esse histórico com a migração já aplicada; não tente criar a tabela novamente. Não use `DROP TABLE` para contornar uma aplicação duplicada.

## Contrato da interface

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

Executar com duas contas reais de teste após aplicar a migração:

1. Salvar um sistema com frações, uma matriz reduzida e uma inversa. Reabrir e conferir entrada, etapas e conclusão exatas.
2. Entrar na mesma conta em outro navegador/dispositivo e atualizar a lista; conferir os três registros. Voltar à aba deve também reconsultar.
3. Trocar para a segunda conta e conferir lista vazia. Verificar pela API, com a sessão dessa segunda conta, que ler/excluir o ID da primeira não afeta seus dados, inserir em nome dela falha e atualizar snapshots é negado.
4. Repetir o salvamento com o mesmo ID e verificar que há somente um registro, sem alteração de seu conteúdo ou data. Testar perda da resposta e nova tentativa.
5. Desconectar a rede e tentar salvar. A entrada e a resolução devem continuar disponíveis, sem falso aviso de sucesso. Reconectar e tentar novamente.
6. Excluir um registro próprio, atualizar no outro dispositivo e conferir que desapareceu. Trocar de conta enquanto há consultas pendentes não deve mostrar dados da conta anterior.

O SDK, a Data API e o Supabase Auth não são substituídos pelos testes locais de SQL. Esta lista continua pendente até ser executada no ambiente real.

## Operações básicas de matrizes

Para a interface de soma, subtração, escalar, produto e transposta, aplique também `supabase/migrations/20261010000100_matrix_operations_history.sql`, após a migração inicial. Revise e execute a transação completa no SQL Editor de desenvolvimento. Não reaplique a criação da tabela. Esta migração amplia as restrições de operação, versão e formato do payload; não remove registros nem altera RLS ou permissões.

Aceite desta entrega (ainda exige execução no projeto hospedado):

1. Escolha cada operação e carregue o exemplo com frações. Confira resultado, etapas e elementos destacados. No produto, uma linha de A e uma coluna de B ficam destacadas. Na transposta, confira a troca dos índices.
2. Salve um cálculo de cada operação, recarregue e reabra pelo histórico. Confira operação, A, B ou escalar, resultado e etapas. Edite um valor: o resultado anterior deve desaparecer até resolver novamente.
3. Para produto, use A = [[1, 2, 3], [4, 5, 6]] e B = [[1], [0], [-1]]. Resultado esperado C = [[-2], [-2]]. Troque B para duas linhas: deve ocorrer erro de dimensões, sem resultado para salvar.
4. Na mesma conta em outro navegador, confira os novos cálculos após atualizar e os filtros de operação. Em outra conta, confirme que eles não aparecem.
5. Reabra um sistema, uma forma reduzida e uma inversa salvos antes da migração. Seus resultados devem continuar acessíveis.

Os testes locais executam as duas migrações em PostgreSQL (PGlite), preservam um registro preexistente e verificam isolamento entre contas. Isso não substitui os testes de autenticação e persistência no Supabase hospedado.

## Determinantes

Após as duas migrações anteriores, executar `supabase/migrations/20261010000200_determinant_history.sql` no SQL Editor do projeto de desenvolvimento. Não recriar a tabela. A migração é transacional e deve ser aplicada uma vez.

1. Selecionar Determinante e carregar “Lista · determinante 175”. Resolver por Sarrus, Laplace pela coluna 2 e triangularização: todos devem resultar em 175. Navegar pelas etapas e usar “Ir para etapa”; conferir fatores, menores, pivô e operações de linha. Salvar cada método com título diferente.
2. Alterar para fórmula direta na matriz 3 × 3: deve informar incompatibilidade. Usar a matriz 2 × 2 `[[1/2, 0], [0, 3]]`: o resultado deve ser 3/2. Salvar. Alterar entrada, método ou índice de Laplace deve limpar a resolução anterior.
3. Recarregar a página e reabrir os quatro registros. Conferir matriz, método, resultado e, em Laplace, coluna 2. Reabrir também um registro antigo de sistema ou operação matricial.
4. Em outro navegador com a mesma conta, conferir os registros e reabrir Laplace. Em uma segunda conta, esses registros não devem aparecer. Se o salvamento falhar, verificar a aplicação da terceira migração antes de repetir.

Os testes automatizados cobrem métodos, fórmulas KaTeX, entrada incompatível, invalidação, restauração e rejeição de resultados adulterados; os testes SQL cobrem as três migrações e isolamento por proprietário. O aceite hospedado acima precisa ser confirmado separadamente.

## Sistemas por Cramer e inversa

Executar `supabase/migrations/20261010000300_system_methods_history.sql` uma vez no SQL Editor de desenvolvimento, após as três migrações anteriores.

1. Em Resolver sistema, carregar o exemplo da lista. Resolver por Cramer e por matriz inversa: ambos devem retornar (1, 2, 3). Percorrer o cálculo de cada incógnita e as etapas internas. Salvar os dois resultados com títulos distintos.
2. Carregar Infinitas soluções e usar cada método novo: deve informar que o método não se aplica, sem afirmar inexistência de solução. Selecionar Gauss e resolver novamente deve classificar SPI. Repetir com Nenhuma solução: Gauss deve classificar SI. Uma matriz retangular deve produzir erro com opção explícita para selecionar Gauss.
3. Recarregar e reabrir os novos registros: conferir A, b, método, resultado e navegação. Reabrir também um registro antigo de Gauss e um de determinante.
4. Na mesma conta em outro navegador, conferir e reabrir os dois registros. Em outra conta, esses registros não devem aparecer.

Testes locais de SQL e de interface não substituem essa conferência hospedada entre sessões.

## Inversa por adjunta

Executar `supabase/migrations/20261011000100_adjugate_history.sql` uma vez, após as quatro migrações anteriores, no SQL Editor de desenvolvimento.

1. Em Matriz inversa, carregar “Lista · inversa 3 × 3” e escolher Adjunta e determinante. Conferir cofatores, transposição, conclusão e os determinantes internos. Comparar com Gauss–Jordan: os resultados devem coincidir. Salvar os dois métodos com títulos distintos.
2. Usar Matriz singular: deve informar que não há inversa, mantendo cofatores e adjunta disponíveis. Usar matriz 1 × 1 com valor 2: inversa 1/2 e menor vazio com determinante 1. Ordem 5 deve oferecer seleção explícita de Gauss–Jordan após o erro, sem resolver automaticamente.
3. Recarregar e reabrir os registros: método e resultado devem ser restaurados. Reabrir também uma inversa antiga por Gauss–Jordan e um sistema salvo.
4. Na mesma conta em outro navegador, reabrir a adjunta. Em outra conta, confirmar que o registro não aparece.

Os testes locais verificam restauração, adulteração e isolamento SQL; o aceite hospedado deve ser confirmado separadamente.

## Vetores

Aplicar `supabase/migrations/20261012000100_vector_history.sql` uma vez no SQL Editor de desenvolvimento, após as cinco migrações anteriores.

1. Selecionar Área de cálculo → Vetores. No produto escalar, o exemplo u=(2,-1,3), v=(4,2,-1) deve resultar em 3. Percorrer os produtos e somas. Conferir soma (6,1,2), subtração (-2,-3,4), deslocamento (2,3,-4) e escalar 2/3 aplicado a u: (4/3,-2/3,2).
2. Em Norma, carregar o exemplo (1,1): saída √2. Normalização: (1/√2,1/√2). Ângulo com (1,0): arccos(1/√2) ≈ 45°. Em Projeção, carregar o exemplo: projeção (3/2,3/2,0), resíduo (-1/2,1/2,2), distância √(9/2) e produto do resíduo pela direção igual a zero.
3. Testar vetor zero: norma zero válida, normalização e ângulo indefinidos; direção zero na projeção indefinida. Digitar √2 como entrada deve gerar erro e foco no campo. Alterar dimensão ou operação deve limpar o resultado antigo.
4. Salvar uma norma, um ângulo, uma projeção e um caso indefinido. Recarregar e reabrir os quatro registros, conferindo operação, entradas e etapas. O filtro Vetores deve mostrar esses cálculos. Reabrir também uma matriz ou sistema anterior.
5. Em outro navegador com a mesma conta, reabrir os registros. Em outra conta, confirmar que eles não aparecem. Este aceite entre sessões complementa os testes locais.
