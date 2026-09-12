# Linear Steps — Entregas e revisão por pull requests

Estado: plano aprovado. Números abaixo identificam entregas planejadas; não são IDs de PR remoto.

## Como revisar

Cada PR apresenta problema, comportamento resultante, decisão técnica, verificações executadas e limitações. O autor implementa e verifica; o usuário revisa antes do merge. Não juntar vários módulos matemáticos em um PR só. Se uma entrega crescer demais, dividir algoritmo e interface, mantendo cada parte executável ou testável.

Código e nomes técnicos em inglês; interface e explicações de revisão em português. Decisões relevantes vão para registros curtos em `docs/decisions`. Documentos, exemplos e testes públicos não devem incluir PDFs originais, caminhos pessoais, segredos ou dados de usuários.

## Sequência proposta

| PR planejado | Entrega concreta | Verificação e foco da revisão |
|---|---|---|
| 01 — `docs: define v1 scope and acceptance` | Especificação, mapa de cobertura sanitizado para o repositório, decisões e limites | Conferir o que entra, os métodos e as exclusões por exercício. Referências locais detalhadas permanecem fora do remoto |
| 02 — `chore: scaffold workspace and ci` | React/Vite/TS, pacotes do núcleo/contratos, lockfile, ESLint, Prettier, Vitest e GitHub Actions | Instalação limpa, typecheck e build; fronteiras de dependência. Sem versões de bibliotecas escolhidas apenas de memória |
| 03 — `feat: add exact rational input` | Adaptador racional, parser de escalares, formatos persistidos e validação de dimensões | Decimais exatos, negativos, denominador zero, limites e conversão JSON sem perda |
| 04 — `feat: solve systems with gaussian elimination` | Gauss, retrospectiva de operações e classificação SPD/SPI/SI | MAT-02; sistemas retangulares; pivô inicial zero; SPI de D1 p.3; substituição e replay das etapas |
| 05 — `feat: show interactive solution steps` | Grade, seleção de método, KaTeX, pivôs e navegação por etapas | Primeiro fluxo completo de cálculo; teclado; estados antigos imutáveis; matriz aumentada legível |
| 06 — `feat: add gauss jordan and inverse` | Forma reduzida, posto e inversa | MAT-01/MAT-04; ambas as identidades com inversa; singularidade |
| 07 — `feat: add email authentication` | Cadastro, confirmação, login, logout e recuperação de senha | Fluxos em ambiente de teste; retorno de autenticação; mensagens de erro; nenhuma senha no histórico |
| 08 — `feat: sync calculation history` | Migrações, RLS, salvar/listar/reabrir/excluir | Duas contas reais de teste; duas sessões/dispositivos; impedir acesso cruzado; repetição de salvamento; falha de rede |
| 09 — `feat: add basic matrix operations` | Soma, subtração, escalar, produto e transposta | Exemplos A1; dimensões incompatíveis; propriedades e produto linha/coluna exibido |
| 10 — `feat: add determinant methods` | Ordem 1/2, Sarrus, Laplace, triangularização | NOTE-DET-01/02; sinal de trocas, fatores de escala, singularidade; Sarrus indisponível fora de 3×3 |
| 11 — `feat: add cramer and adjugate methods` | Cramer, inversa por adjunta e solução via inversa | MAT-05-1..3; concordância entre métodos; restrições de aplicabilidade e de tamanho |
| 12 — `feat: add vector arithmetic and projection` | Soma, escalar, produto escalar, norma, normalização, ângulo e projeção | VET-05/07/14, V-Q12; saída com raiz; projeção sobre zero e ângulo de vetor zero |
| 13 — `feat: add span and basis analysis` | Combinação linear, LI/LD, base de Rⁿ e base do espaço gerado | Colunas originais; relação de dependência verificável; alvo fora do espaço; base vazia e redundância |
| 14 — `feat: add cross product geometry` | Produto vetorial, normal, áreas e etapas | PV-01..04 e PV-08..11; ortogonalidade; ordem dos fatores; área não negativa |
| 15 — `feat: add triple product geometry` | Produto misto, volumes e coplanaridade | PV-13..16 e PV-19; determinante versus produto composto; pontos com mesma origem |
| 16 — `feat: parse equations and pasted matrices` | Entrada tabular e equações, prévia e alternância com grade | Separador decimal inequívoco; termos repetidos; rejeição de não linearidade; conservação de entradas |
| 17 — `feat: export and import calculations` | Impressão/PDF e JSON versionado | A4 real sem corte; ida e volta exata; versão desconhecida; dados adulterados e limite de arquivo |
| 18 — `test: complete v1 acceptance and release docs` | Cobertura restante das listas, acessibilidade, documentação operacional e publicação preparada | Todos os aceites; histórico entre dispositivos; recuperação de senha e e-mails no ambiente final; build reproduzível |

