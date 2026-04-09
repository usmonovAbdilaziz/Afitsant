# EasyBooking

Service booking platform - clients & businesses.

**Stack:** Express + TypeScript + PostgreSQL + Prisma

## Quick Start

```bash
bun install
cp .env.example .env
bun run prisma:generate
bun run prisma db push
bun run start:dev
```

## Commands

```bash
bun run start:dev           # dev server
bun run build               # compile
bun run start               # production

bun run prisma:generate     # generate client
bun run prisma:db:push      # sync schema
bun run prisma:studio       # db GUI
bun run prisma:seed         # seed data
```

## Deploy

```bash
bun install --production
bun run prisma:generate
bun run build
NODE_ENV=production bun run start
```

## Telegram Verify Flow

- Client joins Socket.io room with `join` or `joinRoom` using `tableId`
- Client emits `order:start` with `{ tableId }`
- Server creates `OrderSession` and returns `{ orderSessionId, telegramLink }`
- Telegram `/start` payload uses `tableId.orderSessionId`
- After contact share, server emits `auth:token` to `table:${tableId}`

### Socket Events

- `client -> server`: `join` `{ tableId }`
- `client -> server`: `order:start` `{ tableId }`
- `server -> room(tableId)`: `auth:token` `{ token, user, tableId, orderSessionId }`

## Telegram Webhook

- Webhook endpoint: `POST /api/telegram/webhook`
- If `TELEGRAM_WEBHOOK_SECRET` is set, request header `x-telegram-bot-api-secret-token` must match

## Staff login (email/password)

- Create staff account (requires BUSINESS/ADMIN token): `POST /auth/register/staff` with `{ email, password, fullName, phoneNumber, businessId, position? }`. This creates/updates a Staff row and a User of type `STAFF`.
- Login via existing `/auth/login` (email+password). Response now includes `user.type` and `user.businessId`.
- Staff JWTs include `staffId` + `businessId` and can call `/api/v1/staff/me`. Frontend redirects STAFF users to `/staff/staff-dashboard`.

client da {
businessni tanlaganda url:url/staff/business/id staffda shunday pagega sakrasin
clientga etiroz berish imkoniyati bulsin profilidan
businessda etiroz yuborishi mumkin
etirozlar business/client id nomi emaili bilan
clientda search va button fileter xam qilsin type buyicha
home dashboard
stafflarni abet vaqtida booking qilish imkoniyati bulmasiligi kerak

}
