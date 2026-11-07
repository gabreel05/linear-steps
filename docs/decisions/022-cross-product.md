# 022 — Produto vetorial e geometria em R³

O núcleo expõe `crossProduct(left, right)` e `triangleFromPoints(origin, first, second)`. Entradas são exclusivamente vetores/pontos de três componentes racionais. Produto misto e volumes ficam para a próxima entrega.

O contrato `cross-geometry-1` registra o produto por componentes cíclicas a[j]b[k] − a[k]b[j], incluindo operandos, produtos e diferenças, com índices de base zero. A orientação segue a regra da mão direita; inverter os fatores inverte a normal. Produtos escalares com os dois vetores registram a verificação de ortogonalidade.

A norma do produto dá a área do paralelogramo. A área do triângulo usa a raiz do quadrado da norma dividido por quatro; raízes não perfeitas permanecem exatas, sem exigir simplificação simbólica. A normal unitária usa componentes divididas pela norma. Vetores colineares, incluindo o vetor zero, têm produto e áreas zero e normal unitária indefinida; nenhum plano único é inferido desses dados.

Para pontos, as arestas são first − origin e second − origin. O resultado inclui essas subtrações. Cálculos intermediários continuam como Rational, sem passar pelo parser de entrada novamente. Isso permite diferenças válidas maiores que o limite textual de entrada. Os auxiliares internos de produto escalar e raízes foram extraídos do módulo vetorial existente para reutilização, sem alteração do contrato vector-arithmetic-1.

Testes cobrem PV-01..04 e PV-08..11, orientação, ortogonalidade, distributividade, identidade de Lagrange, áreas, normalização, degeneração, translação de pontos, limites de entrada e imutabilidade. Interface e histórico serão integrados em outra entrega; não há migração de banco neste PR.
