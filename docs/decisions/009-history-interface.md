# ADR 009 — Histórico na interface e confirmação de persistência

Estado: implementado; aceite com o Supabase hospedado pendente.

## Comportamento

Depois de resolver, a pessoa autenticada pode dar um título e salvar o cálculo. O histórico permite filtrar por operação, paginar de dez em dez, reabrir e excluir com confirmação. A listagem carrega somente resumos; o payload completo é buscado ao reabrir. A atualização acontece ao voltar à aba, ao focar a janela, após salvar/excluir e pelo botão Atualizar.

A sincronização depende de consultar a mesma conta no outro dispositivo. Não há sincronização de formulários ainda não salvos nem edição colaborativa. Paginação por offset pode mudar se outro dispositivo inserir/excluir registros entre consultas; atualizar a lista reflete o estado atual, sem prometer uma fotografia consistente entre páginas.

## Salvamento e sessões

O UUID e o conteúdo ficam fixos desde a primeira tentativa, inclusive se a resposta se perder. O título fica bloqueado durante as novas tentativas para não transformar uma repetição em uma alteração silenciosa. O cliente envia `ignoreDuplicates: true`, `defaultToNull: false` e conflito em `user_id,id`; depois consulta o registro e confere o conteúdo antes de informar sucesso. Uma falha não apaga a resolução atual. Uma nova resolução gera outro ID. Reabrir um registro não cria uma cópia automaticamente.

Cada operação usa um cliente Supabase com o token capturado da sessão iniciadora. A identidade é conferida antes de criar esse cliente; uma troca de conta durante o pedido não pode redirecionar a gravação para a nova conta. A política RLS continua sendo a autoridade no servidor. Tokens não são persistidos pelo cliente de dados separado nem inseridos nos registros.

O painel é remontado ao trocar de usuário, limpando lista e tentativas pendentes. Respostas obsoletas de paginação/filtro são descartadas por uma sequência de requisições. Respostas de uma conta encerrada não abrem cálculos nem exibem confirmação na sessão seguinte. Uma requisição já enviada pode ter concluído no servidor para a conta original; entrar novamente e atualizar permite conferir.

## Reabertura segura

Somente as versões atuais são aceitas. O tamanho e os metadados são limitados; entradas racionais canônicas são validadas antes de executar o mesmo algoritmo versionado. O resultado esperado é comparado ao snapshot inteiro, incluindo etapas, sem depender da ordem das propriedades JSON. Somente conteúdo equivalente é exibido. Um registro alterado ou de versão desconhecida permanece no banco e recebe uma mensagem de incompatibilidade. Não existe atualização de snapshots armazenados.

Manter um identificador de versão estável exige manter também o algoritmo correspondente: mudanças em etapas ou saídas precisam de uma versão nova e de uma estratégia explícita de leitura. A comparação atual não é um mecanismo de migração.

## Verificação e limites

Os testes cobrem os seis tipos de resultado atuais, JSON alterado, versões desconhecidas, requisições produzidas pelo SDK, confirmação de gravação, falhas, repetição com mesmo ID, troca de conta, respostas fora de ordem, exclusão confirmada e atualização da lista. A conferência visual usou uma página temporária com dados simulados, removida após a inspeção.

Ainda é necessário aplicar a migração aprovada no projeto de desenvolvimento e seguir o roteiro de [history-development.md](../history-development.md) com duas contas reais. Testes locais não comprovam configuração do PostgREST, envio de JWTs aceitos pelo projeto nem sincronização real entre dispositivos.
