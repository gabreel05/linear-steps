# 013 — Interface e histórico dos determinantes

A operação Determinante oferece os quatro métodos do núcleo, mantendo a escolha explícita mesmo quando as dimensões são incompatíveis. Laplace permite selecionar linha ou coluna e seu índice. Edições na matriz ou nas opções invalidam a resolução anterior e seu salvamento.

A demonstração é convertida em etapas navegáveis, com seleção direta para expansões longas. Sarrus e fórmula direta destacam os fatores de cada produto; Laplace apresenta a expansão e percorre os menores recursivamente, identificando o caminho de cada menor. Triangularização destaca pivô, linhas alteradas e diagonal final, mostrando a correção do determinante após cada operação. O TeX é gerado exclusivamente a partir do resultado validado.

O histórico mantém entrada, método e opções de Laplace. Ao reabrir, valida versões e metadados, recalcula a demonstração inteira e compara o resultado antes de exibi-lo. A migração 20261010000200_determinant_history.sql amplia as restrições de operação e formato sem alterar políticas de propriedade, permissões ou dados existentes. As restrições SQL validam o envelope; a validação matemática completa permanece no cliente.

Antes do merge da interface, aplicar a terceira migração ao Supabase de desenvolvimento e executar o aceite descrito em docs/history-development.md. Os testes PostgreSQL locais não comprovam a aplicação da migração hospedada.