Os números são ordem de planejamento, não números reais de PR no GitHub. A V1 inclui todos os módulos aprovados, mesmo que a primeira fatia funcional seja apenas Gauss. Autenticação/histórico entram cedo para validar o maior requisito de infraestrutura antes de terminar todos os módulos.

## Revisões de arquitetura que valem atenção

- PR03: biblioteca cuida da aritmética exata; domínio próprio cuida do procedimento e do formato das etapas. Isso reduz trabalho repetido sem perder controle didático.
- PR04–06: saída estruturada é o contrato entre algoritmo e interface. Revisar esse contrato antes de espalhá-lo para outros módulos.
- PR08: RLS é parte do comportamento do produto. Testar acesso negado pelo servidor; ocultar botões na tela não é isolamento.
- PR12: raízes exatas na saída exigem tipos próprios; não introduzir um parser simbólico geral para resolver essa necessidade.
- PR17: JSON importado não é uma prova de cálculo correto. Validar e recalcular, sem executar conteúdo recebido.

## Testes próprios indispensáveis

1. Sistema SPI `x+y=2`, `2x+2y=4`: `(x,y)=(2-t,t)`.
2. Sistema SI `x+y=2`, `2x+2y=5`: linha contraditória e nenhuma solução.
3. Sistema que exige troca: `y=1`, `x+y=3`: `(2,1)`.
4. Matriz singular `[[1,2],[2,4]]`: determinante zero e inversa indisponível.
5. LI: `(1,0),(0,1)`; LD: `(1,2),(2,4)` com relação não trivial.
6. Base do espaço gerado por `(1,0,0),(2,0,0),(0,1,0)`: selecionar primeiro e terceiro vetores originais; dimensão 2.
7. Projeção de `(1,2)` sobre `(0,0)`: operação indefinida; nenhuma divisão silenciosa por zero.
8. Vetor `(1,1)`: norma `√2`; inteiro/decimal/fracionário preservado exatamente até a saída aproximada.
9. Produto vetorial fora de R³: entrada rejeitada com motivo.
10. Salvar com rede indisponível: cálculo preservado, estado não marcado como salvo e nova tentativa sem duplicação.

## Configurações externas necessárias antes da implementação publicada

O nome e a visibilidade já estão definidos: `linear-steps`, público. Ainda é necessário criar o remoto na conta GitHub apropriada e disponibilizar acesso de escrita para branches e PRs. Isso não impede revisar estes documentos ou preparar o código local.

O projeto Supabase precisará de ambiente de desenvolvimento, migrações, configuração de autenticação e entrega de e-mail. Segredos devem ser configurados no ambiente, nunca enviados em PRs ou colocados na documentação. O provedor de hospedagem do frontend permanece a definir no preparo da publicação; a arquitetura é uma aplicação estática com backend Supabase.

Não foi escolhida uma licença de software nesta etapa. Repositório público e licença são decisões diferentes; a licença será discutida antes da primeira publicação de código. Nenhum recurso pago foi contratado, repositório criado ou deploy realizado nesta entrega.
