# Linear Steps — Especificação da V1

Data: 11 de setembro de 2026. Estado: escopo aprovado; implementação em andamento.

## 1. Objetivo e decisões aprovadas

Aplicação web em português para aprender a resolver exercícios de álgebra linear. Público inicial: o desenvolvedor do projeto e um pequeno grupo de amigos estudantes. Prioridade de interface: computador. A pessoa escolhe a operação e o método, informa os dados e acompanha a resolução em linguagem matemática, com pivôs, linhas e operações destacados.

O aceite da V1 será medido pelos exercícios compatíveis com o escopo, e não por todos os enunciados dos PDFs. Parâmetros nos coeficientes, raízes na entrada e demonstrações simbólicas gerais ficam fora desse aceite. Raízes e parâmetros podem aparecer na saída quando necessários.

Decisões aprovadas: React + TypeScript + Vite; KaTeX; algoritmos próprios com apoio de math.js; Supabase Auth e PostgreSQL; autenticação por e-mail; histórico sincronizado; exportação PDF e JSON; testes e verificações automáticas; revisão por pull requests; repositório público `linear-steps`. Produto: **Linear Steps**. IA será usada no desenvolvimento, sem chamadas a modelos no produto.

As escolhas detalhadas abaixo são propostas de implementação dentro desse escopo. O repositório remoto e os serviços ainda não foram criados.

## 2. Experiência principal

1. Escolher Matrizes, Sistemas ou Vetores e espaços vetoriais.
2. Escolher a operação e um dos métodos aplicáveis.
3. Inserir os dados por grade, texto tabular ou equações lineares, conforme a operação.
4. Conferir a interpretação matemática antes de resolver.
5. Executar o cálculo; exibir entrada, método, etapas e conclusão.
6. Avançar ou voltar uma etapa, expandir a resolução inteira e alternar a representação decimal.
7. Salvar na conta, reabrir em outro dispositivo ou exportar.

Calcular e exportar não exigem conta. Salvar e consultar o histórico sincronizado exigem autenticação. Dados digitados permanecem no formulário se o salvamento falhar; a interface só informa “Salvo” após confirmação do servidor. Não há edição colaborativa na V1.

O usuário traduz enunciados em dados. A V1 não interpreta automaticamente fotos, PDFs ou problemas em linguagem natural. Exercícios com várias partes podem ser resolvidos por uma sequência de cálculos; isso não equivale a gerar automaticamente uma resposta discursiva completa.

## 3. Operações e métodos

| Área | Funcionalidades da V1 | Métodos e etapas |
|---|---|---|
| Matrizes | Soma, subtração, produto por escalar, produto matricial e transposta | Operações elemento a elemento; produto linha por coluna; troca de índices |
| Determinantes | Matrizes quadradas | Fórmula de ordem 1 e 2; Sarrus apenas em 3×3; Laplace por linha ou coluna; triangularização com controle dos fatores |
| Inversa | Matriz quadrada não singular | Gauss–Jordan sobre `[A | I]`; adjunta e determinante |
| Escalonamento | Forma escalonada, forma reduzida e posto | Gauss e Gauss–Jordan, com pivôs e operações elementares explícitos |
| Sistemas | Matrizes retangulares e quadradas; SPD, SPI e SI; homogêneos | Gauss com retrosubstituição; Gauss–Jordan; Cramer e matriz inversa quando aplicáveis |
| Vetores em Rⁿ | Soma, subtração, multiplicação por escalar, vetor entre dois pontos | Cálculo por componentes |
| Produto escalar e norma | Produto interno euclidiano, norma, vetor unitário, ortogonalidade e ângulo | Soma de produtos, raiz da soma dos quadrados, normalização, fórmula do cosseno |
| Projeção | Projeção sobre a direção de um vetor não nulo e componente ortogonal | `(u·v)/(v·v) v`, resíduo e verificação de ortogonalidade |
| Combinação linear | Calcular combinação com coeficientes fornecidos; encontrar coeficientes para um alvo | Soma ponderada ou sistema com os vetores nas colunas |
| Dependência linear | Decidir LI/LD; mostrar uma relação não trivial em caso de LD | Sistema homogêneo e pivôs; determinante como alternativa para n vetores em Rⁿ |
| Base | Verificar base de Rⁿ; extrair base do espaço gerado; informar dimensão desse espaço | Posto e colunas-pivô da matriz ORIGINAL |
| Produto vetorial | Dois vetores em R³ | Componentes e expansão do determinante formal com i, j, k |
| Produto misto | Três vetores em R³ | Produto escalar com produto vetorial; determinante 3×3 |
| Geometria | Áreas de triângulo e paralelogramo; volumes de tetraedro e paralelepípedo; coplanaridade | Vetores a partir de pontos, produto vetorial/misto, norma, valor absoluto e fatores 1/2 ou 1/6 |

