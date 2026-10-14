# 019 — Interface e histórico de vetores

A seleção Área de cálculo separa vetores de matrizes e sistemas. A área vetorial aceita dimensão comum de 1 a 6, componentes de u e v e escalar quando aplicável. Operações unárias ocultam v. A operação entre pontos explicita o sentido final menos inicial; projeção explicita a direção v e a reta pela origem.

A apresentação mantém raízes e normalizações exatas. Ângulos mostram arccos e aproximação em graus com ≈ e seis casas. Produtos e somas parciais, normalização por componente e decomposição da projeção são navegáveis. Vetor zero gera os avisos de indefinição correspondentes, sem impedir norma zero ou produto escalar zero. Alterações de entrada, dimensão, exemplo, operação ou área invalidam a resolução.

O histórico usa operation=vector, method=components e a operação específica dentro da entrada. A reabertura valida a versão, reconstrói as entradas e recalcula tudo. Apenas a aproximação angular aceita diferença absoluta de até 1e-10 grau para tolerar variações entre motores JavaScript; todos os campos exatos e demais metadados devem coincidir integralmente. O valor recalculado é exibido. A sexta migração estende os envelopes sem alterar RLS ou privilégios.

Os testes incluem as nove operações, renderização KaTeX, restauração de entradas e casos indefinidos, rejeição de adulteração, migrações e isolamento SQL. Executar o roteiro hospedado de docs/history-development.md após aplicar 20261012000100_vector_history.sql no ambiente de desenvolvimento.
