# 011 — Interface e histórico das operações básicas

A seleção de operação da calculadora inclui soma, subtração, escalar, produto e transposta. Matrizes A e B têm dimensões explícitas entre 1 e 6; não ajustamos B silenciosamente ao editar A. Uma incompatibilidade produz erro ao resolver. Cada entrada alterada invalida resultado e possibilidade de salvamento. Erros de escalares indicam e focam a célula correspondente.

As etapas usam o contrato do núcleo, com navegação por célula da saída, fórmula exata e destaque dos operandos. O produto destaca uma linha de A e uma coluna de B; a transposta destaca a posição original. A apresentação de Gauss permanece separada, pois pivôs e operações de linha não se aplicam a estes métodos.

O histórico recebe cinco identificadores de operação e preserva o protocolo de UUID fixo e confirmação por leitura. Ao reabrir, restaura também B ou escalar, valida entrada e versão, recalcula e compara todo o resultado antes de exibir. A migração adicional amplia somente as restrições de formato, operação e versão, mantendo dados e políticas de acesso existentes.

A publicação desta interface exige aplicar a segunda migração ao ambiente de desenvolvimento e concluir o roteiro de aceite em `docs/history-development.md`. Os testes locais não comprovam que uma migração foi aplicada ao serviço hospedado.
