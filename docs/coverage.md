# Cobertura de aceitação

O mapeamento detalhado dos PDFs é uma referência local do projeto. Esta versão pública registra apenas IDs e requisitos, sem reproduzir os documentos originais.

| Grupo | Aceite |
|---|---|
| MAT-01 | Forma reduzida de matriz retangular, posto e etapas |
| MAT-02 | Gauss com retrosubstituição, resultado exato e substituição nas equações |
| MAT-04 | Inversa por Gauss–Jordan, verificação dos dois produtos com a original |
| MAT-05-1..3 | Sistemas resolvidos por inversa, três vetores independentes |
| VET-05/07 | Produto escalar e normas, inclusive em R⁴ |
| VET-14 | Projeção, resíduo ortogonal e distância |
| PV-01..04 | Produto vetorial e verificação numérica de identidades |
| PV-08..11 | Área, normal e produto vetorial aplicado |
| PV-13..16 | Produto misto, volumes e coplanaridade |
| PV-19 | Verificação numérica da identidade BAC–CAB |
| NOTE-DET-01/02 | Determinantes por métodos diferentes |

Os 24 casos em `tests/fixtures/reference-cases.json` são referências previamente conferidas, não uma implementação de testes. Nos respectivos PRs, transformá-los em testes do resultado e das etapas.

Também fazem parte do aceite: combinações lineares, LI/LD e base do espaço gerado; entrada inválida; sistemas impossíveis e indeterminados; necessidade de troca de linhas; vetor zero; exportação; autenticação e isolamento entre usuários. Casos próprios e exercícios numéricos compostos complementam os IDs acima.

Ficam fora os exercícios que exigem parâmetros nos coeficientes, raízes na entrada, produto interno ponderado, demonstrações gerais ou desenhos. Uma verificação numérica não é uma prova simbólica. Nunca classificar um sistema como impossível apenas porque o determinante é zero.
