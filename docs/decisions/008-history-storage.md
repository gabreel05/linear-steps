# ADR 008 — Histórico privado e imutável no PostgreSQL

Estado: implementado nesta entrega o armazenamento e seus testes; interface e integração com o ambiente Supabase hospedado pendentes.

## Decisão

Cada resolução salva será um snapshot JSONB com entrada, resultado, etapas e versões do contrato matemático. A tabela `public.calculations` guarda também operação, método, título, proprietário e data. O servidor armazena o resultado produzido pelo cliente, sem certificar sua correção matemática.

O frontend poderá inserir, consultar e excluir seus registros; não poderá atualizá-los. `user_id` recebe `auth.uid()` e `created_at` recebe `now()`. Privilégios de INSERT por coluna impedem o cliente de fornecer proprietário e data, enquanto políticas RLS restringem SELECT, INSERT e DELETE à identidade autenticada. A migração revoga privilégios públicos e de acesso anônimo, sem depender das opções escolhidas no painel ao criar o projeto.

A chave primária é `(user_id, id)`. O cliente deve gerar um UUID por resolução e reutilizá-lo nas tentativas de salvar a mesma resolução. `ON CONFLICT (user_id, id) DO NOTHING` preserva o snapshot original; o cliente consulta o registro para confirmar o salvamento. O mesmo UUID em outra conta não colide nem revela a existência de registros alheios. Resolver novamente após editar entradas gera outro ID. Uma tentativa após exclusão explícita pode recriar o registro; não existe fila offline nesta versão.

Dois índices atendem à listagem por proprietário, ao filtro por operação e à ordenação por `(created_at DESC, id DESC)`. A interface futura deve paginar os resultados e reconsultar ao voltar à aba ou ao acionar Atualizar. Não será necessário Realtime para esse comportamento.

O limite inicial é de 1 MiB por snapshot JSON serializado e 120 caracteres por título. O banco verifica envelope, versão, método e campos essenciais. Não valida cada etapa nem executa algoritmos matemáticos. O consumidor deve validar os dados antes de renderizar, rejeitar versões desconhecidas de maneira legível e preservar o snapshot original. Novos métodos ou versões exigirão uma migração aditiva; não sobrescreveremos silenciosamente o histórico antigo.

## Verificação

Os testes Vitest carregam a migração real em PGlite, um PostgreSQL compilado para WebAssembly, usado apenas no desenvolvimento. Não é uma segunda base do produto e não é incluído no frontend. As consultas são executadas sob as roles `anon` e `authenticated`, com duas identidades distintas. Somente a fronteira de identidade (`auth.users` e `auth.uid()`) é preparada pelo teste.

Isso verifica permissões SQL e políticas RLS no motor PostgreSQL, mas não comprova JWTs, autenticação, PostgREST ou configuração do projeto hospedado. Os testes com duas contas reais e dois navegadores continuam obrigatórios para o aceite da sincronização. O roteiro está em [history-development.md](../history-development.md).

Referências: [RLS no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [privilégios por coluna](https://supabase.com/docs/guides/database/postgres/column-level-security) e [PGlite](https://pglite.dev/docs/about).