Normalização e ângulo são extensões imediatas das operações aprovadas, necessárias a partes das listas. Normal a um plano e torque podem ser obtidos pelo produto vetorial, sem um módulo adicional de física. Distância a uma reta pela origem pode ser obtida pela norma do resíduo da projeção, sem um solucionador geral de geometria analítica.

Escolher método não significa disponibilizar métodos inválidos. Cramer e inversa exigem matriz quadrada com determinante diferente de zero. O sistema deve explicar a restrição e oferecer Gauss/Gauss–Jordan, sem trocar silenciosamente o método. Para operações com um único procedimento natural, mostrar esse procedimento sem criar escolhas artificiais.

### Limites iniciais propostos

- Matrizes: entre 1 e 6 linhas e colunas; sistemas: até 6 equações e 6 incógnitas. A matriz aumentada pode ter uma coluna adicional e `[A|I]` até 12 colunas.
- Vetores: dimensão de 1 a 6; até 6 vetores por combinação ou análise de base. Produto vetorial/misto exclusivamente tridimensional.
- Laplace, inversa por adjunta e Cramer: até ordem 4 para manter a resolução legível. Gauss/Gauss–Jordan e triangularização cobrem as dimensões maiores.
- Limites de tamanho de entrada, quantidade de etapas e dados exportados serão constantes compartilhadas. Proposta: 32 dígitos por inteiro ou componente de fração, 12 casas decimais na entrada, 5.000 etapas e JSON de até 5 MiB. Interromper com mensagem clara se um limite for atingido; não truncar uma resolução e apresentá-la como completa.

Os exemplos manuscritos incluem matriz 5×5; por isso o limite não deve ficar em 3×3. Essas restrições podem ser ajustadas por evidência durante a implementação.

## 4. Contrato numérico e entrada

Aceitar inteiros com sinal, decimais finitos e frações de inteiros com denominador não nulo. `0,1`, `0.1` e `1/10` representam exatamente o mesmo racional. A conversão parte da string, sem passar por `Number` antes de formar a fração.

Internamente, preservar numerador e denominador inteiros de precisão arbitrária, fração reduzida e denominador positivo. Implementar uma interface `Rational` e usar o suporte de frações da biblioteca por trás de um adaptador. Algoritmos de Gauss, determinantes e projeção são próprios; não é necessário reimplementar toda a aritmética elementar. A biblioteca não deve ditar o formato persistido.

Saídas irracionais usam uma representação estruturada limitada: racional, raiz quadrada de racional não negativo, quociente por essa raiz e somas necessárias às apresentações. Não haverá simplificador simbólico geral. Uma raiz exata não precisa estar maximamente simplificada para ser matematicamente correta. Ângulos podem mostrar `arccos(...)` e aproximação em graus. Aproximações usam `≈`, nunca `=`; padrão proposto de 6 casas, configurável até 12.

Não realimentar automaticamente uma saída irracional no parser restrito de entrada. Operações compostas previstas, como normalizar um produto vetorial, devem ocorrer internamente com seus tipos próprios.

Grade: uma célula por coeficiente, navegação por Tab e mensagens na célula inválida. Célula vazia é entrada incompleta, não zero implícito.

Texto tabular: linhas separadas por quebra de linha; colunas por tabulação ou ponto e vírgula. Espaços podem separar valores quando não houver ambiguidade. Vírgula é decimal, não separador de coluna. Mostrar prévia com as dimensões reconhecidas. Exemplo:

```text
1; 2; -1
0; 1/2; 3,5
```

