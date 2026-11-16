# Multimedia

Buxoro shahri va tumanlari uchun maishiy texnika internet-do'koni.
Интернет-магазин бытовой техники для Бухары и районов.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4, liquid glass design tokens in `src/app/globals.css`
- next-intl: `uz` (default) and `ru`, texts in `messages/`
- Light and dark themes (saved in the browser, follows the system by default)

## Structure

```
messages/                 translations (uz.json, ru.json)
src/app/[locale]/         pages and layout
src/components/layout/    header, footer, mobile tab bar, theme and language switchers
src/components/home/      home page sections
src/components/product/   product card and illustrations
src/components/ui/        shared UI helpers
src/data/                 sample categories and products
src/i18n/                 locale routing
src/lib/                  helpers (price formatting)
```

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Roadmap

1. Foundation and home page (done)
2. Catalogue, filters, search, product page
3. Cart, checkout, Click and Payme, customer account
4. Admin panel and Telegram Mini App, then the mobile app
