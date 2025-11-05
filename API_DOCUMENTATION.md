# GoldsPay API Documentation

## Overview

GoldsPay é um gateway de pagamento completo construído com React, TypeScript, Supabase, e Edge Functions. Esta documentação descreve todos os endpoints, autenticação, e integração com a plataforma.

## Table of Contents

1. [Autenticação](#autenticação)
2. [Edge Functions](#edge-functions)
3. [Banco de Dados](#banco-de-dados)
4. [Integrações](#integrações)
5. [Webhooks](#webhooks)
6. [Tratamento de Erros](#tratamento-de-erros)
7. [Rate Limiting](#rate-limiting)
8. [Exemplos de Uso](#exemplos-de-uso)

---

## Autenticação

### Email/Password Authentication

GoldsPay utiliza autenticação por email e senha através do Supabase Auth.

#### Sign Up
Criar nova conta de usuário.

```bash
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "created_at": "2025-11-05T10:30:00Z"
  }
}
```

**Resposta de Erro (400):**
```json
{
  "success": false,
  "error": {
    "message": "Este email já está cadastrado. Tente fazer login",
    "code": "user_already_exists"
  }
}
```

#### Sign In
Fazer login com credenciais.

```bash
POST /auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 3600,
      "refresh_token": "..."
    }
  }
}
```

#### Sign Out
Fazer logout.

```bash
POST /auth/signout
Authorization: Bearer {access_token}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true
}
```

#### Reset Password
Solicitar reset de senha.

```bash
POST /auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Email de reset enviado para user@example.com"
}
```

#### Update Password
Atualizar senha (requer autenticação).

```bash
POST /auth/update-password
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "newPassword": "newsecurepassword123"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Senha atualizada com sucesso"
}
```

---

## Edge Functions

### Create Payment

Criar uma nova transação de pagamento.

```bash
POST /functions/v1/create-payment
Authorization: Bearer {anon_key}
Content-Type: application/json

{
  "amount": 10000,
  "currency": "BRL",
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "11999999999"
  },
  "payment_method": "credit_card",
  "metadata": {
    "order_id": "ORDER-12345"
  }
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "payment": {
    "id": "pay_123456",
    "amount": 10000,
    "currency": "BRL",
    "status": "processing",
    "created_at": "2025-11-05T10:30:00Z",
    "payment_url": "https://goldspay.com/pay/pay_123456"
  }
}
```

**Resposta de Erro (400):**
```json
{
  "success": false,
  "error": {
    "message": "Valor de pagamento inválido",
    "code": "invalid_amount"
  }
}
```

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| amount | number | Sim | Valor em centavos (ex: 10000 = R$ 100,00) |
| currency | string | Sim | Moeda (BRL, USD, EUR) |
| customer | object | Sim | Dados do cliente |
| payment_method | string | Sim | Método de pagamento |
| metadata | object | Não | Dados customizados |

### Process Withdrawal

Processar saque de fundos.

```bash
POST /functions/v1/process-withdrawal
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "amount": 50000,
  "bank_account": {
    "bank_code": "001",
    "account_number": "123456",
    "account_digit": "7",
    "type": "checking"
  },
  "document": "12345678900"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "withdrawal": {
    "id": "with_123456",
    "amount": 50000,
    "status": "processing",
    "estimated_date": "2025-11-07T10:30:00Z"
  }
}
```

### Send Email

Enviar email através do sistema.

```bash
POST /functions/v1/send-email
Authorization: Bearer {service_role_key}
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Confirmação de Pagamento",
  "template": "payment_confirmation",
  "variables": {
    "amount": "R$ 100,00",
    "transaction_id": "txn_123456"
  }
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message_id": "msg_123456"
}
```

### Setup 2FA

Configurar autenticação de dois fatores.

```bash
POST /functions/v1/setup-2fa
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "method": "totp"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA...",
  "backup_codes": ["XXXXXX", "XXXXXX", "XXXXXX"]
}
```

### Verify 2FA

Verificar código de dois fatores.

```bash
POST /functions/v1/verify-2fa
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "code": "123456"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "2FA ativado com sucesso"
}
```

### PagarMe Webhook

Receber webhooks de transações do PagarMe.

```bash
POST /functions/v1/pagarme-webhook
Content-Type: application/json
X-Signature: {webhook_signature}

{
  "id": "evt_123456",
  "type": "payment.confirmed",
  "data": {
    "id": "pay_123456",
    "status": "captured",
    "amount": 10000,
    "customer": {
      "id": "cust_123456",
      "email": "customer@example.com"
    }
  }
}
```

**Resposta de Sucesso (200):**
```json
{
  "received": true
}
```

---

## Banco de Dados

### Tabelas Principais

#### Users (auth.users)
Gerenciada automaticamente pelo Supabase Auth.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID único do usuário |
| email | string | Email do usuário |
| created_at | timestamp | Data de criação |
| last_sign_in_at | timestamp | Último login |

#### Company Profiles
Perfil da empresa/negócio do usuário.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID único |
| user_id | uuid | FK para users |
| company_name | string | Nome da empresa |
| cnpj | string | CNPJ (se PJ) |
| cpf | string | CPF (se PF) |
| status | enum | pending, approved, rejected |
| kyc_status | enum | not_started, in_progress, completed |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Última atualização |

#### Wallets
Carteiras digitais dos usuários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID único |
| user_id | uuid | FK para users |
| balance | decimal | Saldo em centavos |
| currency | string | Moeda (BRL) |
| created_at | timestamp | Data de criação |

#### Transactions
Histórico de transações.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID único |
| wallet_id | uuid | FK para wallets |
| amount | decimal | Valor em centavos |
| type | enum | deposit, withdrawal, payment, refund |
| status | enum | pending, completed, failed |
| metadata | jsonb | Dados adicionais |
| created_at | timestamp | Data de criação |

#### API Keys
Chaves de API para integrações.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID único |
| user_id | uuid | FK para users |
| key | string | Chave API criptografada |
| name | string | Nome da chave |
| last_used_at | timestamp | Último uso |
| created_at | timestamp | Data de criação |

#### Webhooks
Configurações de webhooks.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID único |
| user_id | uuid | FK para users |
| url | string | URL do webhook |
| events | array | Eventos a disparar |
| active | boolean | Ativado/desativado |
| created_at | timestamp | Data de criação |

#### Payment Links
Links de pagamento gerados pelos usuários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID único |
| user_id | uuid | FK para users |
| title | string | Título do link |
| description | string | Descrição |
| amount | decimal | Valor em centavos (0 = variável) |
| status | enum | active, inactive |
| created_at | timestamp | Data de criação |

#### Customers
Clientes cadastrados.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID único |
| user_id | uuid | FK para users |
| name | string | Nome do cliente |
| email | string | Email |
| phone | string | Telefone |
| created_at | timestamp | Data de criação |

#### Support Tickets
Tickets de suporte.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID único |
| user_id | uuid | FK para users |
| subject | string | Assunto |
| description | string | Descrição |
| status | enum | open, in_progress, closed |
| priority | enum | low, medium, high |
| created_at | timestamp | Data de criação |

### Row Level Security (RLS) Policies

Todas as tabelas têm RLS habilitado com as seguintes políticas:

**Usuários podem ver seus próprios dados:**
```sql
CREATE POLICY "Users can view own data"
  ON company_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

**Usuários podem inserir seus próprios dados:**
```sql
CREATE POLICY "Users can insert own data"
  ON company_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

**Usuários podem atualizar seus próprios dados:**
```sql
CREATE POLICY "Users can update own data"
  ON company_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Administradores podem ver todos os dados:**
```sql
CREATE POLICY "Admins can view all data"
  ON company_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
      AND admin_roles.role = 'super_admin'
    )
  );
```

---

## Integrações

### PagarMe Integration

PagarMe é o processador de pagamento principal.

#### Configuração

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const pagarmeConfig = {
  api_key: process.env.PAGARME_SECRET_KEY,
  api_endpoint: 'https://api.pagar.me/core/v5'
};
```

#### Criar Pagamento via PagarMe

```javascript
const response = await fetch('/functions/v1/create-payment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabase.auth.session().access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 10000,
    currency: 'BRL',
    customer: {
      name: 'João Silva',
      email: 'joao@example.com'
    },
    payment_method: 'credit_card'
  })
});

const payment = await response.json();
console.log('Payment created:', payment.id);
```

### Stripe Integration (Opcional)

Se usar Stripe no lugar de PagarMe:

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000,
  currency: 'brl',
  metadata: {
    goldspay_user_id: userId
  }
});
```

---

## Webhooks

### Configurar Webhook

```javascript
const { data, error } = await supabase
  .from('webhooks')
  .insert({
    user_id: userId,
    url: 'https://seu-servidor.com/webhooks/payments',
    events: ['payment.created', 'payment.confirmed', 'payment.failed'],
    active: true
  });
```

### Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| payment.created | Pagamento criado |
| payment.confirmed | Pagamento confirmado |
| payment.failed | Pagamento falhou |
| payment.refunded | Pagamento reembolsado |
| withdrawal.processing | Saque em processamento |
| withdrawal.completed | Saque completado |
| withdrawal.failed | Saque falhou |
| account.approved | Conta aprovada |
| account.rejected | Conta rejeitada |

### Payload do Webhook

```json
{
  "event": "payment.confirmed",
  "timestamp": "2025-11-05T10:30:00Z",
  "data": {
    "id": "pay_123456",
    "amount": 10000,
    "status": "captured",
    "customer": {
      "id": "cust_123456",
      "name": "João Silva",
      "email": "joao@example.com"
    },
    "metadata": {
      "order_id": "ORDER-12345"
    }
  }
}
```

### Validar Webhook

```javascript
const crypto = require('crypto');

function validateWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
}
```

---

## Tratamento de Erros

### Códigos de Erro Padrão

| Código | Descrição | Status HTTP |
|--------|-----------|------------|
| invalid_request | Requisição inválida | 400 |
| unauthorized | Não autorizado | 401 |
| forbidden | Acesso proibido | 403 |
| not_found | Recurso não encontrado | 404 |
| conflict | Conflito nos dados | 409 |
| rate_limit_exceeded | Limite de taxa excedido | 429 |
| internal_error | Erro interno do servidor | 500 |
| service_unavailable | Serviço indisponível | 503 |

### Formato de Erro

```json
{
  "success": false,
  "error": {
    "code": "invalid_amount",
    "message": "Valor de pagamento inválido",
    "details": {
      "field": "amount",
      "reason": "Valor deve ser maior que 0"
    }
  }
}
```

---

## Rate Limiting

### Limites Padrão

| Endpoint | Limite | Janela |
|----------|--------|---------|
| /auth/* | 10 requisições | 15 minutos |
| /functions/v1/create-payment | 100 requisições | 1 hora |
| /functions/v1/process-withdrawal | 50 requisições | 1 hora |
| Geral | 1000 requisições | 1 hora |

### Headers de Rate Limit

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699181400
```

---

## Exemplos de Uso

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

async function createPayment() {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      wallet_id: walletId,
      amount: 10000,
      type: 'payment',
      status: 'pending',
      metadata: { orderId: 'ORDER-123' }
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating payment:', error);
    return;
  }

  console.log('Payment created:', data);
}

async function fetchUserTransactions() {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('wallet_id', walletId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return transactions;
}

async function setupWebhook() {
  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      user_id: userId,
      url: 'https://seu-servidor.com/webhook',
      events: ['payment.confirmed'],
      active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating webhook:', error);
    return;
  }

  console.log('Webhook created:', data);
}
```

### cURL

```bash
curl -X POST https://seu-dominio.supabase.co/functions/v1/create-payment \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "BRL",
    "customer": {
      "name": "João Silva",
      "email": "joao@example.com"
    },
    "payment_method": "credit_card"
  }'
```

### Python

```python
import requests
import json

def create_payment(access_token, amount, customer):
    url = 'https://seu-dominio.supabase.co/functions/v1/create-payment'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    payload = {
        'amount': amount,
        'currency': 'BRL',
        'customer': customer,
        'payment_method': 'credit_card'
    }

    response = requests.post(url, headers=headers, json=payload)
    return response.json()

result = create_payment(
    access_token='YOUR_TOKEN',
    amount=10000,
    customer={'name': 'João', 'email': 'joao@example.com'}
)
print(result)
```

---

## Support

Para dúvidas e suporte:
- Email: api@goldspay.com
- Documentação: https://docs.goldspay.com
- Status: https://status.goldspay.com