Equações: uma por linha, termos lineares e coeficientes racionais, nomes `x,y,z` ou `x1,...,x6`, constantes em qualquer lado. Exemplo `2x + 3y - z = 5`. Rejeitar produtos entre incógnitas, potências, funções, raízes e parâmetros de coeficiente. Normalizar termos repetidos e mostrar a ordem das incógnitas antes do cálculo. Sem `eval` e sem execução livre de expressões da biblioteca.

## 5. Correção matemática e pedagogia

- Classificar sistemas por `rank(A)` e `rank([A|b])`. Se os postos diferem, SI; se são iguais ao número de incógnitas, SPD; se são iguais e menores, SPI.
- SPI: apresentar solução particular mais combinação de direções livres, com parâmetros reais; confirmar `A·x₀=b` e `A·vᵢ=0`.
- Pivô zero: trocar por linha com entrada não nula ou avançar para a próxima coluna. Igualdade a zero é exata, sem epsilon.
- Determinante: registrar trocas e escalas de linhas. O determinante da matriz transformada não substitui diretamente o original.
- Base de um espaço gerado: selecionar vetores originais correspondentes aos pivôs, nunca usar as colunas transformadas como se fossem os vetores de entrada.
- Vetor zero: norma zero válida; normalização e ângulo indefinidos; projeção sobre direção zero inválida. Ortogonalidade pelo produto escalar continua válida com vetor zero.
- Colinearidade/LD pode incluir vetor zero algebricamente; não atribuir direção geométrica ao vetor zero.
- Áreas e volumes são não negativos; produto misto mantém o sinal. Quatro pontos coplanares são testados por três diferenças a partir do mesmo ponto.
- Cada etapa contém uma transformação verificável. Não agrupar várias operações de linha numa etapa sem mostrar a sequência.
- Estados passados são imutáveis. Navegar pelas etapas não modifica o resultado nem recalcula com outro método.
- Destaques usam texto e posição além de cor. Os nomes de métodos e rótulos curtos permanecem em português; não é necessário texto explicativo longo.

## 6. Arquitetura e dados

Uma aplicação web e um núcleo matemático em workspace TypeScript, com dependências de direção única:

```text
apps/web              interface, autenticação, histórico, exportação
packages/math-core    racionais, validação matemática, métodos, etapas
packages/contracts    formatos serializáveis e versões
supabase/migrations   tabelas, índices e políticas de acesso
docs                  decisões e critérios de aceite
```

`math-core` não depende de React, DOM, Supabase ou KaTeX. A interface converte etapas em fórmulas e componentes. Evitar introduzir microserviços, Redis ou filas nesta versão.

Contrato conceitual de resolução:

```text
CalculationRecord
  id, ownerId, createdAt, title, operation, method
  input, result, steps
  schemaVersion, algorithmVersion

Step
  id, kind, operationData
  before/after ou estado matemático necessário
  highlightedRows, highlightedColumns, pivot
```

Tipos de etapa incluem troca de linhas, escala, soma de múltiplo de linha, avaliação de produto escalar, expansão de determinante, retrosubstituição e conclusão. Frações são serializadas como strings de numerador/denominador; `BigInt` não entra diretamente no JSON.

Histórico: salvar explicitamente; cada resolução salva é imutável. Editar entradas e resolver novamente gera novo registro. Permitir listar, filtrar por operação, abrir e excluir. Repetir uma requisição de salvamento com o mesmo ID não cria cópias. Ordenação por data do servidor e ID.

Sincronização da V1: após salvar em um dispositivo, abrir/atualizar o histórico no outro deve mostrar o registro. Reconsultar ao voltar à aba e oferecer atualizar manualmente; colaboração ao vivo e sincronização de rascunhos não são requisitos. Falhas devem manter o cálculo local disponível para nova tentativa.

Supabase Auth: e-mail e senha, confirmação, login, logout e recuperação. Não solicitar senhas ou chaves em arquivos de documentação. O ambiente publicado precisará de configuração de URLs de retorno e entrega de e-mails, a validar antes do aceite.

Tabela `calculations`: UUID, proprietário referenciando o usuário autenticado, operação, método, título, datas, versões e conteúdo JSONB. Índice por proprietário/data. RLS em todas as operações; usuário A não pode ler, criar em nome de, alterar ou excluir dados de B. Chave administrativa nunca no frontend. Políticas e migrações são código versionado, com testes reais usando duas contas.

