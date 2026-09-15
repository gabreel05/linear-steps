# 006 — Interface de redução e inversa

A entrega completa a integração visual da etapa 06: forma reduzida e posto para matrizes retangulares e inversa para matrizes quadradas. Sistemas continuam usando Gauss. A seleção de operação determina o algoritmo disponível; não são oferecidos métodos ainda não implementados.

A grade preserva coeficientes ao trocar de operação. Termos independentes ficam ocultos nas operações de matriz e não participam de sua validação. Trocar operação, exemplo, dimensão ou valor invalida o resultado anterior. A inversa de uma matriz retangular recebe uma mensagem de erro sem truncar a entrada ou redimensioná-la silenciosamente.

O visualizador existente passa a aceitar resultados do núcleo de Gauss-Jordan. A etapa de multiplicação destaca a linha alterada e seu pivô, com fator racional na fórmula. Na redução simples não há coluna b; na inversa, o separador marca a fronteira entre os blocos esquerdo e direito. A matriz original tem até 6 colunas e o bloco aumentado pode ter 12, dentro de uma região com rolagem horizontal.

O resultado exato é apresentado separadamente das matrizes intermediárias. A opção decimal afeta apenas estas últimas. Em caso singular, a tela informa que o bloco direito não é uma inversa. A última etapa registrada mostra o estado final da redução; a conclusão matemática permanece no resumo do resultado.

Testes cobrem redução retangular, inversa com frações, singularidade, dimensões inválidas, troca de operação, invalidação, foco em entradas inválidas, navegação, aproximação e matriz 6 × 6. A renderização de fórmulas também é verificada com KaTeX em modo estrito.
