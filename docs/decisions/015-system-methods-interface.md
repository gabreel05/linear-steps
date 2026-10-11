# 015 — Interface e histórico dos métodos de sistemas

Resolver sistema permite escolher Gauss, Cramer (até ordem 4) e matriz inversa (até ordem 6). A entrada e o método são preservados; alterar qualquer um invalida a resolução. Em matrizes singulares, a interface exibe a razão de inaplicabilidade e oferece selecionar Gauss, sem classificar o sistema nem trocar silenciosamente de método. A seleção de Gauss requer nova resolução explícita.

Cramer permite navegar pelo determinante de A e por cada substituição de coluna, com a divisão final e acesso às etapas do determinante. Matriz inversa reutiliza a apresentação de Gauss–Jordan e mostra os produtos de cada linha por b. Controles do método e do cálculo interno têm rótulos distintos.

O histórico mantém operation=system e distingue métodos e versões. A reabertura restaura A, b e método após recomputar e comparar integralmente o resultado, inclusive os casos not-applicable. A quarta migração amplia as restrições de formato e versões, sem alterar RLS ou permissões. Registros antigos de Gauss continuam compatíveis.

Aplicar 20261010000300_system_methods_history.sql após as três migrações anteriores no ambiente de desenvolvimento e concluir o roteiro de aceite antes do merge.