O servidor armazena resoluções privadas produzidas pelo cliente, sem certificá-las. JSON importado é dado não confiável: validar versão, esquema, dimensões e limites; recalcular antes de tratá-lo como nova resolução validada. Preservar o registro histórico original ao reabrir versões antigas e não substituí-lo silenciosamente.

## 7. Exportação

PDF: página de impressão com título, entrada, método, etapas, conclusão e data. Botão “Imprimir / salvar PDF” usando o navegador. Validar impressão real em A4, quebra de páginas, matrizes aumentadas e ausência de cortes; essa opção não promete download automático sem diálogo.

JSON: download com versão de esquema, operação, método, entrada, resultado e etapas. Excluir tokens, e-mail e IDs internos de proprietário. Importar permite reabrir um problema compatível; dados inconsistentes ou versões desconhecidas geram erro legível. Exportar/importar conserva frações exatas.

## 8. Qualidade e aceite

Vitest: aritmética, parser, métodos, aplicação de etapas e propriedades. Testing Library: entrada, validação e navegação. Playwright: resolver, salvar, reabrir e exportar. Testes do banco: isolamento RLS e idempotência de salvamento.

Casos de referência em `reference-cases.json` foram conferidos em Python com frações exatas, identidades e substituição nas equações. São dados de referência, não testes já executados contra a aplicação. A biblioteca math.js será comparador adicional para operações compatíveis; igualdade com a mesma biblioteca usada na aritmética não é uma prova independente.

Acrescentar testes próprios de matriz singular, necessidade de troca de linhas, sistema retangular, SPI, SI, vetor zero, conjunto vazio de geradores, dimensão incompatível, negativos, frações, importação malformada e falha de rede. Conjunto vazio de geradores representa o subespaço zero e base vazia; a interface terá ação explícita para esse caso, não uma grade ambígua.

Critério de conclusão:

1. Todos os casos classificados como aceites obrigatórios no mapa de exercícios passam com o método indicado.
2. Operações aprovadas sem exercício direto têm exemplos próprios com resultado conferido, especialmente LI/LD e extração de base.
3. Etapas preservam as relações matemáticas e explicam a conclusão; testes não verificam apenas o último número.
4. Usuário salva no dispositivo A e reabre no B; usuário diferente não acessa o registro.
5. PDF legível e JSON válido e reimportável nos casos suportados.
6. Instalação reproduzível com lockfile; build, análise estática e testes passam no CI.
7. Fluxos principais operáveis por teclado e revisados em tela de computador.
8. Instruções de execução, migrações, variáveis de ambiente e publicação estão documentadas.

Hooks locais: formatação/lint dos arquivos alterados antes do commit; typecheck e testes antes do push. CI em pull request e push para a branch principal. Hooks ajudam o feedback local, mas CI é a verificação obrigatória porque hooks podem ser ignorados.

## 9. Fora da V1

Parâmetros nos coeficientes; raízes digitadas; números complexos; álgebra simbólica geral; provas automáticas; produto interno ponderado; espaços de polinômios e matrizes; autovalores/autovetores; SSO; aplicativos móveis; sincronização offline; gráficos 2D/3D e editor de desenho; leitura automática de PDFs; interpretação de enunciados; bibliotecas de exercícios reproduzidas integralmente; compartilhamento público de histórico.

Potências matriciais com expoente fixo podem ser verificadas por produtos sucessivos. Uma calculadora geral de potências, traço, ponto médio, classificação exaustiva de tipos de matriz e mudança de base entre duas bases não são requisitos adicionais desta versão.

## 10. Referências e documentos associados

- `coverage.md`: inventário, referências por página, cobertura e ressalvas.
- `delivery-plan.md`: ordem das entregas e roteiro de revisão.
- `reference-cases.json`: 24 casos numéricos conferidos.

Documentação técnica de referência: [frações no math.js](https://mathjs.org/docs/datatypes/fractions.html), [KaTeX](https://katex.org/docs/api), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Versões exatas serão fixadas e verificadas no PR de estrutura inicial.
