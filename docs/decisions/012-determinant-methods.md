# 012 — Determinantes exatos com métodos explícitos

O núcleo oferece fórmula direta para ordens 1 e 2, Sarrus exclusivamente para ordem 3, Laplace até ordem 4 e triangularização até ordem 6. Uma escolha incompatível gera erro; não há troca automática de método. Laplace permite selecionar qualquer linha ou coluna, com índices internos começando em zero. Os menores expandem pela primeira linha até o caso escalar. Mesmo contribuições nulas mantêm seus menores para tornar a demonstração completa.

Todos os cálculos usam racionais exatos. O resultado `determinant-1` inclui entrada, opções copiadas, valor e demonstração imutáveis e serializáveis. Fórmula e Sarrus registram células, produtos e sinais. Laplace registra coeficiente, sinal do cofator, menor recursivo e contribuição. A interface poderá percorrer essa árvore sem reconstruir matemática a partir de texto.

Na triangularização usamos somente troca de linhas e soma de múltiplo de outra linha. Não normalizamos pivôs. Cada troca inverte o fator de correção; adições preservam o determinante. Em cada etapa vale `det(entrada) = correção × det(matriz da etapa)`. Ao final, o determinante é o produto da diagonal multiplicado pela correção. Colunas sem pivô não interrompem o algoritmo: matrizes singulares também terminam triangulares.

A validação inclui os dois exercícios NOTE-DET, comparação com a fórmula de Leibniz por permutações e aritmética bigint, identidades do determinante, replay das operações e verificação recursiva dos menores. A comparação independente cobre todas as ordens suportadas.

Esta entrega cobre contratos, algoritmos e testes. Seleção de métodos na interface, renderização das etapas e persistência no histórico ficam para o próximo PR. Não há migração de banco nesta entrega.
