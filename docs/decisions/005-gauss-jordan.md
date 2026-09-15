# 005 — Redução e inversa por Gauss-Jordan

Esta entrega implementa o núcleo da etapa 06 do plano. A integração visual será um PR posterior.

`reduceMatrix` calcula a forma escalonada reduzida de uma matriz retangular, seu posto e pivôs. Todas as colunas da entrada podem fornecer pivôs. `invertMatrix` exige uma matriz quadrada e transforma `[A | I]`, procurando pivôs somente no bloco A. O bloco direito participa de todas as operações. Se o posto for menor que a ordem, retorna `singular`, sem campo de inversa.

As operações usam o adaptador racional existente e registram matrizes imutáveis após cada troca, multiplicação de linha e adição de múltiplo. A nova etapa `scale-row` registra o fator multiplicativo, não o divisor. Índices continuam começando em zero. A entrada pública permanece limitada a 6 × 6; o bloco aumentado interno da inversa pode ter 12 colunas.

Os resultados são serializáveis, com schemaVersion 1 e algorithmVersion gauss-jordan-1. Na inversa, `input` é A, `reduced` é o bloco aumentado final, e `rank`/`pivots` referem-se a A. Em matrizes singulares, o bloco aumentado não é necessariamente uma forma reduzida completa: a redução é restrita ao bloco esquerdo.

O algoritmo de Gauss e seus contratos permanecem independentes nesta entrega. Sistemas por Gauss-Jordan e visualização dos novos resultados ainda não estão disponíveis na tela.

Verificações: referências MAT-01 e MAT-04, ambos os produtos com a inversa, repetição de cada operação registrada, pivôs normalizados, idempotência, casos retangulares e singulares, frações, dimensões máximas, imutabilidade e validação de entradas.
