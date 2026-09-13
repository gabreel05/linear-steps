# 004 — Interface de resolução por Gauss

Status: implementado nesta entrega.

A interface consome as etapas serializadas do núcleo, sem refazer a eliminação. Isso permite testar matemática e interação separadamente e reutilizar o contrato no histórico e na exportação futuros.

A entrada usa uma grade de coeficientes e termos independentes, com dimensões independentes de 1 a 6. Alterar valores, dimensões ou exemplos remove a resolução anterior. Entradas inválidas recebem mensagem e foco no primeiro campo com erro.

O visualizador oferece etapa anterior/próxima, seleção direta e todas as etapas. Pivôs, linhas alteradas e linhas de origem recebem cor e rótulos. KaTeX renderiza fórmulas geradas a partir dos dados validados, com MathML e sem comandos confiáveis habilitados; o usuário não fornece TeX.

A aproximação arredonda as matrizes para até seis casas decimais usando BigInt. O algoritmo, as operações e o resultado permanecem exatos. Valores pequenos podem ser apresentados como zero apenas nessa visualização.

Os testes de interface cobrem resolução, navegação, classificações, redimensionamento, erros e invalidação de resultados. Testes de formatação verificam arredondamento e renderização de fórmulas representativas. A verificação visual no navegador complementa os testes de DOM.

Nesta entrega há apenas Gauss e entrada em grade. Colagem de sistemas, outros métodos, autenticação, histórico e exportação seguem no plano da V1. O build atual emite aviso de bundle JavaScript acima de 500 kB; carregamento sob demanda deverá ser considerado ao adicionar módulos.
