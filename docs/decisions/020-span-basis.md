# 020 — Combinação linear e bases por Gauss

O núcleo expõe `solveLinearCombination(vectors, target)` e `analyzeSpan(vectors)`. A entrada contém de 1 a 6 vetores, cada um com 1 a 6 componentes, todos na mesma dimensão. A lista externa enumera vetores; o sistema é construído com esses vetores como colunas. A lista vazia não é aceita nesta interface, mas um conjunto de vetores zero retorna corretamente uma base vazia e dimensão zero.

Combinação linear resolve A c = b. O contrato inclui o sistema de Gauss completo: solução única, família afim com todas as direções livres ou linha contraditória. Pertinência ao espaço gerado depende da consistência, não de determinante ou unicidade. Com uma base, a solução fornece as coordenadas do alvo nessa base.

A análise resolve A c = 0. O posto dá a dimensão do espaço gerado; as colunas com pivô selecionam vetores originais, na ordem de entrada. Nunca se usam linhas escalonadas como vetores da base. Independência, geração de todo Rⁿ e ser uma base de Rⁿ são propriedades distintas. Em caso de dependência, a primeira direção livre fornece uma relação não trivial, e o sistema preserva as demais relações independentes.

O contrato `span-basis-1` é imutável e serializável, com índices de base zero. Reaproveita o traço `gauss-1`, incluindo operações de linha, pivôs e retrosubstituição. A transposição usa as strings originais validadas para não impor novamente o limite de dígitos de entrada a frações canônicas de decimais válidos. Não há aproximações numéricas.

Esta entrega contém contratos, algoritmos e testes. Interface e persistência serão integradas em outra entrega; nenhuma migração é necessária agora.
