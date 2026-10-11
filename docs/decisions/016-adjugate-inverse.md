# 016 — Inversa por adjunta

O núcleo expõe invertByAdjugate para matrizes quadradas de ordem 1 a 4, conforme o limite didático aprovado. A aritmética é racional exata. Cada cofator registra índices de base zero, menor, demonstração do determinante, sinal e valor. A matriz de cofatores e sua transposta ficam disponíveis separadamente; a inversa inclui o fator 1/det(A).

Os determinantes usam Laplace pela primeira linha, reutilizando o algoritmo e suas etapas. Na ordem 1, o menor vazio recebe determinante 1 em um registro explícito, sem permitir matrizes vazias no parser público. Matrizes singulares preservam cofatores e adjunta, mas não possuem fator nem inversa. Não há troca automática de método.

O contrato adjugate-inverse-1 é imutável e serializável em JSON. Testes conferem A adj(A) = adj(A) A = det(A) I, ambos os produtos com a inversa e concordância com Gauss–Jordan, além dos exemplos de referência, singularidade e limites de entrada.

Esta entrega inclui núcleo, contrato e testes. Interface e histórico serão entregues em um PR posterior.
