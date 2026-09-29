# estudemaru.com.br

Conferido em 29/09/2026 pela API e CLI da Vercel. Os dois nomes já pertencem ao
projeto `maru-frontend`, equipe `toque-de-mulher`, e estão verificados. Não há
redirecionamento entre eles. A publicação atual também tem o endereço
`maru-frontend-murex.vercel.app`. Esta revisão de interface ainda não foi publicada.

## Registro.br

O domínio usa `a.auto.dns.br` e `b.auto.dns.br`. Nenhum A/CNAME foi encontrado
na consulta; a Vercel informa `misconfigured: true`.

No painel do domínio, abra DNS → Editar zona (modo avançado) e cadastre:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | raiz / em branco (`estudemaru.com.br`) | `76.76.21.21` |
| CNAME | `www` | `25096aaefd457a8a.vercel-dns-017.com.` |

O A é a opção confirmada pelo `vercel domains inspect` e aceita pela API
(rank 2); o CNAME é a recomendação específica de rank 1 para este domínio.
Não é necessário trocar os servidores DNS. Preserve registros de e-mail,
TXT e outros serviços. Depois de salvar, aguarde a propagação e confira o
status na Vercel; o certificado HTTPS depende do apontamento válido.

Referência: https://vercel.com/docs/domains/set-up-custom-domain

## Supabase — pendente por solicitação

O arquivo local `maru-backend/supabase/config.toml` já declara o endereço desejado.
Depois que o DNS estiver funcionando, aplicar remotamente:

- Site URL: `https://estudemaru.com.br`.
- Redirect URLs: `https://estudemaru.com.br`, `https://www.estudemaru.com.br` e
  `https://maru-frontend-murex.vercel.app`.
- Secret da Edge Function: `MARU_PUBLIC_ORIGIN=https://estudemaru.com.br`.
- Configurar SMTP próprio e verificar confirmação e recuperação com e-mail real.
- Publicar o bundle da Edge Function e o frontend em conjunto.

Nenhuma alteração foi aplicada ao Supabase remoto. O fallback da função
continua o endereço anterior até a definição do secret no ambiente remoto.
