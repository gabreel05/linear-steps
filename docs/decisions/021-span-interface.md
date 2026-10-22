# 021 — Interface e histórico de espaços vetoriais

A área Espaços vetoriais oferece Combinação linear e LI/LD e bases. A grade mostra os vetores nas colunas e o alvo b apenas em combinação linear. Quantidade de vetores e dimensão ambiente são independentes, entre 1 e 6. Edições, exemplos e mudanças de modo invalidam o resultado anterior; erros identificam e focam o campo.

O resumo distingue independência, geração do espaço ambiente e base de Rⁿ, mostrando dimensão, base selecionada e relação não trivial para conjuntos dependentes. A base do espaço zero é vazia. As etapas reutilizam o visualizador de Gauss com destaque de pivôs e linhas alteradas. A interface explica que as incógnitas x1, x2, … são os coeficientes de v1, v2, …; a família afim inclui todos os parâmetros livres.

O histórico usa a operação span com algoritmo span-basis-1. Ao reabrir, converte os racionais de entrada, recalcula o resultado e compara todo o conteúdo, incluindo o traço de Gauss. Dados adulterados ou versões incompatíveis são rejeitados. A restauração remonta o editor e reinicia a navegação, sem substituir as entradas anteriores de matrizes.

A sétima migração amplia as restrições de operação, método e envelope, incluindo consistência da classificação com pertinência/independência e presença do sistema interno. As restrições SQL validam a estrutura; a validação matemática completa ocorre no cliente ao reabrir. Privilégios e políticas RLS permanecem iguais. Testes com PostgreSQL embarcado verificam as migrações, registros anteriores, novos casos e isolamento; aceite hospedado complementa esses testes.
