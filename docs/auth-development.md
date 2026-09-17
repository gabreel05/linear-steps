# Autenticação no ambiente de desenvolvimento

Estado: integração implementada; validação com projeto Supabase e e-mails reais pendente. Os testes automatizados usam um adaptador simulado e não comprovam a entrega de e-mails nem a configuração do servidor.

## Configurar o projeto

1. No [painel do Supabase](https://supabase.com/dashboard), crie um projeto de desenvolvimento chamado `linear-steps-dev`. Defina a senha do banco no próprio painel e guarde-a no seu gerenciador de senhas; ela não é usada pelo frontend.
2. Em Authentication, habilite e-mail/senha, mantenha a confirmação de e-mail e configure comprimento mínimo da senha em 12 caracteres. A interface aceita até 128 caracteres.
3. Em URL Configuration, use `http://127.0.0.1:5173/` como Site URL e cadastre os retornos `http://127.0.0.1:5173/` e `http://127.0.0.1:5173/?auth=recovery`. Use sempre esse mesmo endereço, sem alternar com localhost. Se usar outra porta, cadastre os endereços correspondentes.
4. Mantenha os templates padrão com o link `{{ .ConfirmationURL }}` de confirmação/recuperação. Não substitua por um link fixo para a aplicação.
5. Copie `apps/web/.env.example` para `apps/web/.env.local`. Preencha `VITE_SUPABASE_URL` com a URL HTTPS do projeto e `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave `sb_publishable_...` disponível nas configurações de API. A chave publicável é destinada ao navegador. Nunca use `sb_secret_...`, `service_role`, senha do banco ou token de gerenciamento. Arquivos `.env.local` estão ignorados pelo Git.
6. Reinicie `pnpm dev` e abra o endereço configurado.

O SMTP padrão do Supabase restringe os destinatários aos membros da equipe e tem limites baixos. Para testar com outros destinatários, configure um SMTP próprio. Não conceda acesso administrativo ao projeto apenas para permitir que amigos recebam e-mails. Nenhum serviço de e-mail pago foi contratado nesta entrega. Consulte a [documentação de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Verificação real antes de considerar a autenticação concluída

- Cadastrar um e-mail de teste autorizado, receber a mensagem e confirmar no mesmo navegador que iniciou o cadastro.
- Entrar, recarregar a página e verificar a sessão; sair deste dispositivo e conferir que a sessão desaparece.
- Verificar senha incorreta e e-mail não confirmado.
- Solicitar recuperação, abrir o link no mesmo navegador, definir a nova senha e entrar novamente. Reabrir o link consumido e verificar a orientação de solicitar outro.
- Testar retorno com link expirado, navegador diferente e rede indisponível, sem exibir detalhes internos do provedor.
- Entrar na mesma conta em um segundo navegador/dispositivo, com senha, e verificar que sair de um dispositivo não encerra o outro. O histórico ainda não é sincronizado nesta entrega.

Abra apenas o link mais recente, pois pedidos PKCE sobrepostos podem substituir o verificador local. Os retornos usam a raiz da aplicação e não exigem novas rotas no servidor estático. Para produção, defina a URL HTTPS definitiva e sua lista de retornos antes do deploy.

Referências: [autenticação por senha](https://supabase.com/docs/guides/auth/passwords), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [URLs de retorno](https://supabase.com/docs/guides/auth/redirect-urls) e [chaves de API](https://supabase.com/docs/guides/getting-started/api-keys).
