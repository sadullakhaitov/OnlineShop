# Multimedia

Buxoro shahri va tumanlari uchun maishiy texnika internet-do'koni.
Интернет-магазин бытовой техники для Бухары и районов.

## Stack

- Next.js (App Router) + TypeScript, React 19
- Tailwind CSS v4; design tokens and the liquid glass system live in `src/app/globals.css`
- next-intl: `uz` (default) and `ru`, texts in `messages/`
- Light and dark themes (saved in the browser, follow the system by default)

The same web app is meant to run as the Telegram Mini App, and the future
mobile app will talk to the same data layer.

## Pages

| Address | What it is |
| --- | --- |
| `/uz`, `/ru` | Home page |
| `/uz/catalog` | Catalogue: categories, brand and price filters, sorting, search (`?q=`) |
| `/uz/product/[slug]` | Product page: price, specifications, similar products |
| `/uz/favorites` | Favourites, kept in the visitor's browser |
| `/api/search` | Live search suggestions for the header search |

## Structure

```
messages/                 translations (uz.json, ru.json)
src/app/[locale]/         pages and layout
src/app/api/search/       search suggestions endpoint
src/components/layout/    header, footer, mobile tab bar, theme and language switchers
src/components/home/      home page sections
src/components/catalog/   filters, sorting and the mobile filter sheet
src/components/product/   product card and illustrations
src/components/search/    header search dialog
src/components/favorites/ favourite button, counter and list
src/components/ui/        shared pieces (breadcrumbs, scroll reveal)
src/data/                 sample categories and products
src/i18n/                 locale routing
src/lib/                  catalogue queries, favourites, theme, formatting, motion helpers
```

## Data

Products are sample data in `src/data/products.ts`, with drawn illustrations
instead of photos. Pages never read that file directly: they go through
`src/lib/catalog.ts`, so moving to a database only means rewriting that one file.

## Design rules worth knowing

- **Glass and fades.** A `backdrop-filter` stops seeing the page behind it
  while any ancestor is semi-transparent, which makes glass visibly snap when
  a fade ends. Fades are therefore applied to the glass element itself: use the
  `enter` class (on page open) or `<Reveal as="…">` (on scroll), never an
  opacity wrapper around glass.
- **Layers.** Custom classes in `globals.css` sit in `@layer base` and
  `@layer components`, so Tailwind utilities in markup always win.
- **Shared picture.** A product picture has the same view-transition name on
  its card and on its page (`productArtName`), which makes it glide between
  the two. A product must not appear twice on one page with that name.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## Roadmap

1. Foundation and home page (done)
2. Catalogue, filters, search, product page, favourites (done)
3. Cart, checkout, Click and Payme, customer account
4. Admin panel and Telegram Mini App, then the mobile app

Still placeholders: cart and sign-in buttons, shop contacts in the footer,
and the information pages listed in the footer without links.
