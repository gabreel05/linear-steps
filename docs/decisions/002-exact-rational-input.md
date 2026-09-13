# ADR 002 — Entrada racional exata

Status: implementado para revisão.

O núcleo usa `Rational`, um valor imutável que encapsula as frações do math.js 15.2.0. O objeto da biblioteca não é exposto. Soma, subtração, multiplicação, divisão, sinal e valor absoluto retornam novos valores. A biblioteca usa inteiros `bigint`; testes com números maiores que 2⁵³ verificam que a precisão é preservada.

O parser aceita apenas strings: inteiros com sinal, decimais finitos com ponto ou vírgula e frações de inteiros. Por exemplo, `0.1`, `0,1` e `1/10` produzem o mesmo valor. A conversão decimal usa concatenação de dígitos e potência de dez em `bigint`, sem passar por `Number`. Espaços externos e ao redor da barra são aceitos. Decimais exigem dígitos dos dois lados do separador: usar `0.5`, não `.5`.

Não usamos o avaliador de expressões da biblioteca. Notação científica, dízimas escritas com parênteses, raízes, parâmetros e expressões como `1+2` são rejeitados nesta entrada escalar.

O formato JSON permanece `{ numerator: string, denominator: string }`, reduzido e com denominador positivo; zero é `0/1`. `fromJSON` recebe `unknown`, verifica os campos e rejeita representações não canônicas. Esse método valida um racional individual, não um arquivo completo de histórico. Importação versionada e recálculo continuam previstos na entrega de exportação/importação.

Os limites compartilhados são 32 dígitos por inteiro/componente de fração, 12 casas decimais e 128 caracteres por entrada escalar. Zeros à esquerda contam no limite de entrada. Matrizes e vetores têm dimensões entre 1 e 6; sistemas aceitam matrizes retangulares e exigem um termo independente por equação. Matrizes aumentadas serão construídas internamente pelos algoritmos. O conjunto vazio de geradores terá um contrato específico na entrega de espaços vetoriais.

Resultados podem ultrapassar os 32 dígitos de entrada. Numerador e denominador calculados ou persistidos têm um limite separado de 4.096 dígitos; excedê-lo gera erro explícito, sem aproximação. Esse teto é uma decisão inicial de recursos, revisável com os algoritmos e exercícios reais. Raízes e saídas aproximadas serão tratadas em entregas posteriores.

Testes cobrem erros, limites, imutabilidade e JSON, além de comparar as quatro operações com produtos cruzados em `bigint`, independentes da biblioteca. Os casos de sistemas e vetores da lista serão executados contra seus algoritmos nas respectivas entregas.

Referência: [Frações no math.js](https://mathjs.org/docs/datatypes/fractions.html).
