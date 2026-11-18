# WhatsApp Business Cloud API · integração do gabinete

Webhook servido pela Vercel (projeto `trf3-muta`), na função `apoio/ex-officio/api/whatsapp.js`,
publicada em `https://trf3-muta.vercel.app/api/whatsapp`.

## Regra permanente

Nada de informação processual trafega por aqui. O recebimento registra apenas os quatro últimos
dígitos do remetente e o tipo da mensagem; o conteúdo não é gravado nem devolvido. O envio recusa
qualquer destinatário fora de `WA_DESTINATARIOS`.

## Variáveis de ambiente (Vercel › Settings › Environment Variables)

| Variável | Origem |
| --- | --- |
| `WA_VERIFY_TOKEN` | segredo escolhido pelo gabinete; o mesmo valor vai na aba Webhooks do aplicativo |
| `WA_APP_SECRET` | Meta › Configurações do aplicativo › Básico › Chave Secreta do Aplicativo |
| `WA_TOKEN` | Meta › WhatsApp › Configuração da API › token de acesso |
| `WA_PHONE_ID` | Meta › WhatsApp › Configuração da API › identificação do número de telefone |
| `WA_DESTINATARIOS` | números autorizados, com código do país, separados por vírgula |

Na fase de teste o token de acesso da Meta vale 24 horas e o número remetente é o número de teste
gratuito, limitado a cinco destinatários cadastrados no próprio painel da Meta.

## Verificação do webhook

A Meta chama a rota em GET com `hub.mode`, `hub.verify_token` e `hub.challenge`. A função devolve o
challenge quando o token confere. Cada POST traz o cabeçalho `X-Hub-Signature-256`, conferido por HMAC
SHA-256 sobre os bytes recebidos com a `WA_APP_SECRET`; assinatura inválida responde 401.

## Envio a partir de outras funções

```js
const { enviar } = require('./whatsapp');
await enviar('55679XXXXXXXX', 'Aviso do gabinete.');
```

Fora da janela de 24 horas desde a última mensagem do destinatário, a Cloud API só aceita modelo
aprovado — mensagem livre é recusada com erro 131047.
