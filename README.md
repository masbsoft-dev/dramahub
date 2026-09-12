# Dramahub

Plataforma SVOD de doramas (K/C/J/T-Drama), implementada em Next.js 16 (App Router) na
Vercel, seguindo a "Especificação Técnica de Arquitetura Enterprise" e o design em
`docs/design-reference/Dramahub.dc.html`.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + Tailwind CSS v4
- **Postgres** (Neon, via Vercel Marketplace) + **Prisma ORM**
- **Redis** (Upstash, via Vercel Marketplace) — heartbeat de telas simultâneas e rate limiting
- **Stripe** (via Vercel Marketplace) — assinatura recorrente com PIX e cartão
- Auth própria (bcrypt + JWT em cookie httpOnly), sem múltiplos perfis por conta

## Setup

### 1. Provisionar os serviços externos

```bash
vercel link
vercel integration add neon
vercel integration add upstash/upstash-kv
vercel integration add stripe
vercel env pull .env.local
```

Cada `integration add` pode pedir para aceitar os termos do marketplace no navegador antes de
concluir — abra o `verification_uri` retornado, aceite, e rode o comando de novo.

### 2. Gerar secrets locais

Preencha no `.env.local` (veja `.env.example`):

```bash
JWT_SECRET=$(openssl rand -hex 32)
STREAM_HMAC_SECRET=$(openssl rand -hex 32)
INGEST_API_KEY=$(openssl rand -hex 24)
```

### 3. Banco de dados

```bash
npm run db:migrate   # cria as tabelas a partir de prisma/schema.prisma
npm run db:seed       # popula generos + 10 doramas ficticios (sem scraper real)
```

### 4. Stripe (produto + preços)

```bash
npm run stripe:setup  # cria (ou reaproveita) o produto e os precos recorrentes,
                       # e grava STRIPE_PRICE_BASE / STRIPE_PRICE_EXTRA_SCREEN no .env.local
```

Configure também um webhook do Stripe apontando para `/api/billing/webhook` (eventos
`invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`,
`customer.subscription.deleted`) e coloque o signing secret em `STRIPE_WEBHOOK_SECRET`.

### 5. Rodar

```bash
npm run dev
```

## Estrutura

- `app/` — páginas (App Router) e rotas de API (`app/api/**/route.ts`)
- `lib/` — auth, Prisma, Redis, Stripe, validação (zod), i18n, proxy de mídia, tokens HMAC
- `prisma/schema.prisma` — modelo de dados (fiel à seção 5 da especificação)
- `prisma/seed.ts` — catálogo semente (10 doramas fictícios, mesmos títulos do protótipo)
- `proxy.ts` — equivalente ao Kong Gateway simplificado: auth gate + rate limiting nas rotas
  sensíveis (login, signup, heartbeat, ingest)
- `docs/design-reference/` — cópia do protótipo original do Claude Design (referência visual,
  não faz parte do app)

## Decisões de escopo

A especificação original descreve infraestrutura enterprise dedicada (Kafka, RabbitMQ, Kong
Gateway, Cloudflare WAF) que não faz sentido provisionar para este projeto Next.js/Vercel. A
lógica equivalente foi implementada nativamente:

- **Rate limiting / gateway**: `proxy.ts` + Redis (sliding window), em vez de Kong.
- **Mensageria**: escritas diretas no Postgres dentro de transações Prisma, em vez de
  Kafka/RabbitMQ.
- **Ingestão de VOD**: só a API `/api/ingest` (contrato JSON da seção 3 da especificação) e o
  proxy de mídia reverso (`/api/stream/[episodeId]/...`) foram implementados. Não há um
  scraper real — o catálogo é populado via `prisma/seed.ts`.
- **Pagamento**: Stripe real (assinatura recorrente com PIX e cartão via Payment Element),
  em vez de um PIX simulado.

## Segurança

- Senhas com bcrypt (cost 12); nunca logadas ou retornadas pela API.
- Sessão via JWT assinado (HS256) em cookie `httpOnly`, `Secure` (produção), `SameSite=Lax`.
- Toda entrada de API validada com zod (`lib/validation.ts`).
- CPF validado por checksum (módulo 11) no client e no servidor.
- Device fingerprinting (Canvas/WebGL + UA) com limite de 5 dispositivos por conta.
- Bloqueio de telas simultâneas via Redis heartbeat (TTL 15s), replicando a função de
  referência da especificação.
- URLs do proxy de streaming assinadas com HMAC (`lib/stream-token.ts`), de curta duração.
- Os headers de origem dos manifestos (`Episode.headersJson`) nunca são expostos ao cliente —
  só o servidor os injeta ao buscar o conteúdo upstream.
- `/api/ingest` protegida por API key estática fora do payload (header `X-Ingest-Key`).
