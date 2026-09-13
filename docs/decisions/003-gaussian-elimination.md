# ADR 003 — Gauss e etapas verificáveis

Status: implementado para revisão.

`solveGaussian(coefficients, constants)` recebe grades de strings, valida as dimensões e devolve uma resolução serializável. O algoritmo usa a aritmética racional exata do núcleo e não delega o escalonamento à biblioteca. Escolhe o primeiro pivô não nulo disponível em cada coluna; não usa tolerância decimal, pois valores pequenos não são zero. Colunas sem pivô são puladas.

Gauss produz forma escalonada e retrosubstituição; não normaliza todos os pivôs nem elimina acima deles. Gauss–Jordan permanece uma entrega separada. Cada troca ou soma de múltiplo de linha produz uma única etapa e uma nova cópia imutável da matriz aumentada. O fator registrado já inclui o sinal: `target ← target + factor × source`. Há etapas próprias para entrada, pivô, variável livre, retrosubstituição e conclusão. Os índices começam em zero; a interface apresentará linhas e variáveis começando em um.

O contrato diferencia três resultados:

- `unique`: vetor solução, posto de A e posto da matriz aumentada.
- `infinite`: solução particular, índices das colunas livres e vetores direção, ordenados por essas colunas. A interface poderá apresentar `x = particular + Σ tₖ directions[k]`.
- `inconsistent`: índice de uma linha `0 = b`, com `b ≠ 0`, como evidência. Não é produzido um vetor solução. Como há uma única coluna de constantes, o posto aumentado é o posto de A mais um.

A retrosubstituição opera sobre expressões afins nos parâmetros livres. Cada etapa registra o termo independente, divisor, coeficientes, valores substituídos e expressão resultante, suficientes para a futura apresentação matemática. Parâmetros são gerados apenas na saída; não se tornam entradas aceitas pelo parser.

O resultado inclui `schemaVersion: 1` e `algorithmVersion: 'gauss-1'`. Todos os objetos, vetores e matrizes são congelados; os racionais são serializados como strings de numerador e denominador. Isso define o contrato de saída do solver, não o formato completo do histórico autenticado. Erros de validação ou de limite aritmético interrompem a resolução sem retornar passos parciais como resultado completo.

Com até seis equações e seis incógnitas, esta implementação produz no máximo 35 etapas (entrada, até seis trocas, seis pivôs, quinze eliminações, seis atribuições e conclusão), abaixo do orçamento geral proposto de 5.000. Matrizes aumentadas podem ter sete colunas internamente.

Validação: exercícios MAT-02 e MAT-05-1..3, casos SPD/SPI/SI e sistemas de uma a seis dimensões. Os testes repetem cada operação registrada, verificam pivôs e retrosubstituição, substituem a solução particular na entrada e as direções no sistema homogêneo. Sistemas inteiros construídos com solução conhecida servem de referência independente. O teste das direções junto da quantidade de variáveis livres verifica que a parametrização cobre a nulidade esperada. A interface de navegação pelas etapas será construída no próximo PR.
