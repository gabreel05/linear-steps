# 010 — Operações básicas por elemento

Esta entrega implementa soma, subtração, produto por escalar, produto matricial e transposta no núcleo. A interface e a integração com o histórico ficam para o próximo PR, seguindo a divisão de algoritmo e interface prevista no plano.

Cada função recebe entradas desconhecidas e usa os parsers existentes, com dimensões de 1 a 6 e aritmética racional exata. Soma e subtração exigem dimensões iguais; o produto exige colunas de A iguais às linhas de B. Não há arredondamento nem expansão automática de dimensões.

O resultado versionado contém entrada normalizada, matriz final e uma etapa por célula da saída, em ordem de linha e coluna. Índices são baseados em zero. Cada etapa de produto registra os fatores e o produto de cada termo, inclusive zeros, para mostrar a soma linha-coluna completa. A transposta registra a posição de origem. Não são operações elementares de linha e, portanto, não reutilizam o contrato de Gauss.

Todos os objetos retornados são imutáveis e serializáveis em JSON. O contrato é aditivo: não altera os registros existentes do histórico. A próxima entrega deverá ampliar explicitamente validação, recomputação e restrições SQL para armazenar estas operações.

Os testes conferem resultados numéricos independentes, frações e decimais, dimensões retangulares, não comutatividade, distributividade, transposta de produto, identidade, rastreabilidade das etapas, limites e entradas inválidas. Não se declara cobertura dos exercícios A1 sem ligar cada exercício ao respectivo caso sanitizado.
