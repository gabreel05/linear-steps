# 014 — Sistemas por Cramer e matriz inversa

O núcleo oferece solveCramer e solveByInverse como métodos explícitos, sem substituir automaticamente a escolha do estudante. Ambos exigem matriz quadrada. Cramer limita a ordem a 4, conforme a especificação; o método por inversa usa Gauss–Jordan até ordem 6.

Matriz singular retorna status not-applicable e razão singular, com a demonstração de determinante nulo ou da redução sem inversa. Este status não classifica o sistema como impossível ou indeterminado. A interface futura deve explicar a restrição e oferecer Gauss/Gauss–Jordan. Entradas retangulares e dimensões incompatíveis continuam sendo erros de entrada.

Cramer conserva o determinante de A, as matrizes com cada coluna substituída por b, seus determinantes e as divisões finais. Os determinantes usam triangularização, identificada no contrato de cada demonstração. O método da inversa conserva a redução completa de [A|I] e cada termo dos produtos escalares de A^-1 b. A aritmética permanece racional exata, incluindo valores intermediários maiores que os limites de entrada.

Os contratos cramer-1 e inverse-system-1 são imutáveis e seguros para JSON. Os testes resolvem MAT-02 e MAT-05-1..3 com ambos os métodos, substituem os resultados nas equações originais e conferem os passos. Sistemas construídos a partir de soluções conhecidas cobrem as ordens suportadas. Casos singulares consistentes e inconsistentes recebem o mesmo status de inaplicabilidade.

Esta entrega contém apenas núcleo, contratos e testes. Interface, persistência e migração para estes métodos serão implementadas em outro PR.
