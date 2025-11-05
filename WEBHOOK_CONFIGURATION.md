# Configuração de Webhooks - Pagar.me

## URL do Webhook

Configure esta URL no painel do Pagar.me:

```
https://lledweehyywobkpfiqsm.supabase.co/functions/v1/pagarme-webhook
```

## Eventos para Configurar

Configure os seguintes eventos no painel do Pagar.me para receber notificações:

### Eventos Obrigatórios:
- `charge.paid` - Quando um pagamento é aprovado
- `charge.pending` - Quando um pagamento está pendente
- `charge.failed` - Quando um pagamento falha
- `charge.refunded` - Quando um pagamento é estornado
- `charge.chargeback` - Quando há chargeback

### Eventos Adicionais (Recomendados):
- `order.paid` - Quando um pedido é pago
- `order.pending` - Quando um pedido está pendente
- `order.payment_failed` - Quando o pagamento do pedido falha
- `order.refunded` - Quando um pedido é estornado

## Passo a Passo para Configurar

### 1. Acesse o Dashboard do Pagar.me
- Entre em https://dashboard.pagar.me/
- Faça login com suas credenciais

### 2. Navegue até Webhooks
- No menu lateral, clique em "Configurações" ou "Settings"
- Selecione "Webhooks"
- Clique em "Novo Webhook" ou "New Webhook"

### 3. Configure o Webhook
- **URL**: `https://lledweehyywobkpfiqsm.supabase.co/functions/v1/pagarme-webhook`
- **Método**: POST
- **Versão da API**: v5 (mais recente)
- **Status**: Ativo/Enabled

### 4. Selecione os Eventos
Marque todos os eventos listados acima na seção "Eventos para Configurar"

### 5. Configuração de Segurança (Opcional mas Recomendado)
- O Pagar.me pode fornecer um secret/token para validar webhooks
- Você pode adicionar validação de assinatura na Edge Function se necessário

### 6. Teste o Webhook
- Use a ferramenta de teste do Pagar.me para enviar um webhook de teste
- Verifique os logs no Supabase para confirmar que o webhook foi recebido

## Verificar Logs do Webhook

Para verificar se os webhooks estão sendo recebidos:

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/
2. Vá em "Edge Functions" > "pagarme-webhook"
3. Clique em "Logs" para ver as requisições recebidas

## Estrutura do Payload Enviado pelo Webhook

O webhook receberá um payload com esta estrutura:

```json
{
  "type": "charge.paid",
  "data": {
    "id": "ch_xxx",
    "status": "paid",
    "metadata": {
      "user_id": "uuid-do-usuario",
      "deposit_id": "uuid-do-deposito"
    },
    "last_transaction": {
      "acquirer_return_code": "00",
      "qr_code": "...",
      "qr_code_url": "..."
    }
  }
}
```

## O Que o Webhook Faz

Quando recebe uma notificação, o webhook:

1. **Identifica a transação** usando o `pagarme_transaction_id`
2. **Atualiza o status** da transação no banco de dados
3. **Atualiza a carteira** do usuário (adiciona saldo quando pagamento é aprovado)
4. **Cria disputas** automaticamente em caso de chargeback
5. **Atualiza depósitos** se o pagamento for de um depósito

## Eventos Processados

| Evento | Ação |
|--------|------|
| `charge.paid` / `order.paid` | Define status como `paid`, adiciona saldo na carteira |
| `charge.pending` / `order.pending` | Define status como `pending` |
| `charge.failed` / `order.payment_failed` | Define status como `failed` |
| `charge.refunded` / `order.refunded` | Define status como `refunded` |
| `charge.chargeback` | Define status como `refunded`, cria disputa |

## Troubleshooting

### Webhook não está sendo recebido
- Verifique se a URL está correta
- Confirme que os eventos corretos estão selecionados
- Verifique se o webhook está ativo no painel do Pagar.me

### Transação não está sendo atualizada
- Verifique se o `user_id` está sendo enviado no metadata ao criar o pagamento
- Confira os logs da Edge Function para ver se há erros
- Certifique-se de que o `pagarme_transaction_id` está sendo salvo corretamente

### Saldo não está sendo creditado
- Verifique se a transação mudou de status para `paid`
- Confirme que a carteira do usuário existe no banco de dados
- Verifique os logs para ver se há erros no update da wallet

## Variáveis de Ambiente Necessárias

As seguintes variáveis devem estar configuradas no Supabase:

- `SUPABASE_URL` (já configurada)
- `SUPABASE_SERVICE_ROLE_KEY` (já configurada)
- `PAGARME_SECRET_KEY` (configure no Supabase Dashboard)

## Testando Localmente

Para testar o webhook localmente:

```bash
# 1. Instale a CLI do Supabase
npm install -g supabase

# 2. Inicie o ambiente local
supabase functions serve pagarme-webhook

# 3. Use um túnel (ngrok) para expor localmente
ngrok http 54321

# 4. Configure a URL do ngrok no Pagar.me temporariamente
```

## Segurança

O webhook atual aceita requisições de qualquer origem devido ao CORS configurado. Para produção, considere:

1. Validar a assinatura do webhook do Pagar.me
2. Verificar o IP de origem (IPs do Pagar.me)
3. Usar rate limiting
4. Adicionar logs de auditoria detalhados

## Suporte

Em caso de dúvidas:
- Documentação Pagar.me: https://docs.pagar.me/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Logs do Sistema: Dashboard do Supabase > Edge Functions > Logs
