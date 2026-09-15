# 007 — Autenticação por e-mail

Usamos o SDK oficial Supabase no frontend, separado dos pacotes matemáticos. O painel cobre cadastro com confirmação, entrada, saída local ao dispositivo, recuperação e definição da nova senha. Os cálculos continuam disponíveis quando o ambiente não tem autenticação configurada.

O controlador possui inicialização única por cliente e uma assinatura dos eventos do SDK. React consome um snapshot via useSyncExternalStore. A leitura inicial não sobrescreve eventos mais recentes. A troca de código PKCE é explícita e ocorre uma única vez, inclusive com StrictMode; códigos e erros do retorno são retirados da URL depois do processamento. O retorno de recuperação tem prioridade sobre a tela de usuário conectado.

O SDK armazena e renova a sessão no navegador. Senhas permanecem apenas no formulário durante a solicitação e são limpas ao concluir uma tentativa ou mudar de modo. Não há persistência própria de senhas nem logs de credenciais. Mensagens de cadastro/recuperação são neutras quanto à existência de uma conta. Erros do provedor são mapeados, sem apresentar mensagens internas diretamente.

O cliente aceita a chave publicável moderna e uma URL HTTPS. Nenhuma tabela de histórico é criada nesta entrega. A sessão exibida no frontend não substitui autorização no servidor: o histórico terá RLS e testes de isolamento na próxima etapa.

Os testes simulam o SDK para verificar integração, eventos, corrida da leitura inicial, StrictMode, callbacks, falhas e formulários. A aprovação funcional com e-mails reais ainda depende do ambiente externo, conforme o [guia de desenvolvimento](../auth-development.md).
