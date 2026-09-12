# ADR 001 — Núcleo matemático independente e histórico gerenciado

Status: aceito no escopo inicial.

O produto deve explicar procedimentos de álgebra linear, preservar frações exatas e permitir reabrir cálculos em dispositivos diferentes.

Usaremos React/TypeScript/Vite na interface; núcleo TypeScript sem dependência de UI ou banco; contratos serializáveis versionados; KaTeX para apresentação; math.js como apoio à aritmética; Supabase Auth/PostgreSQL para contas e histórico privado com RLS.

Algoritmos didáticos devem produzir etapas estruturadas e verificáveis. Frações devem partir das strings de entrada, sem conversão intermediária para ponto flutuante. Raízes e parâmetros são permitidos somente nas saídas previstas.

O histórico persistirá resoluções imutáveis. O servidor armazena dados privados do usuário, sem certificar a correção matemática de conteúdo recebido. Migrações e regras de acesso são versionadas e testadas.

Essa divisão permite testar matemática sem navegador, manter o histórico mesmo após evolução dos algoritmos e trocar detalhes de apresentação sem reescrever os métodos. Em contrapartida, os contratos precisam preservar compatibilidade e a operação do serviço de autenticação deve ser validada antes da publicação.
