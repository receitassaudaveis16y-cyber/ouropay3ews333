# GoldsPay - Sistema de Gateway de Pagamento

Sistema completo de gateway de pagamento construído com **Laravel (Backend)** e **React + TypeScript (Frontend)**, integrado com **Supabase** para gerenciamento de dados e autenticação.

## Tecnologias Utilizadas

### Backend (Laravel)
- Laravel 12.0
- PHP 8.2+
- Guzzle HTTP Client
- Supabase PHP SDK

### Frontend (React)
- React 18.3
- TypeScript 5.5
- Vite 5.4
- TailwindCSS 3.4
- Supabase JS Client
- Lucide Icons

### Banco de Dados
- Supabase (PostgreSQL)
- Row Level Security (RLS) habilitado em todas as tabelas

## Estrutura do Projeto

```
/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── DashboardController.php
│   │   │   ├── CompanyController.php
│   │   │   └── AdminController.php
│   │   └── Middleware/
│   │       └── AdminMiddleware.php
│   └── Services/
│       └── SupabaseService.php
├── src/
│   ├── App.tsx                 (Componente principal React)
│   ├── Dashboard.tsx           (Dashboard do usuário)
│   ├── Admin.tsx               (Painel administrativo)
│   ├── Company.tsx             (Perfil da empresa)
│   ├── Wallet.tsx              (Carteira digital)
│   ├── Sales.tsx               (Vendas)
│   ├── Customers.tsx           (Clientes)
│   ├── Checkout.tsx            (Checkout)
│   ├── PaymentLink.tsx         (Links de pagamento)
│   ├── Disputes.tsx            (Disputas)
│   ├── Fees.tsx                (Taxas)
│   ├── Integrations.tsx        (Integrações API)
│   ├── Webhooks.tsx            (Webhooks)
│   ├── Settings.tsx            (Configurações)
│   └── Help.tsx                (Ajuda)
├── routes/
│   └── web.php                 (Rotas Laravel)
├── resources/
│   └── views/
│       └── welcome.blade.php   (View principal que carrega React)
└── supabase/
    └── migrations/             (Migrações do banco de dados)
```

## Instalação e Configuração

### 1. Requisitos

- PHP 8.2 ou superior
- Composer
- Node.js 18+ e NPM
- Conta Supabase

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` ou use o `.env` já existente e configure:

```env
APP_NAME=GoldsPay
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=goldspay
DB_USERNAME=postgres
DB_PASSWORD=

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon

VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### 3. Instalar Dependências

```bash
# Instalar dependências PHP
composer install

# Instalar dependências JavaScript
npm install
```

### 4. Configurar Banco de Dados

As migrações do Supabase já foram aplicadas. Todas as tabelas necessárias estão criadas:

- `admin_roles` - Funções administrativas
- `company_profiles` - Perfis de empresas
- `wallets` - Carteiras digitais
- `transactions` - Transações
- `customers` - Clientes
- `api_keys` - Chaves API
- `webhooks` - Configurações de webhook
- `platform_settings` - Configurações da plataforma
- `activity_logs` - Logs de atividade
- `fraud_detection_rules` - Regras antifraude
- `payment_splits` - Split de pagamentos
- `notification_templates` - Templates de notificação
- `compliance_documents` - Documentos de compliance
- `rate_limits` - Controle de taxa
- `reconciliation_reports` - Relatórios de conciliação
- `payout_batches` - Lotes de pagamento
- `settlement_schedule` - Agenda de liquidação

### 5. Build do Frontend

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
```

### 6. Iniciar o Servidor

```bash
php artisan serve
```

O sistema estará disponível em `http://localhost:8000`

## Arquitetura do Sistema

### Backend (Laravel)

O backend Laravel atua como uma API REST que se comunica com o Supabase:

#### Controllers

- **DashboardController**: Gerencia estatísticas e dados do dashboard
- **CompanyController**: Gerencia perfis de empresas (CRUD)
- **AdminController**: Funcionalidades administrativas (aprovação de contas, estatísticas globais)

#### Services

- **SupabaseService**: Camada de abstração para todas as operações do Supabase
  - Autenticação (signUp, signIn, signOut)
  - Gerenciamento de perfis de empresa
  - Gerenciamento de carteiras
  - Gerenciamento de transações
  - Funções administrativas
  - Estatísticas e relatórios

#### Middleware

- **AdminMiddleware**: Verifica se o usuário tem permissões de administrador

### Frontend (React)

O frontend React consome a API Laravel e interage diretamente com o Supabase para auth:

- **Autenticação**: Integração direta com Supabase Auth
- **Estado Global**: Gerenciado via hooks React
- **Roteamento**: Baseado em estados (SPA)
- **UI/UX**: TailwindCSS para estilização moderna e responsiva

## Rotas da API

### Públicas
- `GET /` - Página inicial

### Autenticadas
- `GET /dashboard` - Dashboard do usuário
- `GET /api/dashboard/transactions` - Lista transações do usuário
- `GET /api/dashboard/wallet` - Dados da carteira do usuário
- `GET /api/company/profile` - Perfil da empresa
- `POST /api/company/profile` - Criar perfil da empresa
- `PATCH /api/company/profile` - Atualizar perfil da empresa

### Admin (Requer permissão de administrador)
- `GET /admin` - Painel administrativo
- `GET /api/admin/profiles/pending` - Perfis pendentes de aprovação
- `PATCH /api/admin/profiles/{id}/approve` - Aprovar perfil
- `PATCH /api/admin/profiles/{id}/reject` - Rejeitar perfil
- `GET /api/admin/transactions` - Todas as transações
- `GET /api/admin/statistics` - Estatísticas globais

## Funcionalidades

### Para Usuários
- Criação e gerenciamento de conta
- Cadastro de empresa (Pessoa Física ou Jurídica)
- Dashboard com estatísticas
- Gerenciamento de carteira digital
- Visualização de transações
- Gerenciamento de clientes
- Links de pagamento
- Integrações via API
- Webhooks
- Disputas

### Para Administradores
- Aprovação/rejeição de contas
- Visualização de todas as transações
- Estatísticas globais
- Gerenciamento de usuários
- Configurações da plataforma

## Segurança

### Row Level Security (RLS)

Todas as tabelas do Supabase têm RLS habilitado com políticas específicas:

- Usuários só podem ver e editar seus próprios dados
- Administradores têm acesso a todos os dados
- Políticas de INSERT, UPDATE, DELETE são restritivas
- Validação de autenticação em todas as operações

### Middleware

- Verificação de autenticação em rotas protegidas
- Verificação de permissões de admin
- Validação de dados de entrada

## Desenvolvimento

### Comandos Úteis

```bash
# Desenvolvimento Frontend
npm run dev

# Build Frontend
npm run build

# Typecheck
npm run typecheck

# Lint
npm run lint

# Servidor Laravel
php artisan serve
```

## Próximos Passos

1. Implementar processamento de pagamentos (Stripe/PagarMe)
2. Adicionar testes automatizados
3. Implementar sistema de notificações por email
4. Adicionar relatórios financeiros avançados
5. Implementar sistema de KYC completo

## Suporte

Para dúvidas e suporte:
- Email: suporte@goldspay.com
- Documentação: /docs

## Licença

Proprietário - GoldsPay © 2025
