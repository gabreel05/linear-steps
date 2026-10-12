# 017 — Interface e histórico da adjunta

A operação Matriz inversa permite escolher Gauss–Jordan ou adjunta. Alterar entrada ou método invalida a resolução anterior. A adjunta oferece navegação pelo determinante de A, cada cofator, matriz de cofatores, transposição e conclusão. Os determinantes internos reutilizam a apresentação de Laplace, com controles distintos dos controles externos. O caso de ordem 1 explica a convenção do menor vazio; singularidade é exibida sem divisão por zero.

O histórico conserva operation=inverse e distingue os métodos pelo contrato. A reabertura recalcula e compara o resultado completo antes da apresentação, preservando compatibilidade com Gauss–Jordan. A quinta migração amplia as restrições sem alterar RLS ou privilégios. O limite da adjunta continua em ordem 4; selecionar Gauss–Jordan após erro é uma ação explícita e requer resolver novamente.

Aplicar 20261011000100_adjugate_history.sql após as quatro migrações anteriores e executar o aceite hospedado antes da publicação do PR.
