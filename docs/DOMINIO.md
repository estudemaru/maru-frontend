# estudemaru.com.br

## Estado conferido em 29/09/2026

O domínio principal já responde por HTTPS: a consulta pública de
`https://estudemaru.com.br/api/account` retornou HTTP 200. O endereço alternativo
`https://maru-frontend-murex.vercel.app/api/account` também respondeu HTTP 200.

Registros DNS observados nesta revisão:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `estudemaru.com.br` | `216.198.79.1` |
| CNAME | `www.estudemaru.com.br` | `25096aaefd457a8a.vercel-dns-017.com` |
| NS | `estudemaru.com.br` | `b.sec.dns.br`, `c.sec.dns.br` |

Os apontamentos mudaram desde a consulta anterior, que ainda não encontrava
A/CNAME. Não é preciso substituir os registros que já estão funcionando pelas
recomendações antigas. Esta revisão não alterou DNS nem publicou o site.

Na inspeção anterior da Vercel, os dois nomes estavam associados ao projeto
`maru-frontend`, equipe `toque-de-mulher`, sem redirecionamento entre eles. Essa
configuração administrativa não foi alterada nesta revisão.

Referência: [domínios na Vercel](https://vercel.com/docs/domains/set-up-custom-domain).

## Supabase

A responsável informou ter configurado Google e Discord no próprio Supabase.
A API publicada ainda retorna `googleEnabled: false` e não informa
`emailEnabled` ou `discordEnabled`, indicando uma versão anterior à integração
local. O código atualizado consulta os provedores habilitados no Supabase e
mostra Google, Discord e e-mail conforme a resposta.

O CLI ainda não está autenticado nesta máquina. Não foi possível confirmar
SMTP, Site URL ou Redirect URLs no painel remoto; a configuração remota e a
publicação permanecem pendentes. Nenhuma credencial ou política foi alterada.

A configuração local desejada está em `maru-backend/supabase/config.toml`:

- Site URL: `https://estudemaru.com.br`.
- Redirect URLs: cada origem abaixo, mais seus caminhos
  `/api/auth/google/callback` e `/api/auth/discord/callback`:
  `https://estudemaru.com.br`, `https://www.estudemaru.com.br` e
  `https://maru-frontend-murex.vercel.app`.
- `MARU_PUBLIC_ORIGIN`: `https://estudemaru.com.br`. O fallback local já usa
  esse domínio; conferir se um secret remoto antigo está sobrescrevendo-o.
- SMTP: conferir envio para e-mails externos, confirmação e recuperação.
- Publicar a Edge Function e o frontend correspondentes juntos.

O callback cadastrado no Google/Discord é o do Supabase:
`https://qxtgaalmyzyldmcpwooo.supabase.co/auth/v1/callback`. Os caminhos do
aplicativo acima devem estar na lista de redirecionamento do Supabase.

Procedimento e validações: `maru-backend/docs/DEPLOYMENT.md`.
Referências: [Discord e PKCE](https://supabase.com/docs/guides/auth/social-login/auth-discord),
[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) e
[SMTP próprio](https://supabase.com/docs/guides/auth/auth-smtp).
